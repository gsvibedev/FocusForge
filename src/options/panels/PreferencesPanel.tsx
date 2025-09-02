import React from 'react';
import { Box, Typography, Card, CardContent, Switch, FormControlLabel, Alert } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import BlockIcon from '@mui/icons-material/Block';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

export default function PreferencesPanel(): React.ReactElement {
	const [gamificationPopupsEnabled, setGamificationPopupsEnabled] = React.useState(true);
	const [immediateBlockingEnabled, setImmediateBlockingEnabled] = React.useState(true);
	const [isLoading, setIsLoading] = React.useState(false);

	// Load preferences on mount
	React.useEffect(() => {
		chrome.storage.local.get(['gamificationPopupsEnabled', 'immediateBlockingEnabled']).then(result => {
			setGamificationPopupsEnabled(result.gamificationPopupsEnabled !== false); // Default to true
			setImmediateBlockingEnabled(result.immediateBlockingEnabled !== false); // Default to true
		});
	}, []);

	// Keep toggles in sync with external changes
	React.useEffect(() => {
		const handleStorageChange = (changes: any, area: string) => {
			if (area === 'local' && changes) {
				if (Object.prototype.hasOwnProperty.call(changes, 'gamificationPopupsEnabled')) {
					const newVal = changes.gamificationPopupsEnabled?.newValue;
					setGamificationPopupsEnabled(newVal !== false); // default to true
				}
				if (Object.prototype.hasOwnProperty.call(changes, 'immediateBlockingEnabled')) {
					const newVal = changes.immediateBlockingEnabled?.newValue;
					setImmediateBlockingEnabled(newVal !== false); // default to true
				}
			}
		};
		chrome.storage.onChanged.addListener(handleStorageChange);
		return () => {
			chrome.storage.onChanged.removeListener(handleStorageChange);
		};
	}, []);

	async function toggleGamificationPopups(): Promise<void> {
		setIsLoading(true);
		try {
			const newState = !gamificationPopupsEnabled;
			await chrome.storage.local.set({ gamificationPopupsEnabled: newState });
			setGamificationPopupsEnabled(newState);
		} catch (error) {
			console.error('Error toggling gamification popups:', error);
		} finally {
			setIsLoading(false);
		}
	}

	async function toggleImmediateBlocking(): Promise<void> {
		setIsLoading(true);
		try {
			const newState = !immediateBlockingEnabled;
			await chrome.storage.local.set({ immediateBlockingEnabled: newState });
			setImmediateBlockingEnabled(newState);
		} catch (error) {
			console.error('Error toggling immediate blocking:', error);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Box>
			<Typography variant="h4" fontWeight={900} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
				<SettingsIcon color="primary" />
				Preferences
			</Typography>
			<Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
				Customize your FocusForge experience with these interface and notification settings.
			</Typography>

			<Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
				<CardContent sx={{ p: 3 }}>
					<Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
						{gamificationPopupsEnabled ? <NotificationsIcon color="primary" /> : <NotificationsOffIcon color="disabled" />}
						Gamification Popups
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
						{gamificationPopupsEnabled 
							? 'Achievement popups, level-ups, and daily check-ins are enabled to keep you motivated.'
							: 'All gamification popups are disabled. You can still view your progress in the popup interface.'
						}
					</Typography>
					<FormControlLabel
						control={
							<Switch
								checked={gamificationPopupsEnabled}
								onChange={toggleGamificationPopups}
								disabled={isLoading}
								color="primary"
							/>
						}
						label={gamificationPopupsEnabled ? 'Popups Enabled' : 'Popups Disabled'}
						sx={{ mb: 0 }}
					/>
					{isLoading && (
						<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
							Updating preference...
						</Typography>
					)}
				</CardContent>
			</Card>

			<Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
				<CardContent sx={{ p: 3 }}>
					<Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
						{immediateBlockingEnabled ? <BlockIcon color="primary" /> : <AccessTimeIcon color="disabled" />}
						Immediate Blocking
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
						{immediateBlockingEnabled 
							? 'Pages are blocked immediately when limits are reached on the active tab.'
							: 'Pages are blocked only when you navigate to them after the limit is reached.'
						}
					</Typography>
					<FormControlLabel
						control={
							<Switch
								checked={immediateBlockingEnabled}
								onChange={toggleImmediateBlocking}
								disabled={isLoading}
								color="primary"
							/>
						}
						label={immediateBlockingEnabled ? 'Block Immediately' : 'Block on Next Visit'}
						sx={{ mb: 0 }}
					/>
					{isLoading && (
						<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
							Updating preference...
						</Typography>
					)}
				</CardContent>
			</Card>

			<Alert severity="info" sx={{ borderRadius: 2 }}>
				<Typography variant="body2" fontWeight={600}>
					💡 Tip: You can also disable popups directly from any gamification modal using the "Don't show again" option.
				</Typography>
			</Alert>
		</Box>
	);
}