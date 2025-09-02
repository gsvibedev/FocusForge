export interface AnalyticsFilter {
	dateRange: {
		start: Date;
		end: Date;
		preset?: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';
	};
	categories: string[]; // empty = all categories
	domains: string[]; // empty = all domains
	timeOfDay: {
		start: string; // "HH:MM"
		end: string; // "HH:MM"
	} | null;
	dayOfWeek: number[]; // 0-6, empty = all days
	minDuration: number; // seconds, 0 = no minimum
	maxDuration: number; // seconds, 0 = no maximum
	searchTerm: string; // search in domain names
	groupBy: 'hour' | 'day' | 'week' | 'month' | 'category' | 'domain';
	sortBy: 'time' | 'duration' | 'frequency' | 'alphabetical';
	sortOrder: 'asc' | 'desc';
}

export interface DetailedReport {
	summary: {
		totalTime: number;
		averageDaily: number;
		peakDay: { date: string; duration: number };
		mostUsedCategory: string;
		mostUsedDomain: string;
		productivityScore: number; // 0-100
	};
	timeline: Array<{
		date: string;
		hour?: number;
		totalTime: number;
		sessions: number;
		categories: Array<{ name: string; time: number; percentage: number }>;
		domains: Array<{ name: string; time: number; percentage: number }>;
	}>;
	categories: Array<{
		name: string;
		totalTime: number;
		percentage: number;
		trend: 'increasing' | 'decreasing' | 'stable';
		domains: Array<{ name: string; time: number }>;
		peakTimes: Array<{ hour: number; usage: number }>;
	}>;
	insights: {
		patterns: string[];
		recommendations: string[];
		warnings: string[];
		achievements: string[];
	};
}

export interface WeeklyReport extends DetailedReport {
	weeklyComparison: {
		thisWeek: number;
		lastWeek: number;
		change: number; // percentage
		trend: 'improving' | 'declining' | 'stable';
	};
	dailyBreakdown: Array<{
		day: string;
		totalTime: number;
		productivityTime: number;
		distractionTime: number;
		goalsMet: boolean;
	}>;
	habitScore: number; // consistency of habits
}

export interface MonthlyReport extends DetailedReport {
	monthlyComparison: {
		thisMonth: number;
		lastMonth: number;
		change: number;
		trend: 'improving' | 'declining' | 'stable';
	};
	weeklyBreakdown: Array<{
		weekNumber: number;
		startDate: string;
		totalTime: number;
		focusScore: number;
		goalsCompleted: number;
	}>;
	milestones: Array<{
		date: string;
		type: 'streak' | 'goal' | 'limit' | 'achievement';
		description: string;
	}>;
	topDomains: Array<{
		domain: string;
		category: string;
		totalTime: number;
		changeFromLastMonth: number;
		rank: number;
	}>;
}

export class AdvancedAnalytics {
	static async generateDetailedReport(filter: AnalyticsFilter): Promise<DetailedReport> {
		try {
		const { UsageStore } = await import('../storage/usageStore');
		
		// Get raw data based on date range
		const logs = await this.getFilteredLogs(filter);
		
		// Calculate summary statistics
		const summary = await this.calculateSummary(logs, filter);
		
		// Generate timeline data
		const timeline = this.generateTimeline(logs, filter);
		
		// Analyze categories
		const categories = await this.analyzeCategories(logs, filter);
		
		// Generate insights
		const insights = this.generateInsights(logs, filter, summary);
		
		return {
			summary,
			timeline,
			categories,
			insights
		};
		} catch (error) {
			console.error('[AdvancedAnalytics] Error generating detailed report:', error);
			// Return safe defaults
			return {
				summary: {
					totalTime: 0,
					averageDaily: 0,
					peakDay: { date: '', duration: 0 },
					mostUsedCategory: '',
					mostUsedDomain: '',
					productivityScore: 0
				},
				timeline: [],
				categories: [],
				insights: {
					patterns: [],
					recommendations: [],
					warnings: [],
					achievements: []
				}
			};
		}
	}

	static async generateWeeklyReport(startDate?: Date): Promise<WeeklyReport> {
		const now = startDate || new Date();
		const weekStart = new Date(now);
		weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
		weekStart.setHours(0, 0, 0, 0);
		
		const weekEnd = new Date(weekStart);
		weekEnd.setDate(weekStart.getDate() + 7);
		
		const filter: AnalyticsFilter = {
			dateRange: { start: weekStart, end: weekEnd },
			categories: [],
			domains: [],
			timeOfDay: null,
			dayOfWeek: [],
			minDuration: 0,
			maxDuration: 0,
			searchTerm: '',
			groupBy: 'day',
			sortBy: 'time',
			sortOrder: 'desc'
		};
		
		const baseReport = await this.generateDetailedReport(filter);
		
		// Add weekly-specific data
		const lastWeekStart = new Date(weekStart);
		lastWeekStart.setDate(weekStart.getDate() - 7);
		const lastWeekEnd = new Date(weekEnd);
		lastWeekEnd.setDate(weekEnd.getDate() - 7);
		
		const lastWeekFilter = { ...filter, dateRange: { start: lastWeekStart, end: lastWeekEnd } };
		const lastWeekReport = await this.generateDetailedReport(lastWeekFilter);
		
		// Ensure summaries exist with safe defaults
		const thisWeekTime = baseReport?.summary?.totalTime || 0;
		const lastWeekTime = lastWeekReport?.summary?.totalTime || 0;
		
		const weeklyComparison = {
			thisWeek: thisWeekTime,
			lastWeek: lastWeekTime,
			change: lastWeekTime > 0 ? 
				Math.round(((thisWeekTime - lastWeekTime) / lastWeekTime) * 100) : 0,
			trend: this.calculateTrend(thisWeekTime, lastWeekTime)
		};
		
		const dailyBreakdown = await this.generateDailyBreakdown(weekStart, weekEnd);
		const habitScore = this.calculateHabitScore(dailyBreakdown);
		
		return {
			...baseReport,
			weeklyComparison,
			dailyBreakdown,
			habitScore
		};
	}

	static async generateMonthlyReport(startDate?: Date): Promise<MonthlyReport> {
		try {
			console.log('[AdvancedAnalytics] Starting monthly report generation for:', startDate);

			const now = startDate || new Date();
			const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
			const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

			console.log('[AdvancedAnalytics] Month range:', monthStart, 'to', monthEnd);
			console.log('[AdvancedAnalytics] Month start ISO:', monthStart.toISOString());
			console.log('[AdvancedAnalytics] Month end ISO:', monthEnd.toISOString());

			const filter: AnalyticsFilter = {
				dateRange: { start: monthStart, end: monthEnd },
				categories: [],
				domains: [],
				timeOfDay: null,
				dayOfWeek: [],
				minDuration: 0,
				maxDuration: 0,
				searchTerm: '',
				groupBy: 'day', // Changed from 'week' to 'day' to match weekly report approach
				sortBy: 'time',
				sortOrder: 'desc'
			};

			console.log('[AdvancedAnalytics] Generating base report...');
			const baseReport = await this.generateDetailedReport(filter);
			console.log('[AdvancedAnalytics] Base report generated:', baseReport?.summary);
			console.log('[AdvancedAnalytics] Base report timeline length:', baseReport?.timeline?.length || 0);
			console.log('[AdvancedAnalytics] Base report categories length:', baseReport?.categories?.length || 0);

			// Generate month-specific data with proper date handling
			const lastMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
			const lastMonthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth(), 0);

			console.log('[AdvancedAnalytics] Generating monthly comparison...');
			const monthlyComparison = await this.generateMonthlyComparison(monthStart, monthEnd, lastMonthStart, lastMonthEnd);
			console.log('[AdvancedAnalytics] Monthly comparison result:', monthlyComparison);

			console.log('[AdvancedAnalytics] Generating weekly breakdown...');
			const weeklyBreakdown = await this.generateWeeklyBreakdown(monthStart, monthEnd);
			console.log('[AdvancedAnalytics] Weekly breakdown result:', weeklyBreakdown?.length || 0, 'weeks');

			console.log('[AdvancedAnalytics] Generating milestones...');
			const milestones = await this.generateMilestones(monthStart, monthEnd);
			console.log('[AdvancedAnalytics] Milestones result:', milestones?.length || 0, 'milestones');

			console.log('[AdvancedAnalytics] Generating top domains...');
			const topDomains = await this.generateTopDomains(monthStart, monthEnd, lastMonthStart, lastMonthEnd);
			console.log('[AdvancedAnalytics] Top domains result:', topDomains?.length || 0, 'domains');

			console.log('[AdvancedAnalytics] Monthly report generation completed');

			return {
				...baseReport,
				monthlyComparison,
				weeklyBreakdown,
				milestones,
				topDomains
			};
		} catch (error) {
			console.error('[AdvancedAnalytics] Error generating monthly report:', error);
			// Return safe defaults
			return {
				summary: {
					totalTime: 0,
					averageDaily: 0,
					peakDay: { date: '', duration: 0 },
					mostUsedCategory: '',
					mostUsedDomain: '',
					productivityScore: 0
				},
				timeline: [],
				categories: [],
				insights: {
					patterns: [],
					recommendations: [],
					warnings: [],
					achievements: []
				},
				monthlyComparison: {
					thisMonth: 0,
					lastMonth: 0,
					change: 0,
					trend: 'stable' as const
				},
				weeklyBreakdown: [],
				milestones: [],
				topDomains: []
			};
		}
	}

	private static async getFilteredLogs(filter: AnalyticsFilter) {
		const { UsageStore } = await import('../storage/usageStore');
		const allLogs = await UsageStore.getAllLogs();

		console.log('[AdvancedAnalytics] Filter range:', filter.dateRange.start, 'to', filter.dateRange.end);
		console.log('[AdvancedAnalytics] Filter start ISO:', filter.dateRange.start.toISOString());
		console.log('[AdvancedAnalytics] Filter end ISO:', filter.dateRange.end.toISOString());
		console.log('[AdvancedAnalytics] Total logs before filtering:', allLogs.length);

		// Debug: Show sample logs and their dates
		if (allLogs.length > 0) {
			console.log('[AdvancedAnalytics] Sample logs:');
			allLogs.slice(0, 3).forEach((log, i) => {
				console.log(`  Log ${i}: dateKey=${log.dateKey}, domain=${log.domain}, seconds=${log.seconds}`);
			});
		}

		const filtered = allLogs.filter(log => {
			// Parse dateKey (format: "YYYY-MM-DD") properly
			const logDate = new Date(log.dateKey + 'T00:00:00');
			const filterStart = new Date(filter.dateRange.start);
			const filterEnd = new Date(filter.dateRange.end);

			// Reset time components for proper date comparison
			filterStart.setHours(0, 0, 0, 0);
			filterEnd.setHours(0, 0, 0, 0);
			logDate.setHours(0, 0, 0, 0);

			// Date range filter (inclusive of both start and end to match getSummaryForRange behavior)
			if (logDate < filterStart || logDate > filterEnd) {
				return false;
			}

			// Duration filters
			if (filter.minDuration > 0 && log.seconds < filter.minDuration) return false;
			if (filter.maxDuration > 0 && log.seconds > filter.maxDuration) return false;

			// Search term filter
			if (filter.searchTerm && log.domain && !log.domain.toLowerCase().includes(filter.searchTerm.toLowerCase())) {
				return false;
			}

			// Day of week filter
			if (filter.dayOfWeek.length > 0 && !filter.dayOfWeek.includes(logDate.getDay())) {
				return false;
			}

			return true;
				});

		console.log('[AdvancedAnalytics] Filtered logs:', filtered.length);

		// Debug: Show filtered logs if any
		if (filtered.length > 0) {
			console.log('[AdvancedAnalytics] Filtered logs sample:');
			filtered.slice(0, 3).forEach((log, i) => {
				console.log(`  Filtered ${i}: dateKey=${log.dateKey}, domain=${log.domain}, seconds=${log.seconds}`);
			});
		} else {
			console.log('[AdvancedAnalytics] No logs matched the filter criteria!');
		}

		return filtered;
	}

	private static async calculateSummary(logs: any[], filter: AnalyticsFilter) {
		const totalTime = logs.reduce((sum, log) => sum + log.seconds, 0);
		const uniqueDays = new Set(logs.map(log => log.dateKey)).size;
		const averageDaily = uniqueDays > 0 ? totalTime / uniqueDays : 0;
		
		// Find peak day
		const dailyTotals = logs.reduce((acc, log) => {
			acc[log.dateKey] = (acc[log.dateKey] || 0) + log.seconds;
			return acc;
		}, {} as Record<string, number>);
		
		const peakDay = Object.entries(dailyTotals)
			.sort(([,a], [,b]) => b - a)[0] || ['', 0];
		
		// Most used domain
		const domainTotals = logs.filter(log => log.domain).reduce((acc, log) => {
			acc[log.domain] = (acc[log.domain] || 0) + log.seconds;
			return acc;
		}, {} as Record<string, number>);
		
		const mostUsedDomain = Object.entries(domainTotals)
			.sort(([,a], [,b]) => b - a)[0]?.[0] || '';
		
		// Calculate productivity score (placeholder - would use actual category classification)
		const productivityScore = await this.calculateProductivityScore(logs);
		
		return {
			totalTime,
			averageDaily,
			peakDay: { date: peakDay[0], duration: peakDay[1] },
			mostUsedCategory: '', // Would be calculated with category mapping
			mostUsedDomain,
			productivityScore
		};
	}

	private static generateTimeline(logs: any[], filter: AnalyticsFilter) {
		const grouped = this.groupLogsByFilter(logs, filter);
		
		return Object.entries(grouped).map(([key, groupLogs]) => ({
			date: key,
			totalTime: groupLogs.reduce((sum: number, log: any) => sum + log.seconds, 0),
			sessions: groupLogs.length,
			categories: this.summarizeByCategory(groupLogs),
			domains: this.summarizeByDomain(groupLogs)
		}));
	}

	private static async analyzeCategories(logs: any[], filter: AnalyticsFilter) {
		// This would use the category mapping to analyze usage by category
		const categoryMapping = (await chrome.storage.local.get('domainCategories'))['domainCategories'] || {};
		
		const categoryTotals = logs.filter(log => log.domain).reduce((acc, log) => {
			const category = categoryMapping[log.domain] || 'Other';
			if (!acc[category]) {
				acc[category] = { totalTime: 0, domains: {}, hourlyUsage: new Array(24).fill(0) };
			}
			acc[category].totalTime += log.seconds;
			acc[category].domains[log.domain] = (acc[category].domains[log.domain] || 0) + log.seconds;
			
			// Track hourly usage (simplified)
			const hour = new Date(log.dateKey).getHours();
			acc[category].hourlyUsage[hour] += log.seconds;
			
			return acc;
		}, {} as Record<string, any>);
		
		const totalTime = Object.values(categoryTotals).reduce((sum: number, cat: any) => sum + cat.totalTime, 0);
		
		return Object.entries(categoryTotals).map(([name, data]: [string, any]) => ({
			name,
			totalTime: data.totalTime,
			percentage: totalTime > 0 ? (data.totalTime / totalTime) * 100 : 0,
			trend: 'stable' as const, // Would calculate actual trend
			domains: Object.entries(data.domains).map(([domain, time]) => ({ name: domain, time: time as number })),
			peakTimes: data.hourlyUsage.map((usage: number, hour: number) => ({ hour, usage }))
				.filter((entry: any) => entry.usage > 0)
				.sort((a: any, b: any) => b.usage - a.usage)
				.slice(0, 3)
		}));
	}

	private static generateInsights(logs: any[], filter: AnalyticsFilter, summary: any) {
		const patterns: string[] = [];
		const recommendations: string[] = [];
		const warnings: string[] = [];
		const achievements: string[] = [];
		
		// Analyze patterns
		if (summary.averageDaily > 3600) { // More than 1 hour daily
			patterns.push('Heavy usage detected - averaging over 1 hour per day');
		}
		
		// Generate recommendations
		if (summary.productivityScore < 50) {
			recommendations.push('Consider setting limits on entertainment categories');
		}
		
		return { patterns, recommendations, warnings, achievements };
	}

	private static groupLogsByFilter(logs: any[], filter: AnalyticsFilter): Record<string, any[]> {
		return logs.reduce((acc, log) => {
			let key: string;
			const logDate = new Date(log.dateKey);
			
			switch (filter.groupBy) {
				case 'hour':
					key = `${log.dateKey} ${logDate.getHours().toString().padStart(2, '0')}:00`;
					break;
				case 'day':
					key = log.dateKey;
					break;
				case 'week': {
				const weekStart = new Date(logDate);
				weekStart.setDate(logDate.getDate() - logDate.getDay());
				key = weekStart.toISOString().split('T')[0];
				break;
			}
				case 'month':
					key = `${logDate.getFullYear()}-${(logDate.getMonth() + 1).toString().padStart(2, '0')}`;
					break;
				case 'category':
					key = log.category || 'Other';
					break;
				case 'domain':
					key = log.domain || 'Unknown';
					break;
				default:
					key = log.dateKey;
			}
			
			if (!acc[key]) acc[key] = [];
			acc[key].push(log);
			return acc;
		}, {} as Record<string, any[]>);
	}

	private static summarizeByCategory(logs: any[]) {
		// Implementation would use category mapping
		return [];
	}

	private static summarizeByDomain(logs: any[]) {
		const domainTotals = logs.filter(log => log.domain).reduce((acc, log) => {
			acc[log.domain] = (acc[log.domain] || 0) + log.seconds;
			return acc;
		}, {} as Record<string, number>);
		
		const total = Object.values(domainTotals).reduce((sum, time) => sum + time, 0);
		
		return Object.entries(domainTotals)
			.map(([name, time]) => ({
				name,
				time,
				percentage: total > 0 ? (time / total) * 100 : 0
			}))
			.sort((a, b) => b.time - a.time);
	}

	private static async calculateProductivityScore(logs: any[]): Promise<number> {
		if (logs.length === 0) return 0;
		
		// Import categories to determine productivity
		const { CategoriesStore } = await import('../storage/categoriesStore');
		const categories = await CategoriesStore.getAll();
		const categoryMap = new Map(categories.map(cat => [cat.name, cat]));
		
		let productiveTime = 0;
		let totalTime = 0;
		
		for (const log of logs) {
			// Simple category matching based on domain name
			const category = Array.from(categoryMap.values()).find(cat => 
				log.domain?.toLowerCase().includes(cat.name.toLowerCase()) ||
				cat.name.toLowerCase().includes(log.domain?.toLowerCase())
			);
			const logTime = log.totalTime || log.time || 0;
			totalTime += logTime;
			
			// Assume categories with "work", "productive", "education" are productive
			if (category?.name.toLowerCase().includes('work') || 
				category?.name.toLowerCase().includes('productive') ||
				category?.name.toLowerCase().includes('education')) {
				productiveTime += logTime;
			}
		}
		
		if (totalTime === 0) return 100;
		
		// Calculate score based on productive vs total time ratio
		const productiveRatio = productiveTime / totalTime;
		return Math.round(productiveRatio * 100);
	}

	private static calculateTrend(current: number, previous: number): 'improving' | 'declining' | 'stable' {
		const change = Math.abs(current - previous) / (previous || 1);
		if (change < 0.05) return 'stable'; // Less than 5% change
		return current < previous ? 'improving' : 'declining';
	}

	private static async calculateWeeklyFocusScore(weekStart: Date, weekEnd: Date): Promise<number> {
		// Calculate productivity score for a specific week
		const filter: AnalyticsFilter = {
			dateRange: { start: weekStart, end: weekEnd },
			categories: [],
			domains: [],
			timeOfDay: null,
			dayOfWeek: [],
			minDuration: 0,
			maxDuration: 0,
			searchTerm: '',
			groupBy: 'day',
			sortBy: 'time',
			sortOrder: 'desc'
		};

		const logs = await this.getFilteredLogs(filter);
		return await this.calculateProductivityScore(logs);
	}

	private static async getGoalsCompleted(weekStart: Date, weekEnd: Date): Promise<number> {
		// Count completed goals in the week (basic implementation)
		try {
			const { GoalTracker } = await import('../storage/goalTracker');
			const goals = await GoalTracker.getGoals();
			let completed = 0;
			
			for (const goal of goals) {
				if (goal.completed && goal.completedDate) {
					const completedDate = new Date(goal.completedDate);
					if (completedDate >= weekStart && completedDate <= weekEnd) {
						completed++;
					}
				}
			}
			
			return completed;
		} catch {
			return 0;
		}
	}

	private static async getCategoryForDomain(domain: string): Promise<string> {
		try {
			if (!domain || typeof domain !== 'string') {
				return 'Uncategorized';
			}

			const { CategoriesStore } = await import('../storage/categoriesStore');
			const categories = await CategoriesStore.getAll();
			// Simple category mapping
			const category = categories.find(cat =>
				domain.toLowerCase().includes(cat.name.toLowerCase()) ||
				cat.name.toLowerCase().includes(domain.toLowerCase())
			);
			return category?.name || 'Uncategorized';
		} catch {
			return 'Uncategorized';
		}
	}

	private static async generateDailyBreakdown(start: Date, end: Date) {
		const { UsageStore } = await import('../storage/usageStore');
		const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
		const breakdown = [];
		
		for (let i = 0; i < 7; i++) {
			const date = new Date(start);
			date.setDate(start.getDate() + i);
			
			if (date > end) break;
			
			const dayData = await UsageStore.getSummaryForDate(date, 'domain');
			const totalTime = dayData.reduce((sum: number, item: any) => sum + item.seconds, 0);
			
			// Simplified categorization - in reality would use actual category mapping
			const productivityTime = Math.floor(totalTime * (0.3 + Math.random() * 0.4));
			const distractionTime = totalTime - productivityTime;
			
			breakdown.push({
				day: days[date.getDay()],
				totalTime,
				productivityTime,
				distractionTime
			});
		}
		
		return breakdown;
	}

	private static calculateHabitScore(dailyBreakdown: any[]): number {
		if (dailyBreakdown.length === 0) return 0;
		
		// Calculate consistency score based on daily patterns
		const totalTimes = dailyBreakdown.map(d => d.totalTime);
		const mean = totalTimes.reduce((sum, time) => sum + time, 0) / totalTimes.length;
		
		if (mean === 0) return 100; // Perfect score if no usage
		
		// Calculate coefficient of variation (lower = more consistent)
		const variance = totalTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / totalTimes.length;
		const stdDev = Math.sqrt(variance);
		const cv = stdDev / mean;
		
		// Convert to 0-100 score (lower variation = higher score)
		return Math.max(0, Math.min(100, 100 - (cv * 50)));
	}

	private static async generateMonthlyComparison(thisStart: Date, thisEnd: Date, lastStart: Date, lastEnd: Date) {
		const { UsageStore } = await import('../storage/usageStore');

		console.log('[AdvancedAnalytics] Monthly comparison date ranges:');
		console.log('  This month:', thisStart.toISOString(), 'to', thisEnd.toISOString());
		console.log('  Last month:', lastStart.toISOString(), 'to', lastEnd.toISOString());

		const thisMonthData = await UsageStore.getSummaryForRange(thisStart, thisEnd, 'domain');
		const lastMonthData = await UsageStore.getSummaryForRange(lastStart, lastEnd, 'domain');

		console.log('[AdvancedAnalytics] Raw data from UsageStore:');
		console.log('  This month data length:', thisMonthData.length);
		console.log('  Last month data length:', lastMonthData.length);

		if (thisMonthData.length > 0) {
			console.log('  This month sample:', thisMonthData.slice(0, 2));
		}
		if (lastMonthData.length > 0) {
			console.log('  Last month sample:', lastMonthData.slice(0, 2));
		}

		const thisMonth = thisMonthData.reduce((sum: number, item: any) => sum + item.seconds, 0);
		const lastMonth = lastMonthData.reduce((sum: number, item: any) => sum + item.seconds, 0);

		console.log('[AdvancedAnalytics] Calculated totals:');
		console.log('  This month total:', thisMonth, 'seconds (', Math.round(thisMonth/60), 'minutes)');
		console.log('  Last month total:', lastMonth, 'seconds (', Math.round(lastMonth/60), 'minutes)');

		const change = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;
		const trend = this.calculateTrend(thisMonth, lastMonth);

		console.log('[AdvancedAnalytics] Monthly comparison result:', { thisMonth, lastMonth, change, trend });

		return {
			thisMonth,
			lastMonth,
			change,
			trend
		};
	}

	private static async generateWeeklyBreakdown(start: Date, end: Date) {
		const { UsageStore } = await import('../storage/usageStore');
		const breakdown = [];
		
		let current = new Date(start);
		let weekNumber = 1;
		
		while (current <= end) {
			const weekStart = new Date(current);
			const weekEnd = new Date(current);
			weekEnd.setDate(current.getDate() + 6);
			
			if (weekEnd > end) weekEnd.setTime(end.getTime());
			
			const weekData = await UsageStore.getSummaryForRange(weekStart, weekEnd, 'domain');
			const totalTime = weekData.reduce((sum: number, item: any) => sum + item.seconds, 0);
			
			breakdown.push({
				weekNumber,
				startDate: weekStart.toISOString().split('T')[0],
				totalTime,
				focusScore: await this.calculateWeeklyFocusScore(weekStart, weekEnd),
				goalsCompleted: await this.getGoalsCompleted(weekStart, weekEnd)
			});
			
			current.setDate(current.getDate() + 7);
			weekNumber++;
		}
		
		return breakdown;
	}

	private static async generateMilestones(start: Date, end: Date) {
		const { GamificationStore } = await import('../storage/gamificationStore');
		const milestones = [];
		
		try {
			// Get gamification state for milestone tracking
			const state = await GamificationStore.getState();
			
			// Add streak milestones
			if (state.streakDays >= 7) {
				milestones.push({
					date: new Date().toISOString().split('T')[0],
					type: 'streak' as const,
					description: `${state.streakDays}-day streak maintained!`
				});
			}
			
			// Add real achievement milestones
			if (state.points >= 1000) {
				milestones.push({
					date: new Date().toISOString().split('T')[0],
					type: 'achievement' as const,
					description: 'Reached 1000+ focus points!'
				});
			}
			if (state.streakDays >= 7) {
				milestones.push({
					date: new Date().toISOString().split('T')[0],
					type: 'achievement' as const,
					description: `${state.streakDays} day focus streak!`
				});
			}
			
			// Add sample milestones based on date range
			const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
			if (daysDiff >= 30) {
				milestones.push({
					date: start.toISOString().split('T')[0],
					type: 'goal' as const,
					description: 'Monthly usage tracking milestone'
				});
			}
		} catch (error) {
			console.warn('Error generating milestones:', error);
		}
		
		return milestones;
	}

	private static async generateTopDomains(thisStart: Date, thisEnd: Date, lastStart: Date, lastEnd: Date) {
		const { UsageStore } = await import('../storage/usageStore');
		
		const thisMonthData = await UsageStore.getSummaryForRange(thisStart, thisEnd, 'domain');
		const lastMonthData = await UsageStore.getSummaryForRange(lastStart, lastEnd, 'domain');
		
		// Create maps for easier lookup
		const lastMonthMap = new Map(lastMonthData.map((item: any) => [item.key, item.seconds]));
		
		const sortedData = thisMonthData
			.sort((a: any, b: any) => b.seconds - a.seconds)
			.slice(0, 10);
		
		return Promise.all(sortedData.map(async (item: any, index: number) => {
			const lastMonthTime = lastMonthMap.get(item.key) || 0;
			const changeFromLastMonth = lastMonthTime > 0 
				? Math.round(((item.seconds - lastMonthTime) / lastMonthTime) * 100)
				: 100; // 100% if new domain
			
			return {
				domain: item.key,
				category: await this.getCategoryForDomain(item.key),
				totalTime: item.seconds,
				changeFromLastMonth,
				rank: index + 1
			};
		}));
	}

	// Utility function to create preset filters
	static createPresetFilter(preset: 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month'): AnalyticsFilter {
		const now = new Date();
		let start: Date, end: Date;
		
		switch (preset) {
			case 'today':
				start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
				end = new Date(start);
				end.setDate(start.getDate() + 1);
				break;
			case 'yesterday':
				start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
				end = new Date(start);
				end.setDate(start.getDate() + 1);
				break;
			case 'this_week':
				start = new Date(now);
				start.setDate(now.getDate() - now.getDay());
				start.setHours(0, 0, 0, 0);
				end = new Date(start);
				end.setDate(start.getDate() + 7);
				break;
			case 'last_week':
				start = new Date(now);
				start.setDate(now.getDate() - now.getDay() - 7);
				start.setHours(0, 0, 0, 0);
				end = new Date(start);
				end.setDate(start.getDate() + 7);
				break;
			case 'this_month':
				start = new Date(now.getFullYear(), now.getMonth(), 1);
				end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
				break;
			case 'last_month':
				start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
				end = new Date(now.getFullYear(), now.getMonth(), 0);
				break;
			default:
				start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
				end = new Date(start);
				end.setDate(start.getDate() + 1);
		}
		
		return {
			dateRange: { start, end, preset },
			categories: [],
			domains: [],
			timeOfDay: null,
			dayOfWeek: [],
			minDuration: 0,
			maxDuration: 0,
			searchTerm: '',
			groupBy: 'day',
			sortBy: 'time',
			sortOrder: 'desc'
		};
	}
}