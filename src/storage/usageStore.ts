import Dexie, { Table } from 'dexie';
import { formatDateKey } from '../utils/time';

export interface UsageLog {
	id?: number;
	domain: string;
	seconds: number;
	dateKey: string; // YYYY-MM-DD
}

class UsageDatabase extends Dexie {
	logs!: Table<UsageLog, number>;

	constructor() {
		super('focusforge_usage');
		this.version(1).stores({
			logs: '++id,dateKey,domain'
		});
	}
}

const db = new UsageDatabase();

export const UsageStore = {
	async appendUsage(domain: string, seconds: number, date: Date): Promise<void> {
		try {
			const dateKey = formatDateKey(date);
			console.log(`[UsageStore] Writing ${seconds}s for ${domain} with dateKey: ${dateKey}`);
			await db.logs.add({ domain, seconds, dateKey });
			
			// Note: Immediate blocking is handled by usageTracking.ts to avoid circular dependencies
			
			// Trigger listeners (e.g., DNR rule rebuild) via lightweight storage tick
			await chrome.storage.local.set({ usageTick: Date.now() });
		} catch (error) {
			console.error('[FocusForge] Error appending usage:', error);
			// Attempt recovery by clearing corrupted data if needed
			if (error instanceof Error && error.message.includes('QuotaExceededError')) {
				console.warn('[FocusForge] Storage quota exceeded, cleaning old data');
				await this.cleanOldData();
				// Retry after cleanup
				try {
					const dateKey = formatDateKey(date);
					await db.logs.add({ domain, seconds, dateKey });
				} catch (retryError) {
					console.error('[FocusForge] Failed to append usage after cleanup:', retryError);
				}
			}
		}
	},
	
	// Removed checkAndTriggerBlocking to avoid circular dependencies
	// Immediate blocking is now handled entirely by usageTracking.ts

	
	async cleanOldData(): Promise<void> {
		try {
			const threeMonthsAgo = new Date();
			threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
			const cutoffKey = formatDateKey(threeMonthsAgo);
			
			const deletedCount = await db.logs.where('dateKey').below(cutoffKey).delete();
			console.log(`[FocusForge] Cleaned ${deletedCount} old usage records`);
		} catch (error) {
			console.error('[FocusForge] Error cleaning old data:', error);
		}
	},
	
	async getSummaryForDate(date: Date, by: 'domain' | 'category'): Promise<any[]> {
		try {
			const dateKey = formatDateKey(date);
			const items = await db.logs.where('dateKey').equals(dateKey).toArray();
			const map = new Map<string, number>();
			const mapping = (await chrome.storage.local.get('domainCategories'))['domainCategories'] as Record<string, string> | undefined;
			for (const row of items) {
				const key = by === 'domain' ? row.domain : (mapping?.[row.domain] ?? 'Other');
				map.set(key, (map.get(key) ?? 0) + row.seconds);
			}
			return Array.from(map.entries()).map(([key, seconds]) => ({ key, seconds }));
		} catch (error) {
			console.error('[FocusForge] Error getting summary for date:', error);
			return [];
		}
	},

	async getSummaryForRange(startDate: Date, endDate: Date, by: 'domain' | 'category'): Promise<any[]> {
		const startKey = formatDateKey(startDate);
		const endKey = formatDateKey(endDate);
		const items = await db.logs.where('dateKey').between(startKey, endKey, true, true).toArray();
		const map = new Map<string, number>();
		const mapping = (await chrome.storage.local.get('domainCategories'))['domainCategories'] as Record<string, string> | undefined;
		for (const row of items) {
			const key = by === 'domain' ? row.domain : (mapping?.[row.domain] ?? 'Other');
			map.set(key, (map.get(key) ?? 0) + row.seconds);
		}
		return Array.from(map.entries()).map(([key, seconds]) => ({ key, seconds }));
	},

	async getSummary(params: { range: 'today' | 'week' | 'month' | 'all'; by?: 'domain' | 'date' | 'category' }): Promise<any> {
		const now = new Date();
		const by = params.by ?? 'domain';
		let items: UsageLog[];
		
		if (params.range === 'all') {
			// For 'all' range, get ALL logs without date filtering
			items = await db.logs.toArray();
		} else {
			// For specific ranges, use date filtering
			let start: Date | null = null;
			if (params.range === 'today') {
				start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			} else if (params.range === 'week') {
				const day = now.getDay();
				start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
			} else if (params.range === 'month') {
				start = new Date(now.getFullYear(), now.getMonth(), 1);
			}
			const dateKeyLower = start ? formatDateKey(start) : '0000-00-00';
			items = await db.logs.where('dateKey').aboveOrEqual(dateKeyLower).toArray();
		}
		
		const map = new Map<string, number>();
		
		// Load mapping once outside the loop for efficiency
		const mapping = by === 'category' 
			? (await chrome.storage.local.get('domainCategories'))['domainCategories'] as Record<string, string> | undefined
			: undefined;
		
		if (by === 'category') {
			console.log('[UsageStore] Category mapping:', mapping);
			console.log('[UsageStore] Items to process:', items.length);
		}
		
		for (const row of items) {
			let key: string;
			if (by === 'domain') key = row.domain;
			else if (by === 'date') key = row.dateKey;
			else {
				// category grouping: use pre-loaded mapping
				key = mapping?.[row.domain] ?? 'Other';
				if (by === 'category') {
					console.log('[UsageStore] Domain:', row.domain, 'mapped to category:', key, 'seconds:', row.seconds);
				}
			}
			map.set(key, (map.get(key) ?? 0) + row.seconds);
		}
		
		if (by === 'category') {
			console.log('[UsageStore] Final category aggregation:', Array.from(map.entries()));
		}
		return Array.from(map.entries()).map(([key, seconds]) => ({ key, seconds }));
	},
	async getAllLogs(): Promise<UsageLog[]> {
		return db.logs.toArray();
	},
	async clearAll(): Promise<void> {
		await db.logs.clear();
	}
};


