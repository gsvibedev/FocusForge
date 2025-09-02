import { useState, useEffect, useCallback } from 'react';
import { 
	calculateLevel, 
	checkMilestones, 
	getActiveMultipliers,
	calculateReward,
	generateDailyChallenge,
	getMotivationalMessage
} from '../utils/gamificationRewards';

export interface GamificationState {
	points: number;
	experience: number;
	level: number;
	streakDays: number;
	achievements: Array<{
		id: string;
		title: string;
		description: string;
		icon?: string;
		reward?: number;
		unlocked: boolean;
		unlockedAt?: Date;
		progress?: number;
		maxProgress?: number;
		rarity?: 'common' | 'rare' | 'epic' | 'legendary';
	}>;
	milestones: string[];
	dailyChallenge: any;
	multipliers: any[];
	toastMessage: any;
	modalData: any;
	stats: {
		totalBlocks: number;
		totalFocusMinutes: number;
		bestStreak: number;
		totalDaysUsed: number;
	};
}

export function useEnhancedGamification() {
	const [state, setState] = useState<GamificationState>(() => {
		// Load from storage or initialize
		const saved = localStorage.getItem('gamificationState');
		if (saved) {
			return JSON.parse(saved);
		}
		
		return {
			points: 0,
			experience: 0,
			level: 1,
			streakDays: 0,
			achievements: [],
			milestones: [],
			dailyChallenge: generateDailyChallenge(),
			multipliers: [],
			toastMessage: null,
			modalData: null,
			stats: {
				totalBlocks: 0,
				totalFocusMinutes: 0,
				bestStreak: 0,
				totalDaysUsed: 0
			}
		};
	});

	// Save state to storage
	useEffect(() => {
		localStorage.setItem('gamificationState', JSON.stringify(state));
	}, [state]);

	// Calculate user consistency score based on recent activity
	const calculateConsistencyScore = useCallback((): number => {
		// Base score on streak days and recent activity
		const baseScore = Math.min(state.streakDays * 5, 50); // Max 50 from streaks
		const levelBonus = Math.min(state.level * 2, 35); // Max 35 from level
		const activityBonus = 15; // Base activity bonus
		return Math.min(baseScore + levelBonus + activityBonus, 100);
	}, [state.streakDays, state.level]);

	// Calculate user performance score based on achievements and efficiency
	const calculatePerformanceScore = useCallback((): number => {
		// Base score on level progression and achievements
		const levelScore = Math.min(state.level * 3, 60); // Max 60 from level
		const achievementBonus = Math.min(Object.keys(state.achievements).length * 2, 25); // Max 25 from achievements
		const basePerformance = 15; // Base performance
		return Math.min(levelScore + achievementBonus + basePerformance, 100);
	}, [state.level, state.achievements]);

	// Award points with multipliers
	const awardPoints = useCallback((basePoints: number, reason: string) => {
		const isWeekend = [0, 6].includes(new Date().getDay());
		const multipliers = getActiveMultipliers(
			state.streakDays,
			isWeekend,
			calculateConsistencyScore(),
			calculatePerformanceScore()
		);

		const { total, breakdown } = calculateReward(basePoints, multipliers);
		
		setState(prev => {
			const newExperience = prev.experience + total;
			const levelInfo = calculateLevel(newExperience);
			
			// Check for level up
			const leveledUp = levelInfo.level > prev.level;
			
			// Check for new milestones
			const newMilestones = checkMilestones('points', prev.points + total, prev.milestones);
			
			return {
				...prev,
				points: prev.points + total,
				experience: newExperience,
				level: levelInfo.level,
				toastMessage: {
					id: Date.now().toString(),
					type: 'points',
					title: reason,
					value: total,
					subtitle: breakdown.multipliers.length > 0 
						? `+${breakdown.multipliers.reduce((sum, m) => sum + m.bonus, 0)} bonus!`
						: undefined
				},
				modalData: leveledUp ? {
					type: 'levelup',
					oldLevel: prev.level,
					newLevel: levelInfo.level,
					experienceGained: total
				} : null,
				milestones: [...prev.milestones, ...newMilestones.map(m => m.id)]
			};
		});
	}, [state.streakDays, calculateConsistencyScore, calculatePerformanceScore]);

	// Update streak
	const updateStreak = useCallback((increment: boolean = true) => {
		setState(prev => {
			const newStreak = increment ? prev.streakDays + 1 : 0;
			const newBestStreak = Math.max(newStreak, prev.stats.bestStreak);
			
			// Check for streak milestones
			const newMilestones = checkMilestones('streak', newStreak, prev.milestones);
			
			return {
				...prev,
				streakDays: newStreak,
				stats: {
					...prev.stats,
					bestStreak: newBestStreak
				},
				milestones: [...prev.milestones, ...newMilestones.map(m => m.id)]
			};
		});
	}, []);

	// Track site block
	const trackBlock = useCallback(() => {
		setState(prev => {
			const newTotalBlocks = prev.stats.totalBlocks + 1;
			
			// Check for block milestones
			const newMilestones = checkMilestones('blocks', newTotalBlocks, prev.milestones);
			
			// Award points for blocking
			awardPoints(10, 'Site blocked');
			
			return {
				...prev,
				stats: {
					...prev.stats,
					totalBlocks: newTotalBlocks
				},
				milestones: [...prev.milestones, ...newMilestones.map(m => m.id)]
			};
		});
	}, [awardPoints]);

	// Track focus time
	const trackFocusTime = useCallback((minutes: number) => {
		setState(prev => {
			const newTotalFocus = prev.stats.totalFocusMinutes + minutes;
			
			// Check for focus milestones
			const newMilestones = checkMilestones('focus', minutes, prev.milestones);
			
			// Award points based on focus duration
			const pointsEarned = Math.floor(minutes * 1.5);
			awardPoints(pointsEarned, `${minutes} minutes of focus`);
			
			// Update daily challenge progress if applicable
			let updatedChallenge = { ...prev.dailyChallenge };
			if (prev.dailyChallenge && prev.dailyChallenge.title === 'Deep Focus') {
				updatedChallenge.current = Math.min(
					updatedChallenge.current + minutes,
					updatedChallenge.target
				);
				updatedChallenge.completed = updatedChallenge.current >= updatedChallenge.target;
				
				if (updatedChallenge.completed && !prev.dailyChallenge.completed) {
					awardPoints(updatedChallenge.reward, 'Daily challenge completed!');
				}
			}
			
			return {
				...prev,
				stats: {
					...prev.stats,
					totalFocusMinutes: newTotalFocus
				},
				dailyChallenge: updatedChallenge,
				milestones: [...prev.milestones, ...newMilestones.map(m => m.id)]
			};
		});
	}, [awardPoints]);

	// Unlock achievement
	const unlockAchievement = useCallback((achievementId: string) => {
		setState(prev => {
			const achievement = prev.achievements.find(a => a.id === achievementId);
			if (!achievement || achievement.unlocked) return prev;
			
			const updatedAchievements = prev.achievements.map(a =>
				a.id === achievementId
					? { ...a, unlocked: true, unlockedAt: new Date() }
					: a
			);
			
			// Award achievement points
			if (achievement.reward) {
				awardPoints(achievement.reward, `Achievement: ${achievement.title}`);
			}
			
			return {
				...prev,
				achievements: updatedAchievements,
				modalData: {
					type: 'achievement',
					achievements: [achievement]
				}
			};
		});
	}, [awardPoints]);

	// Generate new daily challenge
	const refreshDailyChallenge = useCallback(() => {
		setState(prev => ({
			...prev,
			dailyChallenge: generateDailyChallenge()
		}));
	}, []);

	// Clear toast message
	const clearToast = useCallback(() => {
		setState(prev => ({
			...prev,
			toastMessage: null
		}));
	}, []);

	// Clear modal
	const clearModal = useCallback(() => {
		setState(prev => ({
			...prev,
			modalData: null
		}));
	}, []);

	// Get motivational message
	const getMotivation = useCallback(() => {
		const recentPerformance = state.streakDays > 3 ? 'improving' : 
								   state.streakDays > 0 ? 'stable' : 'declining';
		return getMotivationalMessage(state.streakDays, state.level, recentPerformance);
	}, [state.streakDays, state.level]);

	// Calculate progress percentages
	const getProgress = useCallback(() => {
		const levelInfo = calculateLevel(state.experience);
		const achievementsUnlocked = state.achievements.filter(a => a.unlocked).length;
		const achievementsTotal = state.achievements.length;
		const achievementsProgress = achievementsTotal > 0 
			? (achievementsUnlocked / achievementsTotal) * 100 
			: 0;
			
		return {
			level: levelInfo,
			achievements: {
				unlocked: achievementsUnlocked,
				total: achievementsTotal,
				percentage: achievementsProgress
			},
			dailyChallenge: state.dailyChallenge 
				? (state.dailyChallenge.current / state.dailyChallenge.target) * 100
				: 0
		};
	}, [state]);

	return {
		state,
		actions: {
			awardPoints,
			updateStreak,
			trackBlock,
			trackFocusTime,
			unlockAchievement,
			refreshDailyChallenge,
			clearToast,
			clearModal,
			getMotivation,
			getProgress
		}
	};
}

export default useEnhancedGamification;
