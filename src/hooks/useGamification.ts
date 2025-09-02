import { useState, useEffect, useRef } from 'react';
import { GamificationStore, GamificationState } from '../storage/gamificationStore';
import { LimitsStore } from '../storage/limitsStore';

interface ModalData {
	points: number;
	messages: string[];
	streakDays: number;
	recommendedLimits: Array<{
		displayName: string;
		currentMinutes: number;
		newMinutes: number;
		id: string;
	}>;
	modalType?: 'welcome' | 'daily' | 'levelup' | 'achievement';
	newAchievements?: any[];
	levelUp?: boolean;
	levelInfo?: any;
	achievements?: any[];
}

export const useGamification = () => {
	const [gamificationState, setGamificationState] = useState<GamificationState | null>(null);
	const [modalData, setModalData] = useState<ModalData | null>(null);
	const hasShownRef = useRef<boolean>(false);

	useEffect(() => {
		// Load initial gamification state
		const loadGamificationState = async () => {
			const state = await GamificationStore.getState();
			setGamificationState(state);
		};

		loadGamificationState();

		// Check for gamification updates (evaluate and potentially show modal)
		const checkForUpdates = async () => {
			const result = await GamificationStore.evaluateAndAward();
			const limits = await LimitsStore.getAllLimits();
			const updatedState = await GamificationStore.getState();
			const popupsEnabled = await GamificationStore.getPopupPreference();

			// Update state
			setGamificationState(updatedState);

			// Check if this is a first-time user (no limits set and low points)
			const isFirstTime = limits.length === 0 && result.points < 10;
			const isNewUser = result.points < 50 && result.streakDays <= 1;

			// Priority 1: Handle level-up notifications (highest priority) - only if popups are enabled
			if (popupsEnabled && result.levelUp) {
				if (hasShownRef.current) return;
				hasShownRef.current = true;
				await GamificationStore.markModalShown();
				setModalData({
					points: result.points,
					messages: [
						'Congratulations! You\'ve reached Level ' + result.stats.level + '!',
						'Your dedication to digital wellness is paying off!',
						'Keep building those healthy habits! '
					],
					streakDays: result.streakDays,
					recommendedLimits: result.recommendedLimits,
					modalType: 'levelup',
					levelUp: true,
					levelInfo: {
						level: result.stats.level,
						experience: result.stats.experience,
						nextLevelExp: result.stats.nextLevelExp
					}
				});
				return;
			}

			// Priority 2: Show achievement modal if new achievements unlocked (ignore daily gating but respect preference)
			if (popupsEnabled && result.newAchievements.length > 0) {
				if (hasShownRef.current) return;
				hasShownRef.current = true;
				await GamificationStore.markModalShown();
				setModalData({
					points: result.points,
					messages: [
						'🏆 Achievement Unlocked!',
						...result.newAchievements.map(a => `${a.name}: ${a.description}`),
						'You\'re making excellent progress! 🎉'
					],
					streakDays: result.streakDays,
					recommendedLimits: result.recommendedLimits,
					modalType: 'achievement',
					newAchievements: result.newAchievements,
					achievements: result.newAchievements,
					levelInfo: {
						level: result.stats.level,
						experience: result.stats.experience,
						nextLevelExp: result.stats.nextLevelExp
					}
				});
				return;
			}

			// Priority 3: Show welcome modal for first-time users
            // Gate by daily flag so it only appears once per day
            if (popupsEnabled && isFirstTime && result.shouldShowModal) {
				if (hasShownRef.current) return;
				hasShownRef.current = true;
				await GamificationStore.markModalShown();
				setModalData({
                    points: result.points,
                    messages: [
                        '🎯 Welcome to FocusForge!',
                        'Start your digital wellness journey by setting your first limit.',
                        'Every small step counts towards better focus! 💪'
                    ],
                    streakDays: result.streakDays,
                    recommendedLimits: [],
                    modalType: 'welcome',
                    levelInfo: {
                        level: result.stats.level || 1,
                        experience: result.stats.experience || 0,
                        nextLevelExp: result.stats.nextLevelExp || 100
                    }
                });
                return;
            }

			// Priority 4: Show regular daily check-in modal
			if (popupsEnabled && result.shouldShowModal) {
				// Determine modal type based on user status
				let modalType: 'welcome' | 'daily' | 'levelup' | 'achievement' = 'daily';
				
				if (isNewUser) {
					modalType = 'welcome';
				}
				
				// Generate appropriate messages
				let messages = result.messages.length > 0 ? result.messages : [];
				
				// Add streak message if applicable
				if (result.streakDays > 0) {
					if (result.streakDays === 1) {
						messages.unshift('🔥 Great start! You\'re building a streak!');
					} else if (result.streakDays < 7) {
						messages.unshift(`🔥 Day ${result.streakDays} streak! Keep the momentum going!`);
					} else if (result.streakDays < 30) {
						messages.unshift(`🔥 Amazing ${result.streakDays}-day streak! You\'re on fire!`);
					} else {
						messages.unshift(`🔥 Incredible ${result.streakDays}-day streak! You\'re a digital wellness champion!`);
					}
				}
				
				// Add motivational message if no other messages
				if (messages.length === 0) {
					if (modalType === 'welcome') {
						messages = [
							'🌟 Ready to take control of your digital habits?',
							'Set some limits and start earning points!'
						];
					} else {
						messages = [
							'💪 Keep up the great work!',
							'Every day of mindful usage counts!'
						];
					}
				}
				
				if (hasShownRef.current) return;
				hasShownRef.current = true;
				await GamificationStore.markModalShown();
				setModalData({
					points: result.points,
					streakDays: result.streakDays,
					messages,
					recommendedLimits: result.recommendedLimits,
					modalType,
					levelInfo: {
						level: result.stats.level,
						experience: result.stats.experience,
						nextLevelExp: result.stats.nextLevelExp
					},
					achievements: result.newAchievements
				});
			}
		};

		checkForUpdates();
	}, []);

	// Respond to external preference changes: if popups are disabled from settings, close any open modal
	useEffect(() => {
		const handleStorageChange = (changes: any, area: string) => {
			if (area === 'local' && changes && Object.prototype.hasOwnProperty.call(changes, 'gamificationPopupsEnabled')) {
				const newVal = changes.gamificationPopupsEnabled?.newValue;
				if (newVal === false) {
					setModalData(null);
				}
			}
		};
		chrome.storage.onChanged.addListener(handleStorageChange);
		return () => {
			chrome.storage.onChanged.removeListener(handleStorageChange);
		};
	}, []);

	const handleCloseModal = () => {
		setModalData(null);
	};

	const handleApplyRecommended = async (limits: Array<{ id: string; newMinutes: number }>) => {
		await GamificationStore.applyRecommendedLimits(limits);
		setModalData(null);
		// Refresh gamification state after applying limits
		const state = await GamificationStore.getState();
		setGamificationState(state);
	};

	const handleManualSettings = () => {
		setModalData(null);
		// Could navigate to settings or open settings modal
		// For now, just close the modal
	};

	const handleDisablePopups = async () => {
		await GamificationStore.disablePopups();
		setModalData(null);
	};

	return {
		gamificationState,
		modalData,
		handleCloseModal,
		handleApplyRecommended,
		handleManualSettings,
		handleDisablePopups
	};
};


