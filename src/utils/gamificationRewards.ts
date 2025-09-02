export interface Milestone {
	id: string;
	type: 'streak' | 'points' | 'level' | 'usage' | 'blocks' | 'focus';
	threshold: number;
	title: string;
	description: string;
	reward: {
		points: number;
		badge?: string;
		unlock?: string;
	};
	icon: string;
	rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface DailyChallenge {
	id: string;
	title: string;
	description: string;
	target: number;
	current: number;
	reward: number;
	expiresAt: Date;
	completed: boolean;
	icon: string;
}

export interface RewardMultiplier {
	type: 'streak' | 'weekend' | 'consistency' | 'performance';
	value: number;
	description: string;
	active: boolean;
}

// Milestone definitions
export const MILESTONES: Milestone[] = [
	// Streak milestones
	{
		id: 'streak_3',
		type: 'streak',
		threshold: 3,
		title: 'Getting Started',
		description: 'Maintain a 3-day streak',
		reward: { points: 50, badge: 'starter' },
		icon: 'flame',
		rarity: 'common'
	},
	{
		id: 'streak_7',
		type: 'streak',
		threshold: 7,
		title: 'Week Warrior',
		description: 'Maintain a 7-day streak',
		reward: { points: 150, badge: 'week_warrior' },
		icon: 'flame',
		rarity: 'common'
	},
	{
		id: 'streak_30',
		type: 'streak',
		threshold: 30,
		title: 'Monthly Master',
		description: 'Maintain a 30-day streak',
		reward: { points: 500, badge: 'monthly_master' },
		icon: 'flame',
		rarity: 'rare'
	},
	{
		id: 'streak_100',
		type: 'streak',
		threshold: 100,
		title: 'Century Champion',
		description: 'Maintain a 100-day streak',
		reward: { points: 2000, badge: 'century_champion' },
		icon: 'crown',
		rarity: 'epic'
	},
	{
		id: 'streak_365',
		type: 'streak',
		threshold: 365,
		title: 'Year of Focus',
		description: 'Maintain a 365-day streak',
		reward: { points: 10000, badge: 'year_master' },
		icon: 'crown',
		rarity: 'legendary'
	},
	
	// Points milestones
	{
		id: 'points_100',
		type: 'points',
		threshold: 100,
		title: 'First Century',
		description: 'Earn 100 total points',
		reward: { points: 25, badge: 'points_starter' },
		icon: 'zap',
		rarity: 'common'
	},
	{
		id: 'points_500',
		type: 'points',
		threshold: 500,
		title: 'Point Collector',
		description: 'Earn 500 total points',
		reward: { points: 100, badge: 'point_collector' },
		icon: 'zap',
		rarity: 'common'
	},
	{
		id: 'points_1000',
		type: 'points',
		threshold: 1000,
		title: 'Thousand Club',
		description: 'Earn 1,000 total points',
		reward: { points: 250, badge: 'thousand_club' },
		icon: 'trophy',
		rarity: 'rare'
	},
	{
		id: 'points_5000',
		type: 'points',
		threshold: 5000,
		title: 'Point Master',
		description: 'Earn 5,000 total points',
		reward: { points: 1000, badge: 'point_master' },
		icon: 'trophy',
		rarity: 'epic'
	},
	{
		id: 'points_10000',
		type: 'points',
		threshold: 10000,
		title: 'Point Legend',
		description: 'Earn 10,000 total points',
		reward: { points: 2500, badge: 'point_legend' },
		icon: 'medal',
		rarity: 'legendary'
	},
	
	// Level milestones
	{
		id: 'level_5',
		type: 'level',
		threshold: 5,
		title: 'Rising Star',
		description: 'Reach level 5',
		reward: { points: 100, badge: 'rising_star' },
		icon: 'star',
		rarity: 'common'
	},
	{
		id: 'level_10',
		type: 'level',
		threshold: 10,
		title: 'Double Digits',
		description: 'Reach level 10',
		reward: { points: 300, badge: 'double_digits' },
		icon: 'star',
		rarity: 'rare'
	},
	{
		id: 'level_25',
		type: 'level',
		threshold: 25,
		title: 'Quarter Master',
		description: 'Reach level 25',
		reward: { points: 1000, badge: 'quarter_master' },
		icon: 'award',
		rarity: 'epic'
	},
	{
		id: 'level_50',
		type: 'level',
		threshold: 50,
		title: 'Half Century',
		description: 'Reach level 50',
		reward: { points: 3000, badge: 'half_century' },
		icon: 'crown',
		rarity: 'legendary'
	},
	
	// Blocks milestones
	{
		id: 'blocks_10',
		type: 'blocks',
		threshold: 10,
		title: 'Distraction Fighter',
		description: 'Block 10 distracting sites',
		reward: { points: 50, badge: 'blocker_beginner' },
		icon: 'shield',
		rarity: 'common'
	},
	{
		id: 'blocks_50',
		type: 'blocks',
		threshold: 50,
		title: 'Focus Guardian',
		description: 'Block 50 distracting sites',
		reward: { points: 200, badge: 'focus_guardian' },
		icon: 'shield',
		rarity: 'rare'
	},
	{
		id: 'blocks_100',
		type: 'blocks',
		threshold: 100,
		title: 'Distraction Destroyer',
		description: 'Block 100 distracting sites',
		reward: { points: 500, badge: 'distraction_destroyer' },
		icon: 'shield',
		rarity: 'epic'
	},
	
	// Focus time milestones (in minutes)
	{
		id: 'focus_60',
		type: 'focus',
		threshold: 60,
		title: 'Hour of Power',
		description: 'Focus for 60 minutes in a day',
		reward: { points: 75, badge: 'hour_power' },
		icon: 'target',
		rarity: 'common'
	},
	{
		id: 'focus_120',
		type: 'focus',
		threshold: 120,
		title: 'Deep Work',
		description: 'Focus for 120 minutes in a day',
		reward: { points: 150, badge: 'deep_work' },
		icon: 'target',
		rarity: 'rare'
	},
	{
		id: 'focus_240',
		type: 'focus',
		threshold: 240,
		title: 'Focus Master',
		description: 'Focus for 240 minutes in a day',
		reward: { points: 400, badge: 'focus_master' },
		icon: 'target',
		rarity: 'epic'
	}
];

// Calculate rewards with multipliers
export function calculateReward(
	baseReward: number,
	multipliers: RewardMultiplier[]
): { total: number; breakdown: { base: number; multipliers: Array<{ type: string; bonus: number }> } } {
	const activeMultipliers = multipliers.filter(m => m.active);
	let total = baseReward;
	const breakdown = {
		base: baseReward,
		multipliers: [] as Array<{ type: string; bonus: number }>
	};

	activeMultipliers.forEach(multiplier => {
		const bonus = Math.floor(baseReward * (multiplier.value - 1));
		total += bonus;
		breakdown.multipliers.push({
			type: multiplier.type,
			bonus
		});
	});

	return { total, breakdown };
}

// Check for milestone achievements
export function checkMilestones(
	type: Milestone['type'],
	value: number,
	achievedMilestones: string[]
): Milestone[] {
	return MILESTONES.filter(milestone => 
		milestone.type === type &&
		milestone.threshold <= value &&
		!achievedMilestones.includes(milestone.id)
	);
}

// Generate daily challenges
export function generateDailyChallenge(): DailyChallenge {
	const challenges = [
		{
			title: 'Focus Sprint',
			description: 'Complete 3 focused work sessions',
			target: 3,
			reward: 50,
			icon: 'target'
		},
		{
			title: 'Distraction Blocker',
			description: 'Block 5 distracting websites',
			target: 5,
			reward: 40,
			icon: 'shield'
		},
		{
			title: 'Deep Focus',
			description: 'Maintain focus for 60 minutes total',
			target: 60,
			reward: 60,
			icon: 'flame'
		},
		{
			title: 'Early Bird',
			description: 'Start your first focus session before 9 AM',
			target: 1,
			reward: 30,
			icon: 'star'
		},
		{
			title: 'Consistency King',
			description: 'Complete 5 tasks today',
			target: 5,
			reward: 70,
			icon: 'crown'
		}
	];

	const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	tomorrow.setHours(0, 0, 0, 0);

	return {
		id: `daily_${Date.now()}`,
		...randomChallenge,
		current: 0,
		completed: false,
		expiresAt: tomorrow
	};
}

// Get active multipliers based on current state
export function getActiveMultipliers(
	streakDays: number,
	isWeekend: boolean,
	consistencyScore: number,
	performanceScore: number
): RewardMultiplier[] {
	const multipliers: RewardMultiplier[] = [];

	// Streak multiplier
	if (streakDays >= 7) {
		multipliers.push({
			type: 'streak',
			value: 1 + Math.min(streakDays / 100, 0.5), // Up to 50% bonus
			description: `${streakDays}-day streak bonus`,
			active: true
		});
	}

	// Weekend warrior
	if (isWeekend) {
		multipliers.push({
			type: 'weekend',
			value: 1.25,
			description: 'Weekend warrior bonus',
			active: true
		});
	}

	// Consistency bonus
	if (consistencyScore >= 80) {
		multipliers.push({
			type: 'consistency',
			value: 1.2,
			description: 'High consistency bonus',
			active: true
		});
	}

	// Performance bonus
	if (performanceScore >= 90) {
		multipliers.push({
			type: 'performance',
			value: 1.3,
			description: 'Outstanding performance bonus',
			active: true
		});
	}

	return multipliers;
}

// Calculate level from experience
export function calculateLevel(experience: number): {
	level: number;
	currentLevelExp: number;
	nextLevelExp: number;
	progress: number;
} {
	// Progressive level scaling
	let level = 1;
	let totalExpNeeded = 0;
	let expForCurrentLevel = 100;

	while (totalExpNeeded + expForCurrentLevel <= experience) {
		totalExpNeeded += expForCurrentLevel;
		level++;
		expForCurrentLevel = Math.floor(expForCurrentLevel * 1.15); // 15% increase per level
	}

	const currentLevelExp = experience - totalExpNeeded;
	const nextLevelExp = expForCurrentLevel;
	const progress = (currentLevelExp / nextLevelExp) * 100;

	return {
		level,
		currentLevelExp,
		nextLevelExp,
		progress
	};
}

// Get motivational message based on performance
export function getMotivationalMessage(
	streakDays: number,
	level: number,
	recentPerformance: 'improving' | 'stable' | 'declining'
): string {
	const messages = {
		improving: [
			"You're on fire! Keep up the amazing progress! 🔥",
			"Incredible improvement! Your focus is getting stronger! 💪",
			"Outstanding growth! You're becoming a focus master! 🚀"
		],
		stable: [
			"Great consistency! Keep maintaining your focus! ⭐",
			"Solid performance! You're building great habits! 🎯",
			"Nice steady progress! Stay on track! 📈"
		],
		declining: [
			"Don't give up! Every day is a new opportunity! 💫",
			"You've got this! Small steps lead to big changes! 🌟",
			"Keep pushing! Your breakthrough is just ahead! 💎"
		]
	};

	const messageSet = messages[recentPerformance];
	const randomMessage = messageSet[Math.floor(Math.random() * messageSet.length)];

	// Add personalized touches
	if (streakDays > 0) {
		return `${randomMessage} (${streakDays}-day streak!)`;
	}
	if (level >= 10) {
		return `${randomMessage} (Level ${level} champion!)`;
	}

	return randomMessage;
}

export default {
	MILESTONES,
	calculateReward,
	checkMilestones,
	generateDailyChallenge,
	getActiveMultipliers,
	calculateLevel,
	getMotivationalMessage
};
