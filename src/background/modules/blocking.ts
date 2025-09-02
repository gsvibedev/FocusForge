/* eslint-disable no-console */
import { LimitsStore } from '../../storage/limitsStore';
import { RulesEngine } from '../../storage/rulesEngine';
import { getDomainFromUrl, normalizeDomain } from '../../utils/time';

const DNR_RULE_ID_BASE = 10_000;

async function rebuildDynamicRules(): Promise<void> {
	console.log('[FocusForge] Starting rule rebuild...');
	const basicDomains = await LimitsStore.getDomainsToBlock();
	const scheduledBlocks = await getScheduledBlockedDomains();
	const domains = [...new Set([...basicDomains, ...scheduledBlocks])];
	console.log('[FocusForge] Basic domains from limits:', basicDomains);
	console.log('[FocusForge] Scheduled domains:', scheduledBlocks);
	console.log('[FocusForge] Combined domains to block:', domains);
	const addRules: chrome.declarativeNetRequest.Rule[] = [];
	let counter = 0;
	for (const domain of domains) {
		// Create multiple rules to catch all URL variations
		const baseDomain = normalizeDomain(domain);
		
		// Get extension URL for redirect
		const extensionUrl = chrome.runtime.getURL('src/blocked/index.html');
		
		// Special handling for problematic domains like x.com
		if (baseDomain === 'x.com' || baseDomain === 'twitter.com') {
			// X.com/Twitter specific robust regex matching for SPA and redirects
			const regexes = [
				'^https?://([a-z0-9-]+\\.)?x\\.com/.*',
				'^https?://([a-z0-9-]+\\.)?twitter\\.com/.*',
				'^https?://([a-z0-9-]+\\.)?t\\.co/.*'
			];
			for (const regexFilter of regexes) {
				const ruleId = DNR_RULE_ID_BASE + counter;
				addRules.push({
					id: ruleId,
					priority: 2,
					action: { type: 'redirect', redirect: { url: extensionUrl } },
					condition: { regexFilter, resourceTypes: ['main_frame'] }
				});
				counter += 1;
			}
		} else {
			// Standard patterns for other domains
			const patterns = [
				`*://${baseDomain}/*`,
				`*://www.${baseDomain}/*`,
				`*://*.${baseDomain}/*`,
				`||${baseDomain}^` // EasyList format for better blocking
			];
			
			for (const pattern of patterns) {
				const ruleId = DNR_RULE_ID_BASE + counter;
				addRules.push({
					id: ruleId,
					priority: 1,
					action: { type: 'redirect', redirect: { url: extensionUrl } },
					condition: { urlFilter: pattern, resourceTypes: ['main_frame', 'sub_frame'] }
				});
				counter += 1;
			}
		}
	}

	const existing = await chrome.declarativeNetRequest.getDynamicRules();
	const removeRuleIds = existing.map((r) => r.id);
	
	console.log('[FocusForge] Adding rules:', addRules.map(r => ({ id: r.id, url: r.condition.urlFilter })));
	console.log('[FocusForge] Removing rule IDs:', removeRuleIds);
	
	await chrome.declarativeNetRequest.updateDynamicRules({ addRules, removeRuleIds });
	console.log(`[FocusForge] Rebuilt DNR rules: ${addRules.length} blocking rules active`);
}

// Enforce immediate redirect on the currently active tab if its domain is now blocked
async function enforceImmediateBlockOnActiveTab(): Promise<void> {
    try {
        // Skip if snooze is active
        const snoozeData = await chrome.storage.local.get(['blockSnoozeUntil']);
        const snoozeUntil = snoozeData.blockSnoozeUntil || 0;
        if (Date.now() < snoozeUntil) {
            console.log(`[FocusForge] Immediate block enforcement skipped - snooze active until ${new Date(snoozeUntil)}`);
            return;
        }
        
        const prefs = await chrome.storage.local.get(['immediateBlockingEnabled']);
        const immediate = prefs.immediateBlockingEnabled !== false; // default true
        if (!immediate) return;

        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            const tab = tabs?.[0];
            try {
                if (!tab || !tab.id || !tab.url) return;
                const domain = getDomainFromUrl(tab.url);
                if (!domain) return;
                const basicBlock = await LimitsStore.isDomainCurrentlyBlocked(domain);
                if (!basicBlock) return;
                const base = chrome.runtime.getURL('src/blocked/index.html');
                const redirectUrl = `${base}?from=${encodeURIComponent(tab.url)}`;
                
                // Store the blocked domain for fallback redirect purposes
                await chrome.storage.local.set({ lastBlockedDomain: domain });
                
                await chrome.tabs.update(tab.id, { url: redirectUrl });
                console.log('[FocusForge] Enforced immediate block on active tab due to limit');
            } catch (e) {
                console.warn('[FocusForge] Immediate block enforcement error', e);
            }
        });
    } catch (e) {
        console.warn('[FocusForge] Error preparing immediate block enforcement', e);
    }
}

export function initializeBlockRulesEngine(): void {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes['limits'] || changes['usageTick'] || changes['forceRuleRebuild'] || changes['advancedRules'] || changes['rulesRebuildTrigger'])) {
            console.log('[FocusForge] Storage change detected, rebuilding rules:', Object.keys(changes));
            // Add a longer delay when snooze is involved to prevent race conditions
            const delayMs = (changes['blockSnoozeUntil'] || changes['globalSnooze']) ? 500 : 100;
            setTimeout(() => {
                void rebuildDynamicRules();
                // Don't enforce immediate redirect if we just set a snooze
                if (!changes['blockSnoozeUntil'] && !changes['globalSnooze']) {
                    void enforceImmediateBlockOnActiveTab();
                }
            }, delayMs);
        }
    });

	chrome.runtime.onStartup.addListener(() => {
		void rebuildDynamicRules();
	});

	// Secondary enforcement: catch SPA navigations (e.g., x.com) and force redirect
	const handleNavigate = async (details: any): Promise<void> => {
		if (details.frameId !== 0) return; // main frame only
		try {
			// First check if snooze is active - if so, skip all navigation blocking
			// Add extra buffer time to prevent race conditions
			const snoozeData = await chrome.storage.local.get(['blockSnoozeUntil']);
			const snoozeUntil = snoozeData.blockSnoozeUntil || 0;
			const bufferTime = 2000; // 2 second buffer to prevent race conditions
			if (Date.now() < (snoozeUntil + bufferTime)) {
				console.log(`[FocusForge] Navigation check skipped - snooze active until ${new Date(snoozeUntil)} (with buffer)`);
				return;
			}
			
			const url = details.url ?? '';
			const domain = getDomainFromUrl(url);
			if (!domain) return;
			const basicBlock = await LimitsStore.isDomainCurrentlyBlocked(domain);
			const scheduledOrPattern = await RulesEngine.shouldBlockUrl(url);
			console.log(`[FocusForge] Navigation check for ${domain}: basicBlock=${basicBlock}, scheduledBlock=${scheduledOrPattern.blocked}`);
			if (!basicBlock && !scheduledOrPattern.blocked) return;
			const base = chrome.runtime.getURL('src/blocked/index.html');
            const redirectUrl = `${base}?from=${encodeURIComponent(url)}`;
            
            // Store the blocked domain for fallback redirect purposes
            await chrome.storage.local.set({ lastBlockedDomain: domain });
            
            await chrome.tabs.update(details.tabId, { url: redirectUrl });
            console.log('[FocusForge] webNavigation enforced redirect for', domain);
		} catch (e) {
			console.warn('[FocusForge] webNavigation enforcement error', e);
		}
	};
	if (chrome.webNavigation) {
		if (chrome.webNavigation.onCommitted) chrome.webNavigation.onCommitted.addListener(handleNavigate);
		if ((chrome.webNavigation as any).onHistoryStateUpdated) (chrome.webNavigation as any).onHistoryStateUpdated.addListener(handleNavigate);
	}

	// Optional: enable getMatchedRules for debugging when permission present
	if ((chrome.declarativeNetRequest as any).onRuleMatchedDebug) {
		try {
			(chrome.declarativeNetRequest as any).onRuleMatchedDebug.addListener((info: any) => {
				console.log('[FocusForge] Rule matched:', info);
			});
		} catch (e) {
			console.warn('[FocusForge] Could not enable rule matching debug:', e);
		}
	}

	// Initial rule build
	void rebuildDynamicRules();
    // And enforce immediate redirect if the active tab is already over limit
    void enforceImmediateBlockOnActiveTab();
}

export async function isUrlBlocked(url: string): Promise<boolean> {
	const domain = getDomainFromUrl(url);
	const basicBlock = await LimitsStore.isDomainCurrentlyBlocked(domain);
	if (basicBlock) return true;
	
	const scheduledBlock = await RulesEngine.shouldBlockDomain(domain);
	return scheduledBlock.blocked;
}

async function getScheduledBlockedDomains(): Promise<string[]> {
	const rules = await RulesEngine.getRules();
	const now = new Date();
	const blockedDomains: string[] = [];
	
	for (const rule of rules) {
		if (!rule.enabled) continue;
		if (!RulesEngine.isDayActive(rule.schedule.days, now)) continue;
		if (!RulesEngine.isTimeInRange(rule.schedule.startTime, rule.schedule.endTime, now)) continue;
		
		for (const target of rule.targets) {
			if (target.action === 'block' && target.type === 'domain') {
				blockedDomains.push(target.value);
			}
		}
	}
	
	return blockedDomains;
}


