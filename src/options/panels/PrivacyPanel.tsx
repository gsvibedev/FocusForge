import React from 'react';
import { Box, Button, Stack, Typography, Card, CardContent, Alert, Divider, Switch, FormControlLabel } from '@mui/material';
import { useTheme } from '../../contexts/ThemeContext';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import SecurityIcon from '@mui/icons-material/Security';
import CloudIcon from '@mui/icons-material/Cloud';
import CloudOffIcon from '@mui/icons-material/CloudOff';

export default function PrivacyPanel(): React.ReactElement {
	const { theme, isDarkMode } = useTheme();
	const [isExporting, setIsExporting] = React.useState(false);
	const [isImporting, setIsImporting] = React.useState(false);
	const [isErasing, setIsErasing] = React.useState(false);
	const [syncEnabled, setSyncEnabled] = React.useState(false);
	const [isTogglingSync, setIsTogglingSync] = React.useState(false);

	// Load sync status on mount
	React.useEffect(() => {
		chrome.storage.local.get(['syncEnabled']).then(result => {
			setSyncEnabled(result.syncEnabled || false);
		});
	}, []);

	async function exportData(): Promise<void> {
		setIsExporting(true);
		try {
			console.log('[PrivacyPanel] Starting comprehensive data export...');
			
			// Get ALL data from local storage
			const localStorage = await chrome.storage.local.get(null);
			console.log('[PrivacyPanel] Local storage keys:', Object.keys(localStorage));
			
			// Get ALL usage logs from IndexedDB
			const usageLogsResponse = await chrome.runtime.sendMessage({ type: 'get-usage-logs' });
			const usageLogs = usageLogsResponse?.ok ? usageLogsResponse.data : [];
			console.log(`[PrivacyPanel] Found ${usageLogs.length} usage logs`);
			
			// Get advanced rules from RulesEngine
			let advancedRules = [];
			let urlPatterns = [];
			try {
				const { RulesEngine } = await import('../../storage/rulesEngine');
				advancedRules = await RulesEngine.getRules();
				urlPatterns = await RulesEngine.getURLPatterns();
				console.log(`[PrivacyPanel] Found ${advancedRules.length} advanced rules, ${urlPatterns.length} URL patterns`);
			} catch (error) {
				console.warn('[PrivacyPanel] Failed to get advanced rules:', error);
			}
			
			// Get goals from GoalTracker
			let userGoals = [];
			try {
				const { GoalTracker } = await import('../../storage/goalTracker');
				userGoals = await GoalTracker.getGoals();
				console.log(`[PrivacyPanel] Found ${userGoals.length} user goals`);
			} catch (error) {
				console.warn('[PrivacyPanel] Failed to get goals:', error);
			}
			
			// Create comprehensive export data
			const exportData = {
				version: '2.0.0', // Bumped version for comprehensive export
				exportedAt: new Date().toISOString(),
				metadata: {
					browserInfo: navigator.userAgent,
					exportedBy: 'FocusForge Privacy Panel',
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
					// Include any other preference keys
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
						!key.startsWith('backup_') && // Exclude backups
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
			
			console.log('[PrivacyPanel] Export data summary:', {
				limits: exportData.limits.length,
				categories: exportData.categories.length,
				domainCategories: Object.keys(exportData.domainCategories).length,
				advancedRules: exportData.advancedRules.length,
				urlPatterns: exportData.urlPatterns.length,
				userGoals: exportData.userGoals.length,
				usageLogs: exportData.usageLogs.length,
				additionalDataKeys: Object.keys(exportData.additionalData).length
			});
			
			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `focusforge-complete-backup-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
			
			console.log('[PrivacyPanel] Export completed successfully');
		} catch (error) {
			console.error('[PrivacyPanel] Export failed:', error);
			alert('Export failed. Please check the console for details and try again.');
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
			try {
				console.log('[PrivacyPanel] Starting comprehensive data import...');
				const text = await file.text();
				const importedData = JSON.parse(text);

				// Validate the imported data structure
				if (!importedData.version || !importedData.exportedAt) {
					throw new Error('Invalid backup file format - missing version or export date');
				}

				console.log(`[PrivacyPanel] Importing data version ${importedData.version} from ${importedData.exportedAt}`);

				// Create backup of current data before import
				const currentData = await chrome.storage.local.get(null);
				const backupKey = `backup_${Date.now()}`;
				await chrome.storage.local.set({ [backupKey]: currentData });
				console.log(`[PrivacyPanel] Created backup with key: ${backupKey}`);

				// Clear existing data
				await chrome.storage.local.clear();
				console.log('[PrivacyPanel] Cleared existing local storage');

				// Restore the backup key first
				await chrome.storage.local.set({ [backupKey]: currentData });

				// Import local storage data
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

				await chrome.storage.local.set(storageToImport);
				console.log(`[PrivacyPanel] Imported ${Object.keys(storageToImport).length} storage keys`);

				// Import usage logs to IndexedDB
				if (importedData.usageLogs && Array.isArray(importedData.usageLogs) && importedData.usageLogs.length > 0) {
					console.log(`[PrivacyPanel] Importing ${importedData.usageLogs.length} usage logs...`);
					
					// Clear existing usage logs first
					await new Promise<void>((resolve, reject) => {
						chrome.runtime.sendMessage({ type: 'clear-usage-logs' }, (response) => {
							if (response?.ok) {
								console.log('[PrivacyPanel] Cleared existing usage logs');
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
								console.log(`[PrivacyPanel] Successfully imported ${response.data.imported}/${response.data.total} usage logs`);
								resolve();
							} else {
								reject(new Error(`Failed to import usage logs: ${response?.error || 'Unknown error'}`));
							}
						});
					});
				}

				// Import advanced rules
				if (importedData.advancedRules && Array.isArray(importedData.advancedRules) && importedData.advancedRules.length > 0) {
					console.log(`[PrivacyPanel] Importing ${importedData.advancedRules.length} advanced rules...`);
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
						console.log('[PrivacyPanel] Advanced rules imported successfully');
					} catch (error) {
						console.warn('[PrivacyPanel] Failed to import advanced rules:', error);
					}
				}

				// Import URL patterns
				if (importedData.urlPatterns && Array.isArray(importedData.urlPatterns) && importedData.urlPatterns.length > 0) {
					console.log(`[PrivacyPanel] Importing ${importedData.urlPatterns.length} URL patterns...`);
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
						console.log('[PrivacyPanel] URL patterns imported successfully');
					} catch (error) {
						console.warn('[PrivacyPanel] Failed to import URL patterns:', error);
					}
				}

				// Import user goals
				if (importedData.userGoals && Array.isArray(importedData.userGoals) && importedData.userGoals.length > 0) {
					console.log(`[PrivacyPanel] Importing ${importedData.userGoals.length} user goals...`);
					try {
						const { GoalTracker } = await import('../../storage/goalTracker');
						
						// Import goals (GoalTracker handles duplicates)
						for (const goal of importedData.userGoals) {
							await GoalTracker.saveGoal(goal);
						}
						console.log('[PrivacyPanel] User goals imported successfully');
					} catch (error) {
						console.warn('[PrivacyPanel] Failed to import user goals:', error);
					}
				}

				console.log('[PrivacyPanel] Import completed successfully');
				alert('Data imported successfully! The page will reload to apply changes.');
				location.reload();
			} catch (error) {
				console.error('[PrivacyPanel] Import error:', error);
				alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please check that you selected a valid FocusForge backup file.`);
			} finally {
				setIsImporting(false);
			}
		};
		input.click();
	}

	async function toggleSync(): Promise<void> {
		setIsTogglingSync(true);
		try {
			const newSyncState = !syncEnabled;
			
			if (newSyncState) {
				// Enabling sync - migrate data from local to sync storage
				const localData = await chrome.storage.local.get(null);
				
				// Filter out large data that shouldn't be synced (like usage logs)
				const syncableData = Object.fromEntries(
					Object.entries(localData).filter(([key]) => 
						!key.startsWith('backup_') && 
						!key.includes('usageLogs') &&
						key !== 'usageCache'
					)
				);
				
				await chrome.storage.sync.set(syncableData);
				await chrome.storage.local.set({ syncEnabled: true });
				setSyncEnabled(true);
				alert('Chrome Sync enabled! Your settings will now sync across devices. Note: Usage logs remain local for privacy.');
			} else {
				// Disabling sync - keep data local only
				await chrome.storage.local.set({ syncEnabled: false });
				setSyncEnabled(false);
				alert('Chrome Sync disabled. All data will remain local to this device.');
			}
		} catch (error) {
			console.error('Error toggling sync:', error);
			alert('Error changing sync settings. Please try again.');
		} finally {
			setIsTogglingSync(false);
		}
	}

	async function eraseData(): Promise<void> {
		if (!confirm('Are you sure you want to erase ALL data? This action cannot be undone.')) return;
		setIsErasing(true);
		try {
			await chrome.storage.local.clear();
			if (syncEnabled) {
				await chrome.storage.sync.clear();
			}
			location.reload();
		} catch (error) {
			setIsErasing(false);
			alert('Error erasing data. Please try again.');
		}
	}

	return (
		<Box>
			<Typography variant="h4" fontWeight={900} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
				<SecurityIcon color="primary" />
				Privacy & Data
			</Typography>
			<Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
				Your privacy matters. All data is stored locally on your device by default.
			</Typography>

			<Alert severity="info" sx={{ mb: 4, borderRadius: 2 }}>
				<Typography variant="body2" fontWeight={600}>
					🔒 Local Storage: Your browsing data and settings are stored locally in your browser and never sent to external servers.
				</Typography>
			</Alert>

			<Card elevation={2} sx={{ mb: 3, borderRadius: 3 }}>
				<CardContent sx={{ p: 3 }}>
					<Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
						{syncEnabled ? <CloudIcon color="primary" /> : <CloudOffIcon color="disabled" />}
						Chrome Sync
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
						{syncEnabled 
							? 'Your settings and preferences are syncing across your Chrome devices. Usage logs remain local for privacy.'
							: 'Sync your settings and preferences across Chrome devices. Usage logs will remain local for privacy.'
						}
					</Typography>
					<FormControlLabel
						control={
							<Switch
								checked={syncEnabled}
								onChange={toggleSync}
								disabled={isTogglingSync}
								color="primary"
							/>
						}
						label={syncEnabled ? 'Sync Enabled' : 'Sync Disabled'}
						sx={{ mb: 0 }}
					/>
					{isTogglingSync && (
						<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
							{syncEnabled ? 'Disabling sync...' : 'Enabling sync...'}
						</Typography>
					)}
				</CardContent>
			</Card>

			<Stack spacing={3}>
				<Card elevation={2} sx={{ borderRadius: 3 }}>
					<CardContent sx={{ p: 3 }}>
						<Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
							<DownloadIcon color="primary" />
							Export Your Data
						</Typography>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
							Download a complete backup of your usage data, settings, and preferences in JSON format.
						</Typography>
						<Button
							variant="contained"
							startIcon={<DownloadIcon />}
							onClick={() => void exportData()}
							disabled={isExporting}
							size="large"
							sx={{ borderRadius: 2, px: 3 }}
						>
							{isExporting ? 'Exporting...' : 'Export Data'}
						</Button>
					</CardContent>
				</Card>

				<Card elevation={2} sx={{ borderRadius: 3 }}>
					<CardContent sx={{ p: 3 }}>
						<Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
							<UploadIcon color="secondary" />
							Import Your Data
						</Typography>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
							Restore your usage data, settings, and preferences from a previously exported JSON backup file.
						</Typography>
						<Alert severity="warning" sx={{ 
							mb: 3, 
							borderRadius: 2,
							backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 193, 7, 0.1)',
							border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.3)' : theme.palette.warning.light}`,
							'& .MuiAlert-icon': { 
								color: theme.palette.mode === 'dark' ? '#ffc107' : theme.palette.warning.main 
							}
						}}>
							<Typography variant="body2" fontWeight={600} sx={{ 
								color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' 
							}}>
								⚠️ Importing will replace all current data. Make sure to export your current data first if you want to keep it.
							</Typography>
						</Alert>
						<Button
							variant="outlined"
							startIcon={<UploadIcon />}
							onClick={() => void importData()}
							disabled={isImporting}
							size="large"
							sx={{ borderRadius: 2, px: 3 }}
						>
							{isImporting ? 'Importing...' : 'Import Data'}
						</Button>
					</CardContent>
				</Card>

				<Card elevation={2} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.error.light}` }}>
					<CardContent sx={{ p: 3 }}>
						<Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
							<DeleteForeverIcon />
							Erase All Data
						</Typography>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
							Permanently delete all your usage data, settings, and preferences. This action cannot be undone.
						</Typography>
						<Alert severity="warning" sx={{ 
							mb: 3, 
							borderRadius: 2,
							backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 193, 7, 0.1)',
							border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.3)' : theme.palette.warning.light}`,
							'& .MuiAlert-icon': { 
								color: theme.palette.mode === 'dark' ? '#ffc107' : theme.palette.warning.main 
							}
						}}>
							<Typography variant="body2" fontWeight={600} sx={{ 
								color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' 
							}}>
								⚠️ This will delete all your data permanently. Consider exporting your data first.
							</Typography>
						</Alert>
						<Button
							variant="outlined"
							color="error"
							startIcon={<DeleteForeverIcon />}
							onClick={() => void eraseData()}
							disabled={isErasing}
							size="large"
							sx={{ borderRadius: 2, px: 3 }}
						>
							{isErasing ? 'Erasing...' : 'Erase All Data'}
						</Button>
					</CardContent>
				</Card>

				<Card elevation={1} sx={{ borderRadius: 3, backgroundColor: theme.palette.background.paper }}>
					<CardContent sx={{ p: 3 }}>
						<Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: 'success.main' }}>
							🔒 Your Data Privacy
						</Typography>
						
						<Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
							<Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
								WE NEVER COLLECT, STORE, OR TRANSFER YOUR DATA
							</Typography>
							<Typography variant="body2">
								All your browsing data stays completely private on your device or Chrome sync (if enabled by you). 
								We never see, collect, store, or transfer any of your personal information.
							</Typography>
						</Alert>

						<Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
							Data Stored Locally {syncEnabled ? '& Chrome Sync' : 'Only'}:
						</Typography>
						<Stack spacing={2}>
							<Box>
								<Typography variant="subtitle2" fontWeight={600} color="primary.main">
									📊 Website Usage Analytics
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Domain names, time spent, and visit timestamps - stored locally for your personal analytics only
								</Typography>
							</Box>
							<Divider />
							<Box>
								<Typography variant="subtitle2" fontWeight={600} color="primary.main">
									⚙️ Your Settings & Preferences
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Limits, categories, scheduled rules, and UI preferences - all configured and stored by you
								</Typography>
							</Box>
							<Divider />
							<Box>
								<Typography variant="subtitle2" fontWeight={600} color="primary.main">
									🤖 AI Category Classifications
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Cached website categorizations - processed locally to improve performance, never sent anywhere
								</Typography>
							</Box>
							<Divider />
							<Box>
								<Typography variant="subtitle2" fontWeight={600} color="primary.main">
									🎮 Gamification Progress
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Your achievements, streaks, and goals - personal progress data stored locally
								</Typography>
							</Box>
						</Stack>

						{syncEnabled && (
							<Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
								<Typography variant="body2">
									<strong>Chrome Sync Enabled:</strong> Your settings (not usage logs) are synchronized across your Chrome browsers using Google's secure sync service. This is managed entirely by Chrome - we never have access to this data.
								</Typography>
							</Alert>
						)}
					</CardContent>
				</Card>
			</Stack>
		</Box>
	);
}