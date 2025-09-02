import { LimitsStore } from './limitsStore';
import { UsageStore } from './usageStore';
import { formatDateKey } from '../utils/time';

export interface Achievement {
	id: string;
	name: string;
	description: string;
	icon: string;
	rarity: 'common' | 'rare' | 'epic' | 'legendary';
	category: 'streak' | 'usage' | 'goal' | 'behavior' | 'milestone' | 'special';
	condition: {
		type: 'streak' | 'total_points' | 'usage_reduction' | 'goal_completion' | 'pattern_break' | 'time_saved';
		value: number;
		period?: 'daily' | 'weekly' | 'monthly';
		target?: string; // domain or category
	};
	rewards: {
		points: number;
		title?: string;
		badge?: string;
	};
	unlockedAt?: Date;
	progress?: number; // 0-100
}

export interface UserStats {
	totalTimeTracked: number; // seconds
	totalTimeSaved: number; // seconds saved from limits
	longestStreak: number;
	currentStreak: number;
	goalsCompleted: number;
	limitsRespected: number;
	favoriteCategory: string;
	mostImprovedCategory: string;
	level: number;
	experience: number;
	nextLevelExp: number;
}

export interface GamificationState {
	points: number;
	streakDays: number; // consecutive days meeting all configured daily limits
	lastEvaluatedDate?: string; // YYYY-MM-DD
	lastModalShown?: string; // YYYY-MM-DD - track when modal was last shown
	bonusApplied?: boolean; // whether user applied recommended changes for current period
	unlockedAchievements: string[]; // achievement IDs
	stats: UserStats;
	level: number;
	experience: number;
}

function difficultyWeight(limitMinutes: number): number {
	// Smaller limits are slightly more valuable. 15 min -> 1.25x, 30 -> 1.1x, 60 -> 1.0x
	if (limitMinutes <= 15) return 1.25;
	if (limitMinutes <= 30) return 1.1;
	return 1.0;
}

async function getState(): Promise<GamificationState> {
	const v = await chrome.storage.local.get('gamification');
	const defaultStats: UserStats = {
		totalTimeTracked: 0,
		totalTimeSaved: 0,
		longestStreak: 0,
		currentStreak: 0,
		goalsCompleted: 0,
		limitsRespected: 0,
		favoriteCategory: '',
		mostImprovedCategory: '',
		level: 1,
		experience: 0,
		nextLevelExp: 100
	};
	return (v['gamification'] as GamificationState) ?? { 
		points: 0, 
		streakDays: 0, 
		unlockedAchievements: [], 
		stats: defaultStats,
		level: 1,
		experience: 0
	};
}

function getAchievementDefinitions(): Achievement[] {
	return [
		// Streak Achievements
		{
			id: 'first_streak',
			name: 'Getting Started',
			description: 'Complete your first day within limits',
			icon: '🌱',
			rarity: 'common',
			category: 'streak',
			condition: { type: 'streak', value: 1 },
			rewards: { points: 50, title: 'Digital Wellness Beginner' }
		},
		{
			id: 'week_warrior',
			name: 'Week Warrior',
			description: 'Maintain a 7-day streak',
			icon: '⚔️',
			rarity: 'rare',
			category: 'streak',
			condition: { type: 'streak', value: 7 },
			rewards: { points: 200, title: 'Consistency Champion' }
		},
		{
			id: 'month_master',
			name: 'Month Master',
			description: 'Achieve a 30-day streak',
			icon: '👑',
			rarity: 'epic',
			category: 'streak',
			condition: { type: 'streak', value: 30 },
			rewards: { points: 1000, title: 'Habit Master', badge: 'month_crown' }
		},
		{
			id: 'legendary_streak',
			name: 'Digital Zen Master',
			description: 'Maintain a 100-day streak',
			icon: '🧘',
			rarity: 'legendary',
			category: 'streak',
			condition: { type: 'streak', value: 100 },
			rewards: { points: 5000, title: 'Zen Master', badge: 'zen_master' }
		},
		
		// Usage Achievements
		{
			id: 'time_saver',
			name: 'Time Saver',
			description: 'Save 1 hour through smart limits',
			icon: '⏰',
			rarity: 'common',
			category: 'usage',
			condition: { type: 'time_saved', value: 3600 },
			rewards: { points: 100 }
		},
		{
			id: 'digital_minimalist',
			name: 'Digital Minimalist',
			description: 'Reduce usage by 50% in any category',
			icon: '📱',
			rarity: 'rare',
			category: 'usage',
			condition: { type: 'usage_reduction', value: 50 },
			rewards: { points: 300, title: 'Minimalist' }
		},
		{
			id: 'social_media_freedom',
			name: 'Social Media Freedom',
			description: 'Go a full week under social media limits',
			icon: '🆓',
			rarity: 'epic',
			category: 'behavior',
			condition: { type: 'pattern_break', value: 7, target: 'Social' },
			rewards: { points: 500, title: 'Social Freedom Fighter' }
		},
		
		// Goal Achievements
		{
			id: 'goal_getter',
			name: 'Goal Getter',
			description: 'Complete your first goal',
			icon: '🎯',
			rarity: 'common',
			category: 'goal',
			condition: { type: 'goal_completion', value: 1 },
			rewards: { points: 150 }
		},
		{
			id: 'goal_crusher',
			name: 'Goal Crusher',
			description: 'Complete 5 goals',
			icon: '💪',
			rarity: 'rare',
			category: 'goal',
			condition: { type: 'goal_completion', value: 5 },
			rewards: { points: 750, title: 'Achievement Hunter' }
		},
		
		// Milestone Achievements
		{
			id: 'point_collector',
			name: 'Point Collector',
			description: 'Earn your first 1,000 points',
			icon: '💎',
			rarity: 'rare',
			category: 'milestone',
			condition: { type: 'total_points', value: 1000 },
			rewards: { points: 200, title: 'Collector' }
		},
		{
			id: 'elite_member',
			name: 'Elite Member',
			description: 'Reach 10,000 total points',
			icon: '🏆',
			rarity: 'epic',
			category: 'milestone',
			condition: { type: 'total_points', value: 10000 },
			rewards: { points: 1000, title: 'Elite Member', badge: 'elite_trophy' }
		},
		{
			id: 'legend',
			name: 'Living Legend',
			description: 'Achieve 50,000 total points',
			icon: '⭐',
			rarity: 'legendary',
			category: 'milestone',
			condition: { type: 'total_points', value: 50000 },
			rewards: { points: 5000, title: 'Living Legend', badge: 'legend_star' }
		},
		
		// Special Achievements
		{
			id: 'early_adopter',
			name: 'Early Adopter',
			description: 'One of the first to embrace digital wellness',
			icon: '🚀',
			rarity: 'legendary',
			category: 'special',
			condition: { type: 'total_points', value: 1 },
			rewards: { points: 100, title: 'Pioneer', badge: 'pioneer_rocket' }
		},
		{
			id: 'perfectionist',
			name: 'Perfectionist',
			description: 'Complete a full month without exceeding any limits',
			icon: '💯',
			rarity: 'legendary',
			category: 'behavior',
			condition: { type: 'streak', value: 30 },
			rewards: { points: 3000, title: 'Perfectionist', badge: 'perfect_100' }
		}
	];
}

async function checkAchievements(state: GamificationState): Promise<Achievement[]> {
	const definitions = getAchievementDefinitions();
	const newAchievements: Achievement[] = [];
	
	for (const achievement of definitions) {
		if (state.unlockedAchievements.includes(achievement.id)) continue;
		
		let unlocked = false;
		
		switch (achievement.condition.type) {
			case 'streak':
				unlocked = state.streakDays >= achievement.condition.value;
				break;
			case 'total_points':
				unlocked = state.points >= achievement.condition.value;
				break;
			case 'goal_completion':
				unlocked = state.stats.goalsCompleted >= achievement.condition.value;
				break;
			case 'time_saved':
				unlocked = state.stats.totalTimeSaved >= achievement.condition.value;
				break;
			// Add more condition checks as needed
		}
		
		if (unlocked) {
			achievement.unlockedAt = new Date();
			newAchievements.push(achievement);
			state.unlockedAchievements.push(achievement.id);
			state.points += achievement.rewards.points;
		}
	}
	
	return newAchievements;
}

function calculateLevel(experience: number): { level: number; nextLevelExp: number; currentLevelStartExp: number } {
	// Progressive leveling system: level 1-10 = 100 exp each, 11-20 = 200 each, etc.
	let level = 1;
	let totalExpNeeded = 0;
	let expForNextLevel = 100;
	
	while (totalExpNeeded + expForNextLevel <= experience) {
		totalExpNeeded += expForNextLevel;
		level++;
		
		// Increase exp requirement every 10 levels
		if (level % 10 === 1) {
			expForNextLevel += 100;
		}
	}
	
	return { level, nextLevelExp: totalExpNeeded + expForNextLevel, currentLevelStartExp: totalExpNeeded };
}

async function setState(state: GamificationState): Promise<void> {
	await chrome.storage.local.set({ gamification: state });
}

async function evaluateDaily(now: Date): Promise<{ awarded: number; messages: string[] }> {
	const messages: string[] = [];
	const limits = await LimitsStore.getAllLimits();
	if (limits.length === 0) return { awarded: 0, messages };
	const usageByDomain = await UsageStore.getSummaryForDate(now, 'domain');
	const usageMap = new Map<string, number>(usageByDomain.map((r: any) => [r.key, r.seconds]));

	let awarded = 0;
	let allMet = true;
	for (const limit of limits.filter((l) => l.timeframe === 'daily')) {
		const seconds = limit.targetType === 'site' ? (usageMap.get(limit.targetId) ?? 0) : 0; // simplistic; category reward handled weekly
		const met = seconds < limit.limitMinutes * 60;
		if (met) {
			awarded += Math.round(10 * difficultyWeight(limit.limitMinutes));
		} else {
			allMet = false;
		}
	}
	if (allMet) messages.push('Great job! You stayed within all your daily limits.');
	return { awarded, messages };
}

async function evaluateWeekly(now: Date): Promise<{ awarded: number; messages: string[] }> {
	const messages: string[] = [];
	const limits = await LimitsStore.getAllLimits();
	if (limits.length === 0) return { awarded: 0, messages };
	// compute this week start (Sunday)
	const start = new Date(now);
	start.setDate(now.getDate() - now.getDay());
	start.setHours(0, 0, 0, 0);
	const usageDomain = await UsageStore.getSummaryForRange(start, now, 'domain');
	const usageCategory = await UsageStore.getSummaryForRange(start, now, 'category');
	const domainMap = new Map<string, number>(usageDomain.map((r: any) => [r.key, r.seconds]));
	const categoryMap = new Map<string, number>(usageCategory.map((r: any) => [r.key, r.seconds]));

	let awarded = 0;
	let allMet = true;
	for (const limit of limits.filter((l) => l.timeframe === 'weekly')) {
		const seconds = limit.targetType === 'site' ? (domainMap.get(limit.targetId) ?? 0) : (categoryMap.get(limit.targetId) ?? 0);
		const met = seconds < limit.limitMinutes * 60;
		if (met) {
			awarded += Math.round(30 * difficultyWeight(limit.limitMinutes)); // weekly worth more
		} else {
			allMet = false;
		}
	}
	if (allMet) messages.push("You're crushing it this week! All weekly limits respected.");
	return { awarded, messages };
}

export const GamificationStore = {
		async evaluateAndAward(): Promise<{ 
			points: number; 
			messages: string[]; 
			streakDays: number;
			shouldShowModal: boolean;
			recommendedLimits: Array<{ displayName: string; currentMinutes: number; newMinutes: number; id: string }>;
			newAchievements: Achievement[];
			levelUp: boolean;
			levelUpInfo: { previousLevel: number; newLevel: number; experienceGained: number; nextLevelExp: number; currentExp: number; progressPercentage: number } | null;
			stats: UserStats;
		}> {
			const state = await getState();
			const todayKey = formatDateKey(new Date());
			const limits = await LimitsStore.getAllLimits();
			
			// Check if popups are disabled
			const popupsEnabled = await this.getPopupPreference();
			
			// Modal logic: once per day when enabled; special events handled by caller
			const isFirstTimeUser = state.points < 10 && limits.length === 0;
			const shouldShowModal = popupsEnabled && (state.lastModalShown !== todayKey);
			
			// For returning users who already evaluated today, still return current state with modal check
			if (state.lastEvaluatedDate === todayKey && !isFirstTimeUser) {
				return { 
					points: state.points, 
					messages: [], 
					streakDays: state.streakDays,
					shouldShowModal,
					recommendedLimits: [],
					newAchievements: [],
					levelUp: false,
					levelUpInfo: null,
					stats: state.stats
				};
			}

		const now = new Date();
		const { awarded: dailyAward, messages: dailyMsgs } = await evaluateDaily(now);
		const { awarded: weeklyAward, messages: weeklyMsgs } = await evaluateWeekly(now);
		let totalAward = dailyAward + weeklyAward;

		// Apply 20% bonus if user accepted recommended changes
		if (state.bonusApplied) {
			totalAward = Math.round(totalAward * 1.2);
		}

		// Update stats
		const previousLevel = state.level;
		state.experience += totalAward;
		const levelInfo = calculateLevel(state.experience);
		state.level = levelInfo.level;
		state.stats.nextLevelExp = levelInfo.nextLevelExp;
		state.stats.experience = state.experience;
		state.stats.level = state.level;
		
		// Update streak stats
		if (dailyAward > 0) {
			state.streakDays += 1;
			state.stats.currentStreak = state.streakDays;
			state.stats.longestStreak = Math.max(state.stats.longestStreak, state.streakDays);
			state.stats.limitsRespected += 1;
		} else {
			state.streakDays = 0;
			state.stats.currentStreak = 0;
		}

		const newState: GamificationState = {
			...state,
			points: state.points + totalAward,
			lastEvaluatedDate: todayKey
		};
		
		// Check for new achievements
		const newAchievements = await checkAchievements(newState);
		
		await setState(newState);

		// Generate recommended limit reductions
		const recommendedLimits = await generateRecommendedLimits();

		// Enhanced level information for better UI feedback
		const levelUpInfo = newState.level > previousLevel ? {
			previousLevel,
			newLevel: newState.level,
			experienceGained: totalAward,
			nextLevelExp: levelInfo.nextLevelExp,
			currentExp: state.experience,
			progressPercentage: Math.round(((state.experience - levelInfo.currentLevelStartExp) / (levelInfo.nextLevelExp - levelInfo.currentLevelStartExp)) * 100)
		} : null;

		return { 
			points: newState.points, 
			messages: [...dailyMsgs, ...weeklyMsgs],
			streakDays: newState.streakDays,
			shouldShowModal,
			recommendedLimits,
			newAchievements,
			levelUp: newState.level > previousLevel,
			levelUpInfo,
			stats: newState.stats
		};
	},

	async markModalShown(): Promise<void> {
		const state = await getState();
		const todayKey = formatDateKey(new Date());
		await setState({ ...state, lastModalShown: todayKey });
	},

	async applyRecommendedLimits(limits: Array<{ id: string; newMinutes: number }>): Promise<void> {
		const state = await getState();
		// Update limits
		for (const limit of limits) {
			await LimitsStore.updateLimitMinutes(limit.id, limit.newMinutes);
		}
		// Mark bonus as applied
		await setState({ ...state, bonusApplied: true });
	},

	async getState(): Promise<GamificationState> {
		return getState();
	},

	async getAchievements(): Promise<{ unlocked: Achievement[]; available: Achievement[] }> {
		const state = await getState();
		const allAchievements = getAchievementDefinitions();
		
		const unlocked = allAchievements.filter(a => state.unlockedAchievements.includes(a.id));
		const available = allAchievements.filter(a => !state.unlockedAchievements.includes(a.id));
		
		// Calculate progress for available achievements
		available.forEach(achievement => {
			switch (achievement.condition.type) {
				case 'streak':
					achievement.progress = Math.min(100, (state.streakDays / achievement.condition.value) * 100);
					break;
				case 'total_points':
					achievement.progress = Math.min(100, (state.points / achievement.condition.value) * 100);
					break;
				case 'goal_completion':
					achievement.progress = Math.min(100, (state.stats.goalsCompleted / achievement.condition.value) * 100);
					break;
				default:
					achievement.progress = 0;
			}
		});
		
		return { unlocked, available };
	},

	async updateStats(updates: Partial<UserStats>): Promise<void> {
		const state = await getState();
		state.stats = { ...state.stats, ...updates };
		await setState(state);
	},

	async getPopupPreference(): Promise<boolean> {
		const result = await chrome.storage.local.get(['gamificationPopupsEnabled']);
		return result.gamificationPopupsEnabled !== false; // Default to true if not set
	},

	async setPopupPreference(enabled: boolean): Promise<void> {
		await chrome.storage.local.set({ gamificationPopupsEnabled: enabled });
	},

	async disablePopups(): Promise<void> {
		await this.setPopupPreference(false);
	}
};

async function generateRecommendedLimits(): Promise<Array<{ displayName: string; currentMinutes: number; newMinutes: number; id: string }>> {
	const limits = await LimitsStore.getAllLimits();
	const recommendations: Array<{ displayName: string; currentMinutes: number; newMinutes: number; id: string }> = [];
	
	// Only recommend reductions for limits that weren't exceeded
	for (const limit of limits.filter(l => !l.isCurrentlyBlocked && l.limitMinutes >= 15)) {
		const reduction = Math.max(1, Math.round(limit.limitMinutes * 0.02)); // 2% reduction, minimum 1 min
		const newMinutes = limit.limitMinutes - reduction;
		
		recommendations.push({
			id: limit.id,
			displayName: limit.displayName,
			currentMinutes: limit.limitMinutes,
			newMinutes
		});
	}
	
	return recommendations.slice(0, 5); // Max 5 recommendations
}


