import { suggestCategory } from './classifier';

export interface SuggestionItem {
	type: 'limit' | 'category' | 'cleanup' | 'optimization';
	label: string;
	meta?: string;
	payload: any;
	priority: 'high' | 'medium' | 'low';
}

export async function generateSuggestions(): Promise<SuggestionItem[]> {
	const suggestions: SuggestionItem[] = [];
	
	try {
		// Get comprehensive data for analysis
		const [storage, usageData] = await Promise.all([
			chrome.storage.local.get(['domainCategories', 'limits']),
			new Promise<any[]>((resolve) => {
				chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'week', by: 'domain' } }, (res) => {
					resolve(res?.ok ? res.data : []);
				});
			})
		]);
		
		const domainCategories = (storage['domainCategories'] as Record<string, string> | undefined) ?? {};
		const limits = (storage['limits'] as any[] | undefined) ?? [];
		
		console.log('[AI Suggestions] Usage data:', usageData);
		console.log('[AI Suggestions] Domain categories:', domainCategories);
		console.log('[AI Suggestions] Limits:', limits);
		
		// 1. High usage domains without limits (priority)
		const highUsageDomains = usageData
			.filter(item => item.seconds > 3600) // More than 1 hour this week
			.sort((a, b) => b.seconds - a.seconds)
			.slice(0, 5);
		
		for (const item of highUsageDomains) {
			const hasLimit = limits.some((l) => l.targetType === 'site' && l.targetId === item.key);
			if (!hasLimit) {
				const category = domainCategories[item.key] || await suggestCategory(item.key);
				const suggestedMinutes = Math.max(15, Math.round(item.seconds / 60 / 7 * 0.8)); // 80% of current average
				
				suggestions.push({
					type: 'limit',
					label: `Limit ${item.key}`,
					meta: `High usage: ${Math.round(item.seconds/60)}min this week. Category: ${category}`,
					payload: {
						id: `site:${item.key}:daily`,
						targetType: 'site',
						targetId: item.key,
						displayName: item.key,
						timeframe: 'daily',
						limitMinutes: suggestedMinutes
					},
					priority: 'high'
				});
			}
		}
		
		// 2. Uncategorized domains (medium priority)
		const uncategorizedDomains = usageData
			.filter(item => !domainCategories[item.key] && item.seconds > 600) // > 10 minutes
			.slice(0, 3);
		
		for (const item of uncategorizedDomains) {
			const suggestedCategory = await suggestCategory(item.key);
			suggestions.push({
				type: 'category',
				label: `Categorize ${item.key}`,
				meta: `Suggested: ${suggestedCategory}`,
				payload: {
					domain: item.key,
					category: suggestedCategory
				},
				priority: 'medium'
			});
		}
		
		// 3. Optimization suggestions
		if (limits.length > 0) {
			const activeBlockedLimits = limits.filter(l => l.isCurrentlyBlocked);
			if (activeBlockedLimits.length > 2) {
				suggestions.push({
					type: 'optimization',
					label: 'Review blocked sites',
					meta: `${activeBlockedLimits.length} sites currently blocked`,
					payload: { action: 'review-limits' },
					priority: 'low'
				});
			}
		}
		
		// 4. Data cleanup (low priority)
		const totalDomains = Object.keys(domainCategories).length;
		if (totalDomains > 50) {
			suggestions.push({
				type: 'cleanup',
				label: 'Clean up old data',
				meta: `${totalDomains} domains tracked`,
				payload: { action: 'cleanup-old-data' },
				priority: 'low'
			});
		}
		
		// Add fallback suggestions if we don't have enough
		if (suggestions.length < 3) {
			// General wellness suggestions
			suggestions.push({
				type: 'optimization',
				label: 'Set daily time limits',
				meta: 'Establish healthy boundaries for productive browsing',
				payload: { action: 'create-basic-limits' },
				priority: 'medium'
			});
			
			suggestions.push({
				type: 'optimization',
				label: 'Schedule focused work time',
				meta: 'Block distracting sites during work hours',
				payload: { action: 'setup-work-schedule' },
				priority: 'medium'
			});
			
			suggestions.push({
				type: 'category',
				label: 'Organize your browsing',
				meta: 'Categorize websites for better insights',
				payload: { action: 'setup-categories' },
				priority: 'low'
			});
		}
		
		// Sort by priority and limit results
		const priorityOrder = { high: 3, medium: 2, low: 1 };
		return suggestions
			.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
			.slice(0, 8);
		
	} catch (error) {
		console.error('[FocusForge] Error generating suggestions:', error);
		// Return fallback suggestions even on error
		return [
			{
				type: 'optimization',
				label: 'Get started with time limits',
				meta: 'Create your first time limit to build healthy habits',
				payload: { action: 'create-first-limit' },
				priority: 'high'
			},
			{
				type: 'category',
				label: 'Categorize your websites',
				meta: 'Organize your browsing for better insights',
				payload: { action: 'setup-categories' },
				priority: 'medium'
			}
		];
	}
}










