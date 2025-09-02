export interface Goal {
	id: string;
	name: string;
	description?: string;
	type: 'usage_limit' | 'usage_target' | 'streak' | 'break_habit' | 'build_habit';
	target: {
		value: number; // Target value (minutes, days, etc.)
		period: 'daily' | 'weekly' | 'monthly' | 'yearly';
		domain?: string; // Specific domain
		category?: string; // Specific category
	};
	current: {
		value: number;
		streak: number;
		lastUpdated: Date;
		history: { date: string; value: number }[];
	};
	rewards: {
		milestone: number; // At what percentage to reward (25, 50, 75, 100)
		message: string;
		achieved: boolean;
		achievedAt?: Date;
	}[];
	startDate: Date;
	endDate?: Date; // null for ongoing goals
	status: 'active' | 'completed' | 'paused' | 'failed';
	difficulty: 'easy' | 'medium' | 'hard' | 'expert';
	category: 'wellness' | 'productivity' | 'balance' | 'custom';
	tags: string[];
	createdAt: Date;
	updatedAt: Date;
}

export interface ProgressReport {
	period: 'week' | 'month' | 'quarter' | 'year';
	startDate: Date;
	endDate: Date;
	goals: {
		goal: Goal;
		progress: number; // percentage
		trend: 'improving' | 'declining' | 'stable';
		insights: string[];
	}[];
	achievements: {
		id: string;
		name: string;
		description: string;
		unlockedAt: Date;
		rarity: 'common' | 'rare' | 'epic' | 'legendary';
	}[];
	summary: {
		totalGoals: number;
		completedGoals: number;
		averageProgress: number;
		weekOverWeekChange: number;
		topCategory: string;
		strugglingArea: string;
		recommendations: string[];
	};
}

export class GoalTracker {
	private static readonly GOALS_KEY = 'userGoals';
	private static readonly ACHIEVEMENTS_KEY = 'userAchievements';
	private static readonly PROGRESS_KEY = 'goalProgress';

	static async getGoals(): Promise<Goal[]> {
		const storage = await chrome.storage.local.get(this.GOALS_KEY);
		return (storage[this.GOALS_KEY] || []).map((g: any) => ({
			...g,
			startDate: new Date(g.startDate),
			endDate: g.endDate ? new Date(g.endDate) : undefined,
			createdAt: new Date(g.createdAt),
			updatedAt: new Date(g.updatedAt),
			current: {
				...g.current,
				lastUpdated: new Date(g.current.lastUpdated)
			},
			rewards: g.rewards.map((r: any) => ({
				...r,
				achievedAt: r.achievedAt ? new Date(r.achievedAt) : undefined
			}))
		}));
	}

	static async saveGoal(goal: Goal): Promise<void> {
		const goals = await this.getGoals();
		const existingIndex = goals.findIndex(g => g.id === goal.id);
		
		if (existingIndex >= 0) {
			goals[existingIndex] = { ...goal, updatedAt: new Date() };
		} else {
			goals.push({ ...goal, createdAt: new Date(), updatedAt: new Date() });
		}
		
		await chrome.storage.local.set({ [this.GOALS_KEY]: goals });
	}

	static async deleteGoal(goalId: string): Promise<void> {
		const goals = await this.getGoals();
		const filtered = goals.filter(g => g.id !== goalId);
		await chrome.storage.local.set({ [this.GOALS_KEY]: filtered });
	}

	static async updateGoalProgress(goalId: string, newValue: number, date: Date = new Date()): Promise<Goal | null> {
		const goals = await this.getGoals();
		const goal = goals.find(g => g.id === goalId);
		if (!goal) return null;

		const dateKey = date.toISOString().split('T')[0];
		const previousValue = goal.current.value;
		
		// Update current value
		goal.current.value = newValue;
		goal.current.lastUpdated = date;
		
		// Update history
		const existingHistoryIndex = goal.current.history.findIndex(h => h.date === dateKey);
		if (existingHistoryIndex >= 0) {
			goal.current.history[existingHistoryIndex].value = newValue;
		} else {
			goal.current.history.push({ date: dateKey, value: newValue });
		}
		
		// Update streak
		goal.current.streak = this.calculateStreak(goal);
		
		// Check for milestone rewards
		await this.checkMilestoneRewards(goal, previousValue);
		
		// Check for goal completion
		if (this.isGoalCompleted(goal) && goal.status === 'active') {
			goal.status = 'completed';
			await this.unlockAchievement('goal_completed', goal);
		}
		
		await this.saveGoal(goal);
		return goal;
	}

	private static calculateStreak(goal: Goal): number {
		const sortedHistory = goal.current.history
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
		
		let streak = 0;
		const today = new Date();
		
		for (let i = 0; i < sortedHistory.length; i++) {
			const historyDate = new Date(sortedHistory[i].date);
			const daysDiff = Math.floor((today.getTime() - historyDate.getTime()) / (1000 * 60 * 60 * 24));
			
			if (daysDiff === streak && this.isDayGoalMet(goal, sortedHistory[i].value)) {
				streak++;
			} else {
				break;
			}
		}
		
		return streak;
	}

	private static isDayGoalMet(goal: Goal, dayValue: number): boolean {
		switch (goal.type) {
			case 'usage_limit':
				return dayValue <= goal.target.value;
			case 'usage_target':
				return dayValue >= goal.target.value;
			case 'streak':
			case 'break_habit':
			case 'build_habit':
				return dayValue >= goal.target.value;
			default:
				return false;
		}
	}

	private static isGoalCompleted(goal: Goal): boolean {
		switch (goal.type) {
			case 'usage_limit':
				return goal.current.value <= goal.target.value;
			case 'usage_target':
				return goal.current.value >= goal.target.value;
			case 'streak':
				return goal.current.streak >= goal.target.value;
			default:
				return false;
		}
	}

	private static async checkMilestoneRewards(goal: Goal, previousValue: number): Promise<void> {
		const progress = this.calculateProgress(goal);
		const previousProgress = goal.target.value > 0 ? (previousValue / goal.target.value) * 100 : 0;
		
		for (const reward of goal.rewards) {
			if (!reward.achieved && progress >= reward.milestone && previousProgress < reward.milestone) {
				reward.achieved = true;
				reward.achievedAt = new Date();
				await this.unlockAchievement('milestone_reached', goal, reward.message);
			}
		}
	}

	private static calculateProgress(goal: Goal): number {
		if (goal.target.value === 0) return 0;
		
		switch (goal.type) {
			case 'usage_limit':
				return Math.max(0, (1 - goal.current.value / goal.target.value) * 100);
			case 'usage_target':
			case 'streak':
				return Math.min(100, (goal.current.value / goal.target.value) * 100);
			default:
				return 0;
		}
	}

	private static async unlockAchievement(type: string, goal: Goal, customMessage?: string): Promise<void> {
		// Implementation would unlock achievements in gamification system
		console.log(`Achievement unlocked: ${type} for goal ${goal.name}`);
	}

	static async generateProgressReport(period: 'week' | 'month' | 'quarter' | 'year'): Promise<ProgressReport> {
		const goals = await this.getGoals();
		const now = new Date();
		let startDate: Date;
		
		switch (period) {
			case 'week':
				startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
				break;
			case 'month':
				startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
				break;
			case 'quarter':
				startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
				break;
			case 'year':
				startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
				break;
		}
		
		const goalProgress = goals.map(goal => ({
			goal,
			progress: this.calculateProgress(goal),
			trend: this.calculateTrend(goal, startDate, now),
			insights: this.generateInsights(goal)
		}));
		
		return {
			period,
			startDate,
			endDate: now,
			goals: goalProgress,
			achievements: [], // Would be populated from achievements system
			summary: {
				totalGoals: goals.length,
				completedGoals: goals.filter(g => g.status === 'completed').length,
				averageProgress: goalProgress.reduce((sum, gp) => sum + gp.progress, 0) / goals.length,
				weekOverWeekChange: 0, // Would calculate actual change
				topCategory: this.getTopCategory(goals),
				strugglingArea: this.getStrugglingArea(goalProgress),
				recommendations: this.generateRecommendations(goalProgress)
			}
		};
	}

	private static calculateTrend(goal: Goal, startDate: Date, endDate: Date): 'improving' | 'declining' | 'stable' {
		const relevantHistory = goal.current.history.filter(h => {
			const date = new Date(h.date);
			return date >= startDate && date <= endDate;
		});
		
		if (relevantHistory.length < 2) return 'stable';
		
		const sorted = relevantHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
		const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
		const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
		
		const firstAvg = firstHalf.reduce((sum, h) => sum + h.value, 0) / firstHalf.length;
		const secondAvg = secondHalf.reduce((sum, h) => sum + h.value, 0) / secondHalf.length;
		
		const threshold = goal.target.value * 0.05; // 5% threshold
		
		if (goal.type === 'usage_limit') {
			if (secondAvg < firstAvg - threshold) return 'improving';
			if (secondAvg > firstAvg + threshold) return 'declining';
		} else {
			if (secondAvg > firstAvg + threshold) return 'improving';
			if (secondAvg < firstAvg - threshold) return 'declining';
		}
		
		return 'stable';
	}

	private static generateInsights(goal: Goal): string[] {
		const insights: string[] = [];
		const progress = this.calculateProgress(goal);
		
		if (progress > 80) {
			insights.push("Excellent progress! You're almost there.");
		} else if (progress > 60) {
			insights.push("Good momentum. Keep up the great work!");
		} else if (progress > 40) {
			insights.push("You're making steady progress. Consider adjusting your approach if needed.");
		} else if (progress > 20) {
			insights.push("Early stages. Focus on building consistent habits.");
		} else {
			insights.push("Getting started is the hardest part. You've got this!");
		}
		
		if (goal.current.streak > 7) {
			insights.push(`Amazing streak of ${goal.current.streak} days!`);
		}
		
		return insights;
	}

	private static getTopCategory(goals: Goal[]): string {
		const categoryCount = goals.reduce((acc, goal) => {
			acc[goal.category] = (acc[goal.category] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);
		
		return Object.entries(categoryCount)
			.sort(([,a], [,b]) => b - a)[0]?.[0] || 'wellness';
	}

	private static getStrugglingArea(goalProgress: { goal: Goal; progress: number }[]): string {
		const struggling = goalProgress
			.filter(gp => gp.progress < 40)
			.sort((a, b) => a.progress - b.progress)[0];
		
		return struggling?.goal.category || 'none';
	}

	private static generateRecommendations(goalProgress: { goal: Goal; progress: number }[]): string[] {
		const recommendations: string[] = [];
		
		const struggling = goalProgress.filter(gp => gp.progress < 30);
		if (struggling.length > 0) {
			recommendations.push("Consider breaking down difficult goals into smaller, manageable steps");
		}
		
		const excelling = goalProgress.filter(gp => gp.progress > 80);
		if (excelling.length > 0) {
			recommendations.push("Great progress! Consider setting more challenging goals to continue growing");
		}
		
		return recommendations;
	}

	// Preset goal templates
	static getGoalTemplates(): Omit<Goal, 'id' | 'current' | 'createdAt' | 'updatedAt'>[] {
		return [
			{
				name: "Social Media Detox",
				description: "Limit social media usage to promote mindful browsing",
				type: 'usage_limit',
				target: { value: 30, period: 'daily', category: 'Social' },
				rewards: [
					{ milestone: 25, message: "First week milestone reached!", achieved: false },
					{ milestone: 50, message: "Halfway there! Great progress!", achieved: false },
					{ milestone: 75, message: "Almost there! You're doing amazing!", achieved: false },
					{ milestone: 100, message: "Goal achieved! You've mastered mindful browsing!", achieved: false }
				],
				startDate: new Date(),
				status: 'active' as const,
				difficulty: 'medium' as const,
				category: 'wellness' as const,
				tags: ['social-media', 'mindfulness', 'digital-wellness']
			},
			{
				name: "Deep Work Sessions",
				description: "Build a habit of focused, uninterrupted work time",
				type: 'build_habit',
				target: { value: 120, period: 'daily', category: 'Productivity' },
				rewards: [
					{ milestone: 25, message: "Building momentum in your focus practice", achieved: false },
					{ milestone: 50, message: "Halfway to mastering deep work!", achieved: false },
					{ milestone: 75, message: "Deep work is becoming a strong habit", achieved: false },
					{ milestone: 100, message: "Deep work master! Your focus is incredible!", achieved: false }
				],
				startDate: new Date(),
				status: 'active' as const,
				difficulty: 'hard' as const,
				category: 'productivity' as const,
				tags: ['deep-work', 'productivity', 'focus']
			},
			{
				name: "Digital Sunset",
				description: "Reduce screen time before bed for better sleep",
				type: 'usage_limit',
				target: { value: 15, period: 'daily' },
				rewards: [
					{ milestone: 25, message: "Better sleep habits forming!", achieved: false },
					{ milestone: 50, message: "Your sleep quality is improving!", achieved: false },
					{ milestone: 75, message: "Almost achieved your digital sunset goal!", achieved: false },
					{ milestone: 100, message: "Perfect! You've mastered healthy evening routines!", achieved: false }
				],
				startDate: new Date(),
				status: 'active' as const,
				difficulty: 'medium' as const,
				category: 'wellness' as const,
				tags: ['sleep', 'evening', 'wellness']
			}
		];
	}
}