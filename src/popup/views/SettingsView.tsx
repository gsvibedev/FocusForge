import React, { useState, useEffect } from 'react';
import {
	Box,
	Typography,
	Card,
	CardContent,
	Switch,
	FormControlLabel,
	Button,
	Divider,
	Stack,
	Chip,
	Alert,
	CircularProgress,
	LinearProgress
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import BlockIcon from '@mui/icons-material/Block';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import BackupIcon from '@mui/icons-material/Backup';
import { useTheme } from '../../contexts/ThemeContext';

export default function SettingsView(): React.ReactElement {
	const { isDarkMode, toggleDarkMode } = useTheme();
	const [gamificationPopupsEnabled, setGamificationPopupsEnabled] = useState(true);
	const [immediateBlockingEnabled, setImmediateBlockingEnabled] = useState(true);
	const [isLoading, setIsLoading] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [importProgress, setImportProgress] = useState(0);
	const [importMessage, setImportMessage] = useState('');

	// Load preferences on mount
	useEffect(() => {
		chrome.storage.local.get(['gamificationPopupsEnabled', 'immediateBlockingEnabled']).then(result => {
			setGamificationPopupsEnabled(result.gamificationPopupsEnabled !== false);
			setImmediateBlockingEnabled(result.immediateBlockingEnabled !== false);
		});
	}, []);

	const handleToggleGamificationPopups = async () => {
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
	};

	const handleToggleImmediateBlocking = async () => {
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
	};

	const handleOpenAdvancedSettings = () => {
		if (chrome.runtime && chrome.runtime.openOptionsPage) {
			chrome.runtime.openOptionsPage();
		} else {
			// Fallback
			const optionsUrl = chrome.runtime.getURL('src/options/index.html');
			window.open(optionsUrl, '_blank');
		}
	};

	async function exportData(): Promise<void> {
		setIsExporting(true);
		try {
			console.log('[QuickSettings] Starting comprehensive data export...');
			
			// Get ALL data from local storage
			const localStorage = await chrome.storage.local.get(null);
			console.log('[QuickSettings] Local storage keys:', Object.keys(localStorage));
			
			// Get ALL usage logs from IndexedDB
			const usageLogsResponse = await chrome.runtime.sendMessage({ type: 'get-usage-logs' });
			const usageLogs = usageLogsResponse?.ok ? usageLogsResponse.data : [];
			console.log(`[QuickSettings] Found ${usageLogs.length} usage logs`);
			
			// Get advanced rules from RulesEngine
			let advancedRules = [];
			let urlPatterns = [];
			try {
				const { RulesEngine } = await import('../../storage/rulesEngine');
				advancedRules = await RulesEngine.getRules();
				urlPatterns = await RulesEngine.getURLPatterns();
				console.log(`[QuickSettings] Found ${advancedRules.length} advanced rules, ${urlPatterns.length} URL patterns`);
			} catch (error) {
				console.warn('[QuickSettings] Failed to get advanced rules:', error);
			}
			
			// Get goals from GoalTracker
			let userGoals = [];
			try {
				const { GoalTracker } = await import('../../storage/goalTracker');
				userGoals = await GoalTracker.getGoals();
				console.log(`[QuickSettings] Found ${userGoals.length} user goals`);
			} catch (error) {
				console.warn('[QuickSettings] Failed to get goals:', error);
			}
			
			// Create comprehensive export data (same as Privacy Panel)
			const exportData = {
				version: '2.0.0',
				exportedAt: new Date().toISOString(),
				metadata: {
					browserInfo: navigator.userAgent,
					exportedBy: 'FocusForge Popup Quick Settings',
					totalUsageLogs: usageLogs.length,
					totalStorageKeys: Object.keys(localStorage).length
				},
				
				// Core configuration data
				limits: localStorage.limits || [],
				categories: localStorage.categories || [],
				domainCategories: localStorage.domainCategories || {},
				
				// Advanced configuration
				advancedRules: advancedRules,
				urlPatterns: urlPatterns,
				userGoals: userGoals,
				
				// Usage data
				usageLogs: usageLogs,
				
				// Gamification and preferences
				gamification: localStorage.gamification || {},
				
				// Settings and preferences
				settings: {
					syncEnabled: localStorage.syncEnabled || false,
					lastCleanup: localStorage.lastCleanup,
					blockSnoozeUntil: localStorage.blockSnoozeUntil,
					...Object.fromEntries(
						Object.entries(localStorage).filter(([key, _]) => 
							key.includes('pref') || 
							key.includes('setting') || 
							key.includes('config') ||
							key.includes('theme') ||
							key === 'onboardingCompleted' ||
							key === 'lastVersion'
						)
					)
				},
				
				// Include any remaining storage data not categorized above
				additionalData: Object.fromEntries(
					Object.entries(localStorage).filter(([key, _]) => 
						!key.startsWith('backup_') && 
						key !== 'limits' &&
						key !== 'categories' &&
						key !== 'domainCategories' &&
						key !== 'gamification' &&
						key !== 'syncEnabled' &&
						key !== 'lastCleanup' &&
						key !== 'blockSnoozeUntil' &&
						!key.includes('pref') &&
						!key.includes('setting') &&
						!key.includes('config') &&
						!key.includes('theme') &&
						key !== 'onboardingCompleted' &&
						key !== 'lastVersion'
					)
				)
			};
			
			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `focusforge-complete-backup-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
			
			console.log('[QuickSettings] Export completed successfully');
		} catch (error) {
			console.error('[QuickSettings] Export failed:', error);
			alert('Export failed. Please try again.');
		} finally {
			setIsExporting(false);
		}
	}

	async function importData(): Promise<void> {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			setIsImporting(true);
			setImportProgress(0);
			setImportMessage('Preparing import...');
			
			try {
				console.log('[QuickSettings] Starting comprehensive data import...');
				setImportProgress(10);
				setImportMessage('Reading file...');
				
				const text = await file.text();
				setImportProgress(20);
				setImportMessage('Parsing data...');
				
				const importedData = JSON.parse(text);

				// Validate the imported data structure
				if (!importedData.version || !importedData.exportedAt) {
					throw new Error('Invalid backup file format - missing version or export date');
				}

				setImportProgress(30);
				setImportMessage(`Validating backup from ${new Date(importedData.exportedAt).toLocaleDateString()}...`);
				console.log(`[QuickSettings] Importing data version ${importedData.version} from ${importedData.exportedAt}`);

				// Create backup of current data before import
				setImportProgress(35);
				setImportMessage('Creating backup of current data...');
				const currentData = await chrome.storage.local.get(null);
				const backupKey = `backup_${Date.now()}`;
				await chrome.storage.local.set({ [backupKey]: currentData });
				console.log(`[QuickSettings] Created backup with key: ${backupKey}`);

				// Clear existing data
				setImportProgress(40);
				setImportMessage('Clearing existing data...');
				await chrome.storage.local.clear();
				console.log('[QuickSettings] Cleared existing local storage');

				// Restore the backup key first
				await chrome.storage.local.set({ [backupKey]: currentData });

				// Import local storage data (same logic as Privacy Panel)
				setImportProgress(45);
				setImportMessage('Importing settings and configuration...');
				const storageToImport: any = {};

				// Import core configuration
				if (importedData.limits) storageToImport.limits = importedData.limits;
				if (importedData.categories) storageToImport.categories = importedData.categories;
				if (importedData.domainCategories) storageToImport.domainCategories = importedData.domainCategories;
				if (importedData.gamification) storageToImport.gamification = importedData.gamification;

				// Import settings
				if (importedData.settings) {
					Object.assign(storageToImport, importedData.settings);
				}

				// Import additional data
				if (importedData.additionalData) {
					Object.assign(storageToImport, importedData.additionalData);
				}

				// Handle legacy format (v1.0.0) that had everything in 'storage' key
				if (importedData.storage && typeof importedData.storage === 'object') {
					const legacyStorage = Object.fromEntries(
						Object.entries(importedData.storage).filter(([key]) => !key.startsWith('backup_'))
					);
					Object.assign(storageToImport, legacyStorage);
				}

				setImportProgress(55);
				setImportMessage('Saving configuration to storage...');
				await chrome.storage.local.set(storageToImport);
				console.log(`[QuickSettings] Imported ${Object.keys(storageToImport).length} storage keys`);

				// Import usage logs to IndexedDB (same as Privacy Panel)
				if (importedData.usageLogs && Array.isArray(importedData.usageLogs) && importedData.usageLogs.length > 0) {
					setImportProgress(60);
					setImportMessage(`Importing ${importedData.usageLogs.length.toLocaleString()} usage logs...`);
					console.log(`[QuickSettings] Importing ${importedData.usageLogs.length} usage logs...`);
					
					// Clear existing usage logs first
					await new Promise<void>((resolve, reject) => {
						chrome.runtime.sendMessage({ type: 'clear-usage-logs' }, (response) => {
							if (response?.ok) {
								console.log('[QuickSettings] Cleared existing usage logs');
								resolve();
							} else {
								reject(new Error('Failed to clear existing usage logs'));
							}
						});
					});

					// Import new usage logs
					await new Promise<void>((resolve, reject) => {
						chrome.runtime.sendMessage({ 
							type: 'import-usage-logs', 
							payload: { logs: importedData.usageLogs } 
						}, (response) => {
							if (response?.ok) {
								console.log(`[QuickSettings] Successfully imported ${response.data.imported}/${response.data.total} usage logs`);
								resolve();
							} else {
								reject(new Error(`Failed to import usage logs: ${response?.error || 'Unknown error'}`));
							}
						});
					});
				}

				// Import advanced rules (same as Privacy Panel)
				if (importedData.advancedRules && Array.isArray(importedData.advancedRules) && importedData.advancedRules.length > 0) {
					setImportProgress(70);
					setImportMessage(`Importing ${importedData.advancedRules.length} advanced rules...`);
					console.log(`[QuickSettings] Importing ${importedData.advancedRules.length} advanced rules...`);
					try {
						const { RulesEngine } = await import('../../storage/rulesEngine');
						
						// Clear existing rules first
						const existingRules = await RulesEngine.getRules();
						for (const rule of existingRules) {
							await RulesEngine.deleteRule(rule.id);
						}

						// Import new rules
						for (const rule of importedData.advancedRules) {
							await RulesEngine.saveRule(rule);
						}
						console.log('[QuickSettings] Advanced rules imported successfully');
					} catch (error) {
						console.warn('[QuickSettings] Failed to import advanced rules:', error);
					}
				}

				// Import URL patterns (same as Privacy Panel)
				if (importedData.urlPatterns && Array.isArray(importedData.urlPatterns) && importedData.urlPatterns.length > 0) {
					console.log(`[QuickSettings] Importing ${importedData.urlPatterns.length} URL patterns...`);
					try {
						const { RulesEngine } = await import('../../storage/rulesEngine');
						
						// Clear existing patterns first
						const existingPatterns = await RulesEngine.getURLPatterns();
						for (const pattern of existingPatterns) {
							await RulesEngine.deleteURLPattern(pattern.id);
						}

						// Import new patterns
						for (const pattern of importedData.urlPatterns) {
							await RulesEngine.saveURLPattern(pattern);
						}
						console.log('[QuickSettings] URL patterns imported successfully');
					} catch (error) {
						console.warn('[QuickSettings] Failed to import URL patterns:', error);
					}
				}

				// Import user goals (same as Privacy Panel)
				if (importedData.userGoals && Array.isArray(importedData.userGoals) && importedData.userGoals.length > 0) {
					console.log(`[QuickSettings] Importing ${importedData.userGoals.length} user goals...`);
					try {
						const { GoalTracker } = await import('../../storage/goalTracker');
						
						// Import goals (GoalTracker handles duplicates)
						for (const goal of importedData.userGoals) {
							await GoalTracker.saveGoal(goal);
						}
						console.log('[QuickSettings] User goals imported successfully');
					} catch (error) {
						console.warn('[QuickSettings] Failed to import user goals:', error);
					}
				}

				setImportProgress(95);
				setImportMessage('Finalizing import...');
				console.log('[QuickSettings] Import completed successfully');
				
				setImportProgress(100);
				setImportMessage('Import completed successfully!');
				
				// Show completion message
				setTimeout(() => {
					alert('Data imported successfully! Please refresh or restart the extension.');
					setImportProgress(0);
					setImportMessage('');
				}, 500);
			} catch (error) {
				console.error('[QuickSettings] Import error:', error);
				setImportProgress(0);
				setImportMessage('');
				alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please check that you selected a valid FocusForge backup file.`);
			} finally {
				setIsImporting(false);
			}
		};
		input.click();
	}

	return (
		<Box sx={{ p: 2, maxHeight: '100%', overflow: 'auto' }}>
			<Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
				<SettingsIcon color="primary" />
				Quick Settings
			</Typography>

			{/* Theme Toggle */}
			<Card elevation={0} sx={{ 
				mb: 2, 
				borderRadius: 2,
				boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
				transition: 'all 0.2s ease',
				'&:hover': {
					boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
					transform: 'translateY(-1px)'
				}
			}}>
				<CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
					<Stack direction="row" alignItems="center" justifyContent="space-between">
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							{isDarkMode ? <DarkModeIcon color="primary" fontSize="small" /> : <LightModeIcon color="primary" fontSize="small" />}
							<Typography variant="body2" fontWeight={600}>
								Dark Mode
							</Typography>
						</Box>
						<Switch
							checked={isDarkMode}
							onChange={toggleDarkMode}
							size="small"
							color="primary"
						/>
					</Stack>
				</CardContent>
			</Card>

			{/* Gamification Popups */}
			<Card elevation={0} sx={{ 
				mb: 2, 
				borderRadius: 2,
				boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
				transition: 'all 0.2s ease',
				'&:hover': {
					boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
					transform: 'translateY(-1px)'
				}
			}}>
				<CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
					<Stack direction="row" alignItems="center" justifyContent="space-between">
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							{gamificationPopupsEnabled ? 
								<NotificationsIcon color="primary" fontSize="small" /> : 
								<NotificationsOffIcon color="disabled" fontSize="small" />
							}
							<Typography variant="body2" fontWeight={600}>
								Achievement Popups
							</Typography>
						</Box>
						<Switch
							checked={gamificationPopupsEnabled}
							onChange={handleToggleGamificationPopups}
							disabled={isLoading}
							size="small"
							color="primary"
						/>
					</Stack>
					<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
						{gamificationPopupsEnabled ? 'Motivational popups enabled' : 'Popups disabled'}
					</Typography>
				</CardContent>
			</Card>

			{/* Immediate Blocking */}
			<Card elevation={0} sx={{ 
				mb: 2, 
				borderRadius: 2,
				boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
				transition: 'all 0.2s ease',
				'&:hover': {
					boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
					transform: 'translateY(-1px)'
				}
			}}>
				<CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
					<Stack direction="row" alignItems="center" justifyContent="space-between">
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							{immediateBlockingEnabled ? 
								<BlockIcon color="primary" fontSize="small" /> : 
								<AccessTimeIcon color="disabled" fontSize="small" />
							}
							<Typography variant="body2" fontWeight={600}>
								Immediate Blocking
							</Typography>
						</Box>
						<Switch
							checked={immediateBlockingEnabled}
							onChange={handleToggleImmediateBlocking}
							disabled={isLoading}
							size="small"
							color="primary"
						/>
					</Stack>
					<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
						{immediateBlockingEnabled ? 'Block pages instantly when limit reached' : 'Block on next visit'}
					</Typography>
				</CardContent>
			</Card>

			{/* Complete Backup & Restore */}
			<Card elevation={0} sx={{ 
				mb: 2, 
				borderRadius: 2,
				boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
				transition: 'all 0.2s ease',
				'&:hover': {
					boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
					transform: 'translateY(-1px)'
				}
			}}>
				<CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
					<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<BackupIcon color="primary" fontSize="small" />
							<Typography variant="body2" fontWeight={600}>
								Complete Backup & Restore
							</Typography>
						</Box>
					</Stack>
					<Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
						Export all your data (limits, usage, goals, settings) or restore from backup
					</Typography>

					<Stack spacing={1.5}>
						{/* Export Button */}
						<Button 
							size="small" 
							variant="contained"
							startIcon={isExporting ? <CircularProgress size={14} color="inherit" /> : <DownloadIcon />}
							onClick={exportData}
							disabled={isExporting}
							fullWidth
							sx={{ 
								fontSize: '0.75rem', 
								py: 1,
								borderRadius: 1.5,
								textTransform: 'none',
								fontWeight: 600
							}}
						>
							{isExporting ? 'Exporting...' : 'Export Data'}
						</Button>

						{/* Import Button */}
						<Button 
							size="small" 
							variant="outlined"
							startIcon={isImporting ? <CircularProgress size={14} color="inherit" /> : <UploadIcon />}
							onClick={importData}
							disabled={isImporting}
							fullWidth
							sx={{ 
								fontSize: '0.75rem', 
								py: 1,
								borderRadius: 1.5,
								textTransform: 'none',
								fontWeight: 600
							}}
						>
							{isImporting ? 'Importing...' : 'Import Data'}
						</Button>

						{/* Import Progress */}
						{isImporting && (
							<Box sx={{ mt: 1 }}>
								<LinearProgress 
									variant="determinate" 
									value={importProgress} 
									sx={{ 
										height: 6, 
										borderRadius: 3,
										backgroundColor: 'action.hover',
										'& .MuiLinearProgress-bar': {
											borderRadius: 3
										}
									}} 
								/>
								{importMessage && (
									<Typography 
										variant="caption" 
										color="text.secondary" 
										sx={{ 
											display: 'block', 
											mt: 0.5, 
											fontSize: '0.65rem',
											textAlign: 'center'
										}}
									>
										{importMessage}
									</Typography>
								)}
							</Box>
						)}

						{/* Warning */}
						<Alert 
							severity="info" 
							sx={{ 
								borderRadius: 1.5,
								fontSize: '0.65rem',
								py: 0.5,
								'& .MuiAlert-message': { fontSize: '0.65rem' },
								'& .MuiAlert-icon': { fontSize: 12 }
							}}
						>
							{isImporting 
								? "Import in progress - this may take a few moments for large datasets..."
								: "Importing will replace all current data. Export first if needed."
							}
						</Alert>
					</Stack>
				</CardContent>
			</Card>

			<Divider sx={{ my: 2 }} />

			{/* Advanced Settings Button */}
			<Button
				variant="outlined"
				fullWidth
				startIcon={<SettingsIcon />}
				endIcon={<OpenInNewIcon />}
				onClick={handleOpenAdvancedSettings}
				sx={{ 
					borderRadius: 2,
					textTransform: 'none',
					fontWeight: 600,
					py: 1.5,
					transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
					'&:hover': {
						transform: 'translateY(-1px)',
						boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
						borderColor: 'primary.main',
						backgroundColor: 'primary.main',
						color: 'primary.contrastText'
					},
					'&:active': {
						transform: 'translateY(0px) scale(0.98)'
					}
				}}
			>
				Advanced Settings
			</Button>

			{/* Info Alert */}
			<Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
				<Typography variant="caption" fontWeight={600}>
					💡 Access analytics, detailed limits, scheduled rules, and more in Advanced Settings.
				</Typography>
			</Alert>
		</Box>
	);
}


