import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
	Box,
	Tabs,
	Tab,
	Typography,
	Stack,
	Chip,
	Button,
	Menu,
	MenuItem,
	Paper,
	Tooltip,
	Fab,
	Link,
	IconButton
} from '@mui/material';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import HelpIcon from '@mui/icons-material/Help';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
// Removed BlockIcon import - no longer needed

import { useTheme } from '../contexts/ThemeContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import DarkModeToggle from '../components/DarkModeToggle';
import TodayView from './views/TodayView';
import StatsView from './views/StatsView';
import OptionsView from './views/OptionsView';
import SettingsView from './views/SettingsView';
import SiteDetailView from './views/SiteDetailView';
import GamificationModalNew from '../components/GamificationModalNew';
import KeyboardShortcuts from '../components/KeyboardShortcuts';
import { useGamification } from '../hooks/useGamification';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import ErrorBoundary from '../components/ErrorBoundary';

function AppContent(): React.ReactElement {
	const { theme } = useTheme();
	const [tab, setTab] = useState(0);
	const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
	const [snoozeAnchor, setSnoozeAnchor] = useState<HTMLElement | null>(null);
	const [showShortcuts, setShowShortcuts] = useState(false);
	const [snoozeActive, setSnoozeActive] = useState<number | null>(null);
	const [snoozeEndTime, setSnoozeEndTime] = useState<number | null>(null);
	const [timeRemaining, setTimeRemaining] = useState<string>('');
	// Removed currentDomain state - no longer needed

	const {
		gamificationState,
		modalData,
		handleCloseModal,
		handleApplyRecommended,
		handleManualSettings,
		handleDisablePopups
	} = useGamification();

	useKeyboardShortcuts({
		onHelp: () => setShowShortcuts(true)
	});

	// Check for existing snooze on load and set up countdown
	useEffect(() => {
		const checkSnoozeStatus = async () => {
			try {
				// Force commit any pending usage immediately when popup opens
				await new Promise<void>((resolve) => chrome.runtime.sendMessage({ type: 'force-immediate-commit' }, () => resolve()));
				
				const result = await chrome.storage.local.get(['blockSnoozeUntil', 'globalSnooze']);
				const snoozeUntil = result.blockSnoozeUntil || 0;
				const snoozeData = result.globalSnooze;
				
				if (snoozeUntil > Date.now()) {
					setSnoozeEndTime(snoozeUntil);
					setSnoozeActive(snoozeData?.originalMinutes || 0);
				} else {
					// Clear expired snooze
					if (snoozeUntil > 0) {
						await chrome.storage.local.remove(['blockSnoozeUntil', 'globalSnooze']);
					}
					setSnoozeActive(null);
					setSnoozeEndTime(null);
				}
			} catch (error) {
				console.error('Error checking snooze status:', error);
			}
		};

		checkSnoozeStatus();
	}, []);

	// Countdown timer
	useEffect(() => {
		if (!snoozeEndTime) {
			setTimeRemaining('');
			return;
		}

		const updateTimer = () => {
			const now = Date.now();
			const remaining = snoozeEndTime - now;
			
			if (remaining <= 0) {
				setSnoozeActive(null);
				setSnoozeEndTime(null);
				setTimeRemaining('');
				// Clear from storage
				chrome.storage.local.remove(['blockSnoozeUntil', 'globalSnooze']);
				return;
			}

			const minutes = Math.floor(remaining / 60000);
			const seconds = Math.floor((remaining % 60000) / 1000);
			setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
		};

		updateTimer();
		const interval = setInterval(updateTimer, 1000);
		return () => clearInterval(interval);
	}, [snoozeEndTime]);

	const handleSnoozeCancel = async () => {
		try {
			await chrome.storage.local.remove(['blockSnoozeUntil', 'globalSnooze']);
			await chrome.runtime.sendMessage({ type: 'cancel-snooze' });
			setSnoozeActive(null);
			setSnoozeEndTime(null);
			setTimeRemaining('');
		} catch (error) {
			console.error('Error canceling snooze:', error);
		}
	};

	// Get current domain
	// Removed getCurrentDomain and handleQuickAddLimit - no longer needed

	return (
		<MuiThemeProvider theme={theme}>
			<CssBaseline />
			<Box
				sx={{
					width: 400,
					height: 600,
					display: 'flex',
					flexDirection: 'column',
					position: 'relative',
					backgroundColor: 'background.default'
				}}
			>
								{/* Header */}
				{!selectedDomain && (
					<Box sx={{
					p: 1.5,
						borderBottom: 1,
						borderColor: 'divider',
						position: 'relative'
					}}>
						<Box sx={{ position: 'relative', zIndex: 1 }}>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								{/* Left side - Logo and tagline with enhanced styling */}
								<Stack direction="row" alignItems="center" spacing={1.5}>
									<Box sx={{
										width: 28,
										height: 28,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										backgroundColor: 'transparent'
									}}>
										<img
											src={chrome.runtime.getURL('icons/logo.png')}
											alt="FocusForge Logo"
											style={{
												width: '100%',
												height: '100%',
												objectFit: 'contain',
												backgroundColor: 'transparent'
											}}
										/>
									</Box>
									<Typography 
										variant="h6" 
										sx={{ 
											fontWeight: 600, 
											letterSpacing: '-0.01em',
											fontSize: '1.1rem',
											color: 'text.primary'
										}}
									>
										FocusForge
									</Typography>
								</Stack>

								{/* Quick Actions removed */}
								
								{/* Right side - Gamification and controls */}
								<Stack direction="row" alignItems="center" spacing={1.5}>
									{/* Dark Mode Toggle */}
									<DarkModeToggle size="small" />
									
									{gamificationState && (
										<>
											{/* Gamification Chips */}
											<Stack direction="row" spacing={0.5}>
												{gamificationState.streakDays > 0 && (
													<Chip
														label={`${gamificationState.streakDays}🔥`}
														size="small"
														sx={{
															backgroundColor: theme.palette.warning.main,
															color: theme.palette.warning.contrastText,
															fontWeight: 700,
															fontSize: '0.7rem',
															height: 20,
															'& .MuiChip-label': { px: 0.8 }
														}}
													/>
												)}
												<Chip
													label={`${gamificationState.points}pts`}
													size="small"
													sx={{
														backgroundColor: theme.palette.success.main,
														color: theme.palette.success.contrastText,
														fontWeight: 700,
														fontSize: '0.7rem',
														height: 20,
														'& .MuiChip-label': { px: 0.8 }
													}}
												/>
											</Stack>

											{/* Snooze Button - Separated and styled */}
											<Button
												size="small"
												variant={snoozeActive ? "contained" : "outlined"}
												onClick={snoozeActive ? handleSnoozeCancel : (e) => setSnoozeAnchor(e.currentTarget)}
												sx={{
													borderRadius: 2,
													fontSize: '0.75rem',
													fontWeight: 600,
													color: snoozeActive ? 'white' : 'text.secondary',
													borderColor: snoozeActive ? 'success.main' : 'divider',
													backgroundColor: snoozeActive ? 'success.main' : 'transparent',
													minHeight: 28,
													px: 1.5,
													'&:hover': {
														backgroundColor: snoozeActive ? 'success.dark' : 'action.hover',
														borderColor: snoozeActive ? 'success.dark' : 'text.secondary',
														color: snoozeActive ? 'white' : 'text.primary'
													}
												}}
											>
												{snoozeActive ? (timeRemaining ? `${timeRemaining}` : 'Cancel Snooze') : 'Snooze'}
											</Button>
										</>
									)}
								</Stack>
							</Stack>
						</Box>
					</Box>
				)}

				<Menu anchorEl={snoozeAnchor} open={!!snoozeAnchor} onClose={() => setSnoozeAnchor(null)}>
					{[5, 15, 30, 60].map((m) => (
						<MenuItem key={m} onClick={async () => { 
							const endTime = Date.now() + (m * 60 * 1000);
							await chrome.runtime.sendMessage({ type: 'set-global-snooze', payload: { minutes: m } }); 
							
							// Store snooze data with end time
							await chrome.storage.local.set({
								globalSnooze: {
									until: endTime,
									originalMinutes: m
								}
							});
							
							setSnoozeActive(m);
							setSnoozeEndTime(endTime);
							setSnoozeAnchor(null); 
						}}>
							Snooze blocking {m} min
						</MenuItem>
					))}
				</Menu>

				{/* Tabs */}
				<Paper square elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
					<Tabs 
						value={tab} 
						onChange={(_e, v) => { 
							// Force commit when switching tabs
							chrome.runtime.sendMessage({ type: 'force-immediate-commit' }, () => {
								setSelectedDomain(null); 
								setTab(v);
							});
						}} 
						variant="fullWidth"
						sx={{
							minHeight: 40,
							'& .MuiTabs-flexContainer': {
								height: 40
							}
						}}
					>
						<Tab label="Today" />
						<Tab label="Stats" />
						<Tab label="LIMITS" />
						<Tab label="⚙️" sx={{ minWidth: 50 }} />
					</Tabs>
				</Paper>

				{/* Content */}
				<Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
					{selectedDomain ? (
						<SiteDetailView 
							domain={selectedDomain} 
							onBack={() => setSelectedDomain(null)}
							onSelectDomain={(d) => {
								chrome.runtime.sendMessage({ type: 'force-immediate-commit' }, () => setSelectedDomain(d));
							}}
						/>
					) : (
						<>
							{tab === 0 && <TodayView onSelectDomain={(d) => {
								// Force commit before navigating to domain detail
								chrome.runtime.sendMessage({ type: 'force-immediate-commit' }, () => setSelectedDomain(d));
							}} />}
							{tab === 1 && <StatsView onSelectDomain={(d) => {
								// Force commit before navigating to domain detail
								chrome.runtime.sendMessage({ type: 'force-immediate-commit' }, () => setSelectedDomain(d));
							}} />}
							{tab === 2 && <OptionsView />}
							{tab === 3 && <SettingsView />}
						</>
					)}
				</Box>

				<GamificationModalNew
					open={!!modalData}
					onClose={handleCloseModal}
					points={modalData?.points || 0}
					streakDays={modalData?.streakDays || 0}
					messages={modalData?.messages || []}
					recommendedLimits={modalData?.recommendedLimits || []}
					onApplyRecommended={handleApplyRecommended}
					onManualSettings={handleManualSettings}
					modalType={modalData?.modalType || 'daily'}
					levelInfo={modalData?.levelInfo}
					achievements={modalData?.achievements}
					onDisablePopups={handleDisablePopups}
				/>

				<KeyboardShortcuts
					open={showShortcuts}
					onClose={() => setShowShortcuts(false)}
				/>

				{/* Footer (in normal flow) */}
				<Box sx={{
					backgroundColor: 'background.paper',
					borderTop: 1,
					borderColor: 'divider',
					px: 1.5,
					py: 1,
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					flexShrink: 0
				}}>
					<Box>
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								mb: 0.12,
								fontSize: '0.7rem'
							}}
						>
							🔒 100% private - we never track, collect, or transfer your data
						</Typography>
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								gap: 1,
								fontSize: '0.7rem',
								mb: 0.25
							}}
						>
							💛 Loving that FocusForge is free? Help us keep it that way
						</Typography>
					</Box>
					<Stack direction="row" spacing={1} justifyContent="center">
						<Button 
							size="small" 
							variant="text"
							component={Link as any}
							href="https://buymeacoffee.com/happyapps"
							target="_blank"
							rel="noopener noreferrer"
							sx={{ minHeight: 24, fontSize: '0.7rem', px: 1 }}
						>
							❤️ Donate
						</Button>
						<Button 
							size="small" 
							variant="text"
							onClick={(e) => {
								e.preventDefault();
								chrome.tabs.create({ url: 'https://chromewebstore.google.com/detail/focusforge/odndoccknjfldenjjlnalbbhfndckppf/reviews' });
							}}
							sx={{ minHeight: 24, fontSize: '0.7rem', px: 1 }}
						>
							⭐ Rate
						</Button>
						<Button 
							size="small" 
							variant="text"
							onClick={() => chrome.tabs.create({ url: 'https://x.com/HappyAppsDev' })}
							startIcon={<PersonAddAlt1Icon sx={{ color: '#1E88E5' }} />}
							sx={{ minHeight: 24, fontSize: '0.7rem', px: 1 }}
						>
							Follow
						</Button>
					</Stack>
				</Box>

				{/* Help FAB */}
				<Tooltip title="Keyboard shortcuts (F1 or ?)">
					<Fab
						size="small"
						onClick={() => setShowShortcuts(true)}
						sx={{
							position: 'absolute',
							bottom: 112,
							right: 8,
							width: 32,
							height: 32,
							backgroundColor: 'action.hover',
							color: 'text.secondary',
							'&:hover': {
								backgroundColor: 'action.selected'
							}
						}}
					>
						<HelpIcon sx={{ fontSize: 16 }} />
					</Fab>
				</Tooltip>
			</Box>
		</MuiThemeProvider>
	);
}

function App(): React.ReactElement {
	return (
		<ErrorBoundary>
			<ThemeProvider>
				<AppContent />
			</ThemeProvider>
		</ErrorBoundary>
	);
}

createRoot(document.getElementById('root')!).render(<App />);