import { UsageStore } from './usageStore';
import { normalizeDomain } from '../utils/time';

export type Timeframe = 'daily' | 'weekly' | 'monthly';

export type LimitTargetType = 'site' | 'category';

export interface LimitRecord {
	id: string; // unique id
	limitMinutes: number;
	timeframe: Timeframe;
	targetType: LimitTargetType;
	targetId: string; // domain if site; category name if category
	displayName: string; // human friendly for UI
	// derived
	isCurrentlyBlocked?: boolean;
}

export interface LimitChangeRecord {
	 id: string;
	 timestamp: number;
	 action: 'create' | 'update' | 'delete';
	 targetType: LimitTargetType;
	 targetId: string;
	 displayName: string;
	 timeframe: Timeframe;
	 oldMinutes?: number;
	 newMinutes?: number;
}

type LegacySiteLimit = {
	id: string;
	domain: string;
	timeframe: Timeframe;
	limitMinutes: number;
};

async function getGlobalSnoozeUntil(): Promise<number> {
	const v = await chrome.storage.local.get('blockSnoozeUntil');
	return (v['blockSnoozeUntil'] as number | undefined) ?? 0;
}

async function setGlobalSnoozeUntil(ts: number): Promise<void> {
	await chrome.storage.local.set({ blockSnoozeUntil: ts });
}

async function getAllRawLimits(): Promise<LimitRecord[]> {
	const value = await chrome.storage.local.get('limits');
	const arr = (value['limits'] as any[] | undefined) ?? [];
	// migrate legacy {domain,...}
	const migrated: LimitRecord[] = arr.map((it: any) => {
		if ('targetType' in it) return it as LimitRecord;
		const legacy = it as LegacySiteLimit;
		return {
			id: legacy.id,
			limitMinutes: legacy.limitMinutes,
			timeframe: legacy.timeframe,
			targetType: 'site',
			targetId: legacy.domain,
			displayName: legacy.domain
		};
	});
	return migrated;
}

async function setAllRawLimits(limits: LimitRecord[]): Promise<void> {
	await chrome.storage.local.set({ limits });
}

async function appendLimitHistory(entry: LimitChangeRecord): Promise<void> {
	const res = await chrome.storage.local.get('limitHistory');
	const history = (res['limitHistory'] as LimitChangeRecord[] | undefined) ?? [];
	history.push(entry);
	await chrome.storage.local.set({ limitHistory: history });
}

async function getUsageSecondsForTarget(targetType: LimitTargetType, targetId: string, timeframe: Timeframe): Promise<number> {
    const range = timeframe === 'daily' ? 'today' : timeframe === 'weekly' ? 'week' : 'month';
    if (targetType === 'site') {
        // Aggregate usage for the target domain INCLUDING all its subdomains
        const rows = await UsageStore.getSummary({ range, by: 'domain' });
        const base = normalizeDomain(targetId);
        let total = 0;
        for (const r of rows as any[]) {
            const keyNorm = normalizeDomain(r.key);
            if (keyNorm === base || keyNorm.endsWith(`.${base}`)) {
                total += r.seconds ?? 0;
            }
        }
        console.log(`[LimitsStore] Aggregated usage for ${targetId} (${timeframe}) incl subdomains: ${total}s from ${rows.length} rows`);
        return total;
    }
    const rows = await UsageStore.getSummary({ range, by: 'category' });
    const map = new Map<string, number>(rows.map((r: any) => [r.key, r.seconds]));
    const usage = map.get(targetId) ?? 0;
    console.log(`[LimitsStore] Usage for category ${targetId} (${timeframe}): ${usage}s from ${rows.length} total rows`);
    return usage;
}

async function computeBlockedFlags(limits: LimitRecord[]): Promise<LimitRecord[]> {
	const snooze = await getGlobalSnoozeUntil();
	const now = Date.now();
	if (now < snooze) {
		return limits.map((l) => ({ ...l, isCurrentlyBlocked: false }));
	}
	const out: LimitRecord[] = [];
	for (const limit of limits) {
		// eslint-disable-next-line no-await-in-loop
		const used = await getUsageSecondsForTarget(limit.targetType, limit.targetId, limit.timeframe);
		const limitSeconds = limit.limitMinutes * 60;
		const isBlocked = used >= limitSeconds;
		
		console.log(`[LimitsStore] Limit check: ${limit.targetId} (${limit.targetType}) - Used: ${used}s, Limit: ${limitSeconds}s, Blocked: ${isBlocked}`);
		
		out.push({ ...limit, isCurrentlyBlocked: isBlocked });
	}
	return out;
}

async function getDomainsForCategory(categoryName: string): Promise<string[]> {
	const mapping = (await chrome.storage.local.get('domainCategories'))['domainCategories'] as Record<string, string> | undefined;
	if (!mapping) return [];
	return Object.entries(mapping)
		.filter(([, cat]) => cat === categoryName)
		.map(([domain]) => domain);
}

export const LimitsStore = {
	async getAllLimits(): Promise<LimitRecord[]> {
		const limits = await getAllRawLimits();
		return computeBlockedFlags(limits);
	},
	async getUsageSecondsForTarget(targetType: LimitTargetType, targetId: string, timeframe: Timeframe): Promise<number> {
		return getUsageSecondsForTarget(targetType, targetId, timeframe);
	},
	async getAllDomainsMarkedBlocked(): Promise<string[]> {
		const limits = await LimitsStore.getAllLimits();
		const domains = new Set<string>();
		const mapping = (await chrome.storage.local.get('domainCategories'))['domainCategories'] as Record<string, string> | undefined;
		for (const l of limits) {
			if (!l.isCurrentlyBlocked) continue;
			if (l.targetType === 'site') domains.add(l.targetId);
			if (l.targetType === 'category') {
				if (mapping) {
					for (const [d, cat] of Object.entries(mapping)) if (cat === l.targetId) domains.add(d);
				}
			}
		}
		return Array.from(domains);
	},
	async upsertLimit(limit: LimitRecord): Promise<void> {
		const limits = await getAllRawLimits();
		const idx = limits.findIndex((l) => l.id === limit.id);
		const existing = idx >= 0 ? limits[idx] : undefined;
		if (idx >= 0) limits[idx] = limit; else limits.push(limit);
		await setAllRawLimits(limits);
		await appendLimitHistory({
			id: limit.id,
			timestamp: Date.now(),
			action: existing ? 'update' : 'create',
			targetType: limit.targetType,
			targetId: limit.targetId,
			displayName: limit.displayName,
			timeframe: limit.timeframe,
			...(existing ? { oldMinutes: existing.limitMinutes } : {}),
			...(typeof limit.limitMinutes === 'number' ? { newMinutes: limit.limitMinutes } : {})
		});
	},
	async deleteLimit(id: string): Promise<void> {
		const limits = await getAllRawLimits();
		const toDelete = limits.find((l) => l.id === id);
		await setAllRawLimits(limits.filter((l) => l.id !== id));
		if (toDelete) {
			await appendLimitHistory({
				id: toDelete.id,
				timestamp: Date.now(),
				action: 'delete',
				targetType: toDelete.targetType,
				targetId: toDelete.targetId,
				displayName: toDelete.displayName,
				timeframe: toDelete.timeframe,
				...(typeof toDelete.limitMinutes === 'number' ? { oldMinutes: toDelete.limitMinutes } : {})
			});
		}
	},
	async updateLimitMinutes(id: string, newMinutes: number): Promise<void> {
		const limits = await getAllRawLimits();
		const idx = limits.findIndex((l) => l.id === id);
		if (idx >= 0) {
			const curr = limits[idx]!;
			const oldMinutes = curr.limitMinutes;
			curr.limitMinutes = newMinutes;
			await setAllRawLimits(limits);
			await appendLimitHistory({
				id,
				timestamp: Date.now(),
				action: 'update',
				targetType: curr.targetType,
				targetId: curr.targetId,
				displayName: curr.displayName,
				timeframe: curr.timeframe,
				...(typeof oldMinutes === 'number' ? { oldMinutes } : {}),
				...(typeof newMinutes === 'number' ? { newMinutes } : {})
			});
		}
	},
	async isDomainCurrentlyBlocked(domain: string): Promise<boolean> {
        const normalized = normalizeDomain(domain);
        
        console.log(`[LimitsStore] Checking if domain is blocked: ${domain} -> ${normalized}`);
        
        const limits = await LimitsStore.getAllLimits();
        const siteBlocked = !!limits.find((l) => {
            if (l.targetType !== 'site' || !l.isCurrentlyBlocked) return false;
            const targetBase = normalizeDomain(l.targetId);
            return normalized === targetBase || normalized.endsWith(`.${targetBase}`);
        });
        
        console.log(`[LimitsStore] Site blocked check result: ${siteBlocked}`);
        
        if (siteBlocked) return true;
        // category limits (fallback: inherit category from parent domains if exact not found)
        const mapping = (await chrome.storage.local.get('domainCategories'))['domainCategories'] as Record<string, string> | undefined;
        let cat = mapping?.[normalized];
        if (!cat && mapping) {
            const parts = normalized.split('.');
            for (let i = 1; i < parts.length - 1 && !cat; i++) {
                const candidate = parts.slice(i).join('.');
                cat = mapping[candidate];
            }
        }
        if (!cat) return false;
        return !!limits.find((l) => l.targetType === 'category' && l.targetId === cat && l.isCurrentlyBlocked);
    },
	async rolloverPeriodsIfNeeded(): Promise<void> {
		// No stateful counters to reset; usage is time-based.
	},
	async setGlobalSnooze(minutes: number): Promise<void> {
		const until = Date.now() + minutes * 60_000;
		await setGlobalSnoozeUntil(until);
		await chrome.storage.local.set({ usageTick: Date.now() });
	},
	async getDomainsToBlock(): Promise<string[]> {
		const snooze = await getGlobalSnoozeUntil();
		if (Date.now() < snooze) {
			console.log('[LimitsStore] Snooze active, returning empty domains to block');
			return [];
		}
		const limits = await LimitsStore.getAllLimits();
		console.log('[LimitsStore] getDomainsToBlock() checking limits:', limits.map(l => ({ 
			id: l.targetId, 
			type: l.targetType, 
			blocked: l.isCurrentlyBlocked 
		})));
		const domains = new Set<string>();
		for (const l of limits) {
			if (!l.isCurrentlyBlocked) continue;
			if (l.targetType === 'site') {
				console.log(`[LimitsStore] Adding blocked site domain: ${l.targetId}`);
				domains.add(l.targetId);
			}
			if (l.targetType === 'category') {
				// eslint-disable-next-line no-await-in-loop
				const catDomains = await getDomainsForCategory(l.targetId);
				console.log(`[LimitsStore] Adding blocked category domains for ${l.targetId}:`, catDomains);
				for (const d of catDomains) domains.add(d);
			}
		}
		const result = Array.from(domains);
		console.log('[LimitsStore] Final domains to block:', result);
		return result;
	},
	async getLimitHistory(): Promise<LimitChangeRecord[]> {
		const res = await chrome.storage.local.get('limitHistory');
		return (res['limitHistory'] as LimitChangeRecord[] | undefined) ?? [];
	}
};


