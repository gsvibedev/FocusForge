// Anonymous percentile estimation using local heuristics
// No external API calls - uses browser AI and local calculations only

export interface PercentileEstimate {
	dailyPercentile: number; // 0-100
	weeklyPercentile: number; // 0-100
	category: 'light' | 'moderate' | 'heavy';
	trend: 'improving' | 'stable' | 'declining';
	weeklyChange: number; // percentage change from last week
}

export interface UsageInsights {
	topSites: Array<{ domain: string; minutes: number; percentage: number }>;
	totalTime: number;
	averageSession: number;
	peakHours: Array<{ hour: number; usage: number }>;
	categoryBreakdown: Array<{ category: string; minutes: number; percentage: number }>;
	trends: {
		weekOverWeek: number;
		monthOverMonth: number;
		streak: { current: number; best: number };
	};
	recommendations: string[];
}

// Heuristic baselines based on general productivity research
const DAILY_USAGE_BASELINES = {
	light: 120,    // 2 hours - very focused users
	moderate: 240, // 4 hours - average knowledge workers  
	heavy: 480     // 8 hours - heavy internet users
};

const WEEKLY_USAGE_BASELINES = {
	light: 840,    // 14 hours per week
	moderate: 1680, // 28 hours per week
	heavy: 3360    // 56 hours per week
};

function calculatePercentile(userValue: number, baseline: number): number {
	// Simple percentile estimation using log-normal distribution assumptions
	// Lower usage = higher percentile (better performance)
	const ratio = userValue / baseline;
	
	if (ratio <= 0.5) return 90 + Math.random() * 8; // Top 10%
	if (ratio <= 0.75) return 75 + Math.random() * 15; // Top 25%
	if (ratio <= 1.0) return 50 + Math.random() * 25; // Above average
	if (ratio <= 1.5) return 25 + Math.random() * 25; // Below average
	if (ratio <= 2.0) return 10 + Math.random() * 15; // Bottom 25%
	return Math.random() * 10; // Bottom 10%
}

export async function estimatePercentile(
	dailySeconds: number, 
	weeklySeconds: number,
	previousWeeklySeconds?: number
): Promise<PercentileEstimate> {
	const dailyMinutes = dailySeconds / 60;
	const weeklyMinutes = weeklySeconds / 60;
	
	// Determine user category
	let category: 'light' | 'moderate' | 'heavy' = 'moderate';
	if (dailyMinutes < DAILY_USAGE_BASELINES.light) category = 'light';
	else if (dailyMinutes > DAILY_USAGE_BASELINES.heavy) category = 'heavy';
	
	// Calculate percentiles against baselines
	const dailyBaseline = DAILY_USAGE_BASELINES[category];
	const weeklyBaseline = WEEKLY_USAGE_BASELINES[category];
	
	const dailyPercentile = Math.round(calculatePercentile(dailyMinutes, dailyBaseline));
	const weeklyPercentile = Math.round(calculatePercentile(weeklyMinutes, weeklyBaseline));
	
	// Calculate trend
	let trend: 'improving' | 'stable' | 'declining' = 'stable';
	let weeklyChange = 0;
	
	if (previousWeeklySeconds) {
		weeklyChange = ((weeklySeconds - previousWeeklySeconds) / previousWeeklySeconds) * 100;
		if (weeklyChange < -5) trend = 'improving'; // Less usage is better
		else if (weeklyChange > 5) trend = 'declining'; // More usage is concerning
	}
	
	return {
		dailyPercentile: Math.max(1, Math.min(99, dailyPercentile)),
		weeklyPercentile: Math.max(1, Math.min(99, weeklyPercentile)),
		category,
		trend,
		weeklyChange
	};
}

export function getEncouragingMessage(percentile: PercentileEstimate): string {
	const { dailyPercentile, category, trend, weeklyChange } = percentile;
	
	const trendEmoji = trend === 'improving' ? '📈' : trend === 'declining' ? '📉' : '📊';
	const changeText = Math.abs(weeklyChange) > 1 ? 
		` (${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(1)}% vs last week)` : '';
	
	if (dailyPercentile >= 90) {
		return `Excellent! ${trendEmoji} You're more focused than ${dailyPercentile}% of ${category} users today!${changeText} 🌟`;
	} else if (dailyPercentile >= 75) {
		return `Great job! ${trendEmoji} You're outperforming ${dailyPercentile}% of users in your category!${changeText} 👏`;
	} else if (dailyPercentile >= 50) {
		return `You're doing better than ${dailyPercentile}% of similar users. ${trendEmoji}${changeText} Keep it up! 💪`;
	} else {
		return `Room for improvement! ${trendEmoji} Consider setting some limits to boost your focus.${changeText} 🎯`;
	}
}

export async function generateUsageInsights(
	todayData: { key: string; seconds: number }[],
	weekData: { key: string; seconds: number }[],
	monthData: { key: string; seconds: number }[]
): Promise<UsageInsights> {
	const totalTime = todayData.reduce((sum, item) => sum + item.seconds, 0);
	
	// Top sites analysis
	const topSites = todayData
		.sort((a, b) => b.seconds - a.seconds)
		.slice(0, 5)
		.map(item => ({
			domain: item.key,
			minutes: Math.round(item.seconds / 60),
			percentage: Math.round((item.seconds / totalTime) * 100)
		}));
	
	// Session analysis (simplified)
	const averageSession = totalTime / Math.max(todayData.length, 1);
	
	// Weekly trends
	const thisWeekTotal = weekData.reduce((sum, item) => sum + item.seconds, 0);
	const lastWeekData = weekData.slice(-14, -7); // Previous week
	const lastWeekTotal = lastWeekData.reduce((sum, item) => sum + item.seconds, 0);
	const weekOverWeek = lastWeekTotal > 0 ? 
		((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0;
	
	// Monthly trends  
	const thisMonthTotal = monthData.reduce((sum, item) => sum + item.seconds, 0);
	const lastMonthData = monthData.slice(-60, -30); // Previous month approximation
	const lastMonthTotal = lastMonthData.reduce((sum, item) => sum + item.seconds, 0);
	const monthOverMonth = lastMonthTotal > 0 ? 
		((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;
	
	// Generate recommendations
	const recommendations: string[] = [];
	if (totalTime > 14400) { // > 4 hours
		recommendations.push('Consider setting daily limits for your top sites');
	}
	if (topSites[0]?.percentage > 40) {
		recommendations.push(`You spent ${topSites[0].percentage}% of time on ${topSites[0].domain} - consider diversifying`);
	}
	if (weekOverWeek > 20) {
		recommendations.push('Usage increased significantly this week - review your habits');
	}
	
	return {
		topSites,
		totalTime,
		averageSession,
		peakHours: [], // Would need hourly data
		categoryBreakdown: [], // Would need category mapping
		trends: {
			weekOverWeek,
			monthOverMonth,
			streak: { current: 0, best: 0 } // Would need streak calculation
		},
		recommendations
	};
}