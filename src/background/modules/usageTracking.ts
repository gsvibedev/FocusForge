/* eslint-disable no-console */
import { UsageStore } from '../../storage/usageStore';
import { LimitsStore } from '../../storage/limitsStore';
import { getDomainFromUrl, nowUtcIso, secondsBetween, normalizeDomain } from '../../utils/time';
import { suggestCategory } from '../../ai/classifier';
import { refreshCategoryFavicon } from '../../utils/categoryFavicon';

let currentActiveTabId: number | null = null;
let currentActiveDomain: string | null = null;
let lastActiveTimestamp: number | null = null;
let isWindowFocused = true;

// Performance optimization: batch domain classifications
let classificationQueue = new Set<string>();
let classificationTimer: NodeJS.Timeout | null = null;

// Performance optimization: debounce usage commits
let usageCommitTimer: NodeJS.Timeout | null = null;
const USAGE_COMMIT_DEBOUNCE = 500; // 500ms for better real-time accuracy
const CLASSIFICATION_BATCH_DELAY = 5000; // 5 seconds

// Track which domains have been warned to avoid spam
let warningsSent = new Set<string>();

// Function to check all active domains for immediate notifications (called when limits are added)
export async function checkAllDomainsForImmediateNotifications(): Promise<void> {
	try {
		// Get the currently active domain if any
		if (currentActiveDomain) {
			await checkLimitAndNotify(currentActiveDomain);
		}
		
		// Also check any recently active domains that might still be relevant
		// This helps catch cases where a user adds a limit for a domain they just visited
		const limits = await LimitsStore.getAllLimits();
		const domainsToCheck = new Set<string>();
		
		// Add domains from all site limits
		for (const limit of limits) {
			if (limit.targetType === 'site') {
				domainsToCheck.add(limit.targetId);
			}
		}
		
		// Check each domain for immediate notifications
		for (const domain of domainsToCheck) {
			if (domain !== currentActiveDomain) {
				await checkLimitAndNotify(domain);
			}
		}
	} catch (error) {
		console.warn('[UsageTracking] Error checking all domains for immediate notifications:', error);
	}
}

// Function to send reminder notifications and check if domain should be blocked
async function checkLimitAndNotify(domain: string): Promise<void> {
	try {
		// Early return if snooze is active with buffer time
		const snoozeData = await chrome.storage.local.get(['blockSnoozeUntil']);
		const snoozeUntil = snoozeData.blockSnoozeUntil || 0;
		const bufferTime = 2000; // 2 second buffer to prevent race conditions
		if (Date.now() < (snoozeUntil + bufferTime)) {
			console.log(`[UsageTracking] checkLimitAndNotify skipped for ${domain} - snooze active until ${new Date(snoozeUntil)} (with buffer)`);
			return;
		}
		
		// Get all limits for this domain
		const limits = await LimitsStore.getAllLimits();
		const domainCategory = await getCategoryForDomain(domain);
		const base = normalizeDomain(domain);
		const domainLimits = limits.filter((l) => {
			if (l.targetType === 'site') {
				const targetBase = normalizeDomain(l.targetId);
				return base === targetBase || base.endsWith(`.${targetBase}`);
			}
			if (l.targetType === 'category') return l.targetId === domainCategory;
			return false;
		});
		
		if (domainLimits.length === 0) return;
		
		for (const limit of domainLimits) {
			const usage = await LimitsStore.getUsageSecondsForTarget(limit.targetType, limit.targetId, limit.timeframe);
			const limitSeconds = limit.limitMinutes * 60;
			const remainingSeconds = limitSeconds - usage;
			
			// Check for reminder notifications with dynamic time-based warnings
			const warningKey1 = `${domain}-1min-${limit.id}`;
			const warningKeyGeneral = `${domain}-general-${limit.id}`;
			
			if (remainingSeconds <= 60 && remainingSeconds > 0 && !warningsSent.has(warningKey1)) {
				// 1 minute warning
				await chrome.notifications.create(`limit-warning-1min-${domain}`, {
					type: 'basic',
					iconUrl: 'icons/icon-48.png',
					title: 'FocusForge - Limit Almost Reached',
					message: `Only 1 minute left on ${domain}! Time to wrap up.`
				});
				warningsSent.add(warningKey1);
				console.log(`[UsageTracking] Sent 1-minute warning for ${domain}`);
			} else if (remainingSeconds <= 600 && remainingSeconds > 60 && !warningsSent.has(warningKeyGeneral)) {
				// Dynamic warning based on remaining time (for times <= 10 minutes)
				const remainingMinutes = Math.ceil(remainingSeconds / 60);
				let timeMessage: string;
				
				if (remainingMinutes <= 2) {
					timeMessage = `${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} left`;
				} else if (remainingMinutes <= 5) {
					timeMessage = `${remainingMinutes} minutes left`;
				} else {
					timeMessage = `${remainingMinutes} minutes left`;
				}
				
				await chrome.notifications.create(`limit-warning-${remainingMinutes}min-${domain}`, {
					type: 'basic',
					iconUrl: 'icons/icon-48.png',
					title: 'FocusForge - Limit Approaching',
					message: `${timeMessage} on ${domain}. Consider wrapping up soon.`
				});
				warningsSent.add(warningKeyGeneral);
				console.log(`[UsageTracking] Sent ${remainingMinutes}-minute warning for ${domain}`);
			}
		}
		
		// Check if should be blocked immediately (if preference is enabled)
		const isBlocked = await LimitsStore.isDomainCurrentlyBlocked(domain);
		if (isBlocked) {
			console.log(`[UsageTracking] Limit reached for ${domain}`);
			
			// Clear warnings for this domain since it's now blocked
			warningsSent.forEach(key => {
				if (key.startsWith(domain)) {
					warningsSent.delete(key);
				}
			});
			
			// Check if immediate blocking is enabled
			const prefs = await chrome.storage.local.get(['immediateBlockingEnabled']);
			const immediateBlockingEnabled = prefs.immediateBlockingEnabled !== false; // Default to true
			
			if (immediateBlockingEnabled && currentActiveTabId) {
				console.log(`[UsageTracking] Immediate blocking enabled, redirecting active tab`);
				try {
					const tab = await chrome.tabs.get(currentActiveTabId);
					if (tab && tab.url) {
						const tabDomain = getDomainFromUrl(tab.url);
						if (tabDomain === domain) {
							const base = chrome.runtime.getURL('blocked/index.html');
							const blockedUrl = `${base}?from=${encodeURIComponent(tab.url)}`;
							
							// Store the blocked domain for fallback redirect purposes
							await chrome.storage.local.set({ lastBlockedDomain: domain });
							
							await chrome.tabs.update(currentActiveTabId, { url: blockedUrl });
							console.log(`[UsageTracking] Immediately redirected tab ${currentActiveTabId} to blocked page`);
						}
					}
				} catch (tabError) {
					console.warn(`[UsageTracking] Could not redirect tab ${currentActiveTabId}:`, tabError);
				}
			} else {
				console.log(`[UsageTracking] Immediate blocking disabled, will block on next navigation`);
			}
		}
	} catch (error) {
		console.warn('[UsageTracking] Error checking limit and notifications:', error);
	}
}

// Helper function to get category for domain
async function getCategoryForDomain(domain: string): Promise<string> {
	try {
		const map = (await chrome.storage.local.get('domainCategories'))['domainCategories'] as Record<string, string> | undefined;
		return map?.[domain] || 'Other';
	} catch {
		return 'Other';
	}
}

// Fast check for immediate blocking without full usage commit
async function checkForImmediateBlocking(): Promise<void> {
	if (!currentActiveDomain || !lastActiveTimestamp) return;
	
	try {
		// First check if snooze is active - if so, skip all blocking
		// Add extra buffer time to prevent race conditions with snooze activation
		const snoozeData = await chrome.storage.local.get(['blockSnoozeUntil']);
		const snoozeUntil = snoozeData.blockSnoozeUntil || 0;
		const bufferTime = 3000; // 3 second buffer to prevent race conditions
		if (Date.now() < (snoozeUntil + bufferTime)) {
			console.log(`[UsageTracking] Fast check skipped - snooze active until ${new Date(snoozeUntil)} (with buffer)`);
			return;
		}
		
		// Check if immediate blocking is enabled
		const prefs = await chrome.storage.local.get(['immediateBlockingEnabled']);
		const immediateBlockingEnabled = prefs.immediateBlockingEnabled !== false; // Default to true
		
		console.log(`[UsageTracking] Fast check - immediate blocking enabled: ${immediateBlockingEnabled}, preference value: ${prefs.immediateBlockingEnabled}`);
		
		if (!immediateBlockingEnabled) {
			console.log(`[UsageTracking] Fast check skipped - immediate blocking disabled`);
			return;
		}
		
		// Calculate current session time
		const currentSessionSeconds = Math.round(secondsBetween(lastActiveTimestamp, Date.now()));
		
		// Get existing usage for today and add current session
		const limits = await LimitsStore.getAllLimits();
		const domainCategory = await getCategoryForDomain(currentActiveDomain);
		const base = normalizeDomain(currentActiveDomain);
		const domainLimits = limits.filter((l) => {
			if (l.targetType === 'site') {
				const targetBase = normalizeDomain(l.targetId);
				return base === targetBase || base.endsWith(`.${targetBase}`);
			}
			if (l.targetType === 'category') return l.targetId === domainCategory;
			return false;
		});
		
		for (const limit of domainLimits) {
			const existingUsage = await LimitsStore.getUsageSecondsForTarget(limit.targetType, limit.targetId, limit.timeframe);
			const totalUsage = existingUsage + currentSessionSeconds;
			const limitSeconds = limit.limitMinutes * 60;
			
			if (totalUsage >= limitSeconds) {
				console.log(`[UsageTracking] Fast check: ${currentActiveDomain} would exceed limit (${totalUsage}s >= ${limitSeconds}s), blocking now`);
				
				// Commit the current session immediately then block
				if (usageCommitTimer) {
					clearTimeout(usageCommitTimer);
					usageCommitTimer = null;
				}
				
				const commitDate = new Date();
				await UsageStore.appendUsage(currentActiveDomain, currentSessionSeconds, commitDate);
				lastActiveTimestamp = Date.now(); // Reset timer
				
				// Block immediately
				if (currentActiveTabId) {
					try {
						const tab = await chrome.tabs.get(currentActiveTabId);
						if (tab && tab.url) {
							const tabDomain = getDomainFromUrl(tab.url);
							if (tabDomain === currentActiveDomain) {
								const base = chrome.runtime.getURL('blocked/index.html');
								const blockedUrl = `${base}?from=${encodeURIComponent(tab.url)}`;
								
								// Store the blocked domain for fallback redirect purposes
								await chrome.storage.local.set({ lastBlockedDomain: currentActiveDomain });
								
								await chrome.tabs.update(currentActiveTabId, { url: blockedUrl });
								console.log(`[UsageTracking] Fast check immediately redirected tab ${currentActiveTabId} to blocked page`);
								return; // Exit early since we blocked
							}
						}
					} catch (tabError) {
						console.warn(`[UsageTracking] Fast check could not redirect tab ${currentActiveTabId}:`, tabError);
					}
				}
			}
		}
	} catch (error) {
		console.warn('[UsageTracking] Error in fast blocking check:', error);
	}
}

async function classifyAndCache(domain: string | null): Promise<void> {
	if (!domain) return;
	try {
		const map = (await chrome.storage.local.get('domainCategories'))['domainCategories'] as Record<string, string> | undefined;
		if (map && map[domain]) return;
		
		// Add to batch queue for performance
		classificationQueue.add(domain);
		
		// Process queue after delay to batch classifications
		if (classificationTimer) clearTimeout(classificationTimer);
		classificationTimer = setTimeout(procesClassificationQueue, CLASSIFICATION_BATCH_DELAY);
	} catch {
		// ignore
	}
}

async function procesClassificationQueue(): Promise<void> {
	if (classificationQueue.size === 0) return;
	
	const domains = Array.from(classificationQueue);
	classificationQueue.clear();
	
	try {
		const map = (await chrome.storage.local.get('domainCategories'))['domainCategories'] as Record<string, string> | undefined;
		const currentMap = map ?? {};
		
		// Process all domains in batch
		for (const domain of domains) {
			if (currentMap[domain]) continue; // Skip if already classified
			
			try {
				// eslint-disable-next-line no-await-in-loop
				const category = await suggestCategory(domain);
				currentMap[domain] = category;
			} catch {
				// Fallback for failed classifications
				currentMap[domain] = 'Other';
			}
		}
		
		// Single storage write for all classifications
		await chrome.storage.local.set({ domainCategories: currentMap });
		console.log(`[FocusForge] Classified ${domains.length} domains`);
		
		// Refresh category favicons for affected categories
		const affectedCategories = new Set(Object.values(currentMap));
		for (const category of affectedCategories) {
			try {
				// Don't await these to avoid blocking - just fire and forget
				refreshCategoryFavicon(category).catch(err => 
					console.debug(`[FocusForge] Failed to refresh favicon for category ${category}:`, err)
				);
			} catch (error) {
				console.debug(`[FocusForge] Error refreshing category favicon for ${category}:`, error);
			}
		}
	} catch (error) {
		console.error('[FocusForge] Error in batch classification:', error);
	}
}

function commitElapsedTime(): void {
	if (!currentActiveDomain || currentActiveDomain.trim() === '' || lastActiveTimestamp === null) {
		console.log(`[FocusForge] Skipping commit - domain: '${currentActiveDomain}', lastActiveTimestamp: ${lastActiveTimestamp}`);
		return;
	}
	
	const now = Date.now();
	const elapsedMs = now - lastActiveTimestamp;
	const seconds = Math.max(0, Math.round(elapsedMs / 1000));
	
	// Allow any usage time - users can keep tabs open as long as they want
	// Only reject clearly invalid negative times
	if (elapsedMs < 0) {
		console.warn(`[FocusForge] Invalid negative elapsed time: ${Math.round(elapsedMs/1000)}s for ${currentActiveDomain} - ignoring`);
		lastActiveTimestamp = now; // Reset timestamp
		return;
	}
	
	console.log(`[FocusForge] Elapsed time calculation: ${elapsedMs}ms (${seconds}s) for ${currentActiveDomain}`);
	
	if (seconds > 0) {
		// Debounce frequent commits for performance
		if (usageCommitTimer) clearTimeout(usageCommitTimer);
		usageCommitTimer = setTimeout(async () => {
			const commitDate = new Date();
			const domainToCommit = currentActiveDomain!;
			console.log(`[UsageTracking] Committing ${seconds}s for ${domainToCommit} on date ${commitDate.toISOString().split('T')[0]}`);
			await UsageStore.appendUsage(domainToCommit, seconds, commitDate);
			
			// Check if limit is reached and send notifications/block immediately
			await checkLimitAndNotify(domainToCommit);
		}, USAGE_COMMIT_DEBOUNCE);
	}
	lastActiveTimestamp = Date.now();
}

// Export function for immediate commit (used by popup for real-time data)
export async function commitPendingUsage(): Promise<void> {
	if (!currentActiveDomain || currentActiveDomain.trim() === '' || lastActiveTimestamp === null) return;
	
	// Cancel any pending debounced commit
	if (usageCommitTimer) {
		clearTimeout(usageCommitTimer);
		usageCommitTimer = null;
	}
	
	const seconds = Math.max(0, Math.round(secondsBetween(lastActiveTimestamp, Date.now())));
	if (seconds > 0) {
		// Immediate commit without debouncing
		const commitDate = new Date();
		const domainToCommit = currentActiveDomain;
		console.log(`[UsageTracking] Force committing ${seconds}s for ${domainToCommit} on date ${commitDate.toISOString().split('T')[0]}`);
		await UsageStore.appendUsage(domainToCommit, seconds, commitDate);
		
		// Check if limit is reached and send notifications/block immediately
		await checkLimitAndNotify(domainToCommit);
	}
	lastActiveTimestamp = Date.now();
}

function handleActivatedTab(tabId: number): void {
	commitElapsedTime();
	currentActiveTabId = tabId;
	lastActiveTimestamp = Date.now();
	
	chrome.tabs.get(tabId, (tab) => {
		if (chrome.runtime.lastError) {
			console.warn('[FocusForge] Error getting tab:', chrome.runtime.lastError.message);
			currentActiveDomain = null;
			return;
		}
		
		const url = tab.url ?? '';
		const domain = getDomainFromUrl(url);
		
		console.log(`[FocusForge] Tab activated: ${tabId}, URL: ${url}, Domain: ${domain}, Previous: ${currentActiveDomain}`);
		
		// Filter out extension, chrome, and other internal URLs
		const isValidDomain = domain && 
			domain.trim() !== '' && 
			!url.startsWith('chrome://') && 
			!url.startsWith('chrome-extension://') && 
			!url.startsWith('moz-extension://') && 
			!url.startsWith('extension://') &&
			!domain.includes('extension') &&
			!/^[a-z]{32}$/.test(domain) && // Extension IDs are 32 lowercase letters
			domain.length > 3 && // Must be a real domain
			domain.includes('.'); // Must have a TLD
		
		console.log(`[FocusForge] Domain validation: ${domain} -> Valid: ${isValidDomain}`);
		
		// Only set domain if it's valid AND different from current
		if (isValidDomain) {
			if (currentActiveDomain !== domain) {
				console.log(`[FocusForge] Domain switched from '${currentActiveDomain}' to '${domain}' - resetting timer`);
				currentActiveDomain = domain;
				lastActiveTimestamp = Date.now(); // Reset timestamp for new domain
				void classifyAndCache(currentActiveDomain);
				// Immediate enforcement on activation: redirect now if already blocked
				void checkLimitAndNotify(currentActiveDomain);
			} else {
				console.log(`[FocusForge] Same domain '${domain}' - continuing timer`);
				// Even if the domain didn't change, enforce immediately on activation
				void checkLimitAndNotify(currentActiveDomain);
			}
		} else {
			console.log(`[FocusForge] Invalid domain, clearing current: ${currentActiveDomain}`);
			currentActiveDomain = null; // Clear invalid domain
		}
	});
}

function handleUpdatedTab(tabId: number, changeInfo: any, tab: chrome.tabs.Tab): void {
	if (currentActiveTabId !== tabId) return;
	
	// Track URL changes (navigation within the same tab)
	if (changeInfo.url) {
		commitElapsedTime();
		const domain = getDomainFromUrl(changeInfo.url);
		
		console.log(`[FocusForge] Tab URL changed: ${tabId}, New URL: ${changeInfo.url}, Domain: ${domain}`);
		
		// Same domain validation as handleActivatedTab
		const isValidDomain = domain && 
			domain.trim() !== '' && 
			!changeInfo.url.startsWith('chrome://') && 
			!changeInfo.url.startsWith('chrome-extension://') && 
			!changeInfo.url.startsWith('moz-extension://') && 
			!changeInfo.url.startsWith('extension://') &&
			!domain.includes('extension') &&
			!/^[a-z]{32}$/.test(domain) && // Extension IDs are 32 lowercase letters
			domain.length > 3 && 
			domain.includes('.');
		
		console.log(`[FocusForge] URL change domain validation: ${domain} -> Valid: ${isValidDomain}`);
		
		if (isValidDomain) {
			if (currentActiveDomain !== domain) {
				console.log(`[FocusForge] Domain changed via URL to '${domain}' - resetting timer`);
				currentActiveDomain = domain;
				void classifyAndCache(currentActiveDomain);
			}
		} else {
			console.log(`[FocusForge] Invalid domain from URL change, clearing: ${domain}`);
			currentActiveDomain = null;
		}
		
		// Reset timer for new domain
		lastActiveTimestamp = Date.now();
	}
	
	// Also handle page load completion for cases where URL didn't change but domain extraction improved
	if (changeInfo.status === 'complete' && tab.url && !changeInfo.url) {
		const domain = getDomainFromUrl(tab.url);
		if (domain && domain.trim() !== '' && domain !== currentActiveDomain) {
			commitElapsedTime();
			currentActiveDomain = domain;
			void classifyAndCache(currentActiveDomain);
			lastActiveTimestamp = Date.now();
			
			console.log(`[FocusForge] Tab completed loading: ${tabId}, Domain: ${domain}`);
		}
	}
}

function handleWindowFocusChanged(windowId: number): void {
	const wasFocused = isWindowFocused;
	isWindowFocused = windowId !== chrome.windows.WINDOW_ID_NONE;
	
	console.log(`[FocusForge] Window focus changed: ${wasFocused ? 'focused' : 'unfocused'} -> ${isWindowFocused ? 'focused' : 'unfocused'}`);
	
	if (isWindowFocused && !wasFocused) {
		// Window regained focus - reset timer
		lastActiveTimestamp = Date.now();
	} else if (!isWindowFocused && wasFocused) {
		// Window lost focus - commit any pending time
		commitElapsedTime();
	}
}

function handleIdleState(newState: chrome.idle.IdleState): void {
	console.log(`[FocusForge] Idle state changed to: ${newState}`);
	
	if (newState === 'active') {
		// User became active - reset timer
		lastActiveTimestamp = Date.now();
	} else {
		// User became idle or locked - commit any pending time
		commitElapsedTime();
	}
}

export function initializeUsageTracking(): void {
	chrome.tabs.onActivated.addListener(({ tabId }) => handleActivatedTab(tabId));
	chrome.tabs.onUpdated.addListener(handleUpdatedTab);
	chrome.windows.onFocusChanged.addListener(handleWindowFocusChanged);
	// Use Chrome Idle API with a 60s threshold by default
	if (chrome.idle) {
		chrome.idle.setDetectionInterval(60);
		chrome.idle.onStateChanged.addListener(handleIdleState);
	}

	// Initialize current active tab and window focus state when the service worker starts
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const tab = tabs[0];
		if (tab && tab.id) {
			console.log(`[FocusForge] Initializing with active tab: ${tab.id}, URL: ${tab.url}`);
			handleActivatedTab(tab.id);
		} else {
			console.log('[FocusForge] No active tab found during initialization');
		}
	});
	
	// Initialize window focus state
	chrome.windows.getCurrent({ populate: false }, (window) => {
		if (window) {
			isWindowFocused = window.focused;
			console.log(`[FocusForge] Initial window focus state: ${isWindowFocused}`);
		}
	});

	// Heartbeat commit every 3 seconds for immediate blocking accuracy
	setInterval(() => {
		if (isWindowFocused && currentActiveDomain && lastActiveTimestamp) {
			const elapsed = Math.round((Date.now() - lastActiveTimestamp) / 1000);
			console.log(`[FocusForge] Heartbeat: ${elapsed}s elapsed on ${currentActiveDomain}`);
			commitElapsedTime();
		}
	}, 3_000);

	// Additional fast check every 2 seconds for immediate blocking (reduced frequency to prevent race conditions)
	setInterval(() => {
		console.log(`[FocusForge] Fast check interval - focused: ${isWindowFocused}, domain: ${currentActiveDomain}, timestamp: ${lastActiveTimestamp}`);
		if (isWindowFocused && currentActiveDomain && lastActiveTimestamp) {
			// Quick check without committing - just for immediate blocking
			// But don't check if we're currently on extension pages or blocked page
			if (currentActiveDomain && !currentActiveDomain.includes('extension') && !/^[a-z]{32}$/.test(currentActiveDomain)) {
				void checkForImmediateBlocking();
			}
		} else {
			console.log(`[FocusForge] Fast check skipped - conditions not met`);
		}
	}, 2_000);

	console.log(`[FocusForge] Usage tracking initialized at ${nowUtcIso()}`);
}

// Export function to get current tracking state for debugging
export function getTrackingState() {
	return {
		currentActiveTabId,
		currentActiveDomain,
		lastActiveTimestamp,
		isWindowFocused,
		elapsedSinceLastUpdate: lastActiveTimestamp ? Math.round((Date.now() - lastActiveTimestamp) / 1000) : null,
		pendingCommitTimer: usageCommitTimer !== null
	};
}


