import React from 'react';
import {
	Box, Card, CardContent, Typography, Button, Grid, Alert, Stack, 
	Dialog, DialogTitle, DialogContent, DialogActions, TextField,
	List, ListItem, ListItemText, ListItemIcon, Chip
} from '@mui/material';
import ImportExportIcon from '@mui/icons-material/ImportExport';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import PresetIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { parseAndValidateImport } from '../utils/importExport';

interface ImportExportTabProps {
	onImport: () => void;
	theme: any;
}

const PRESET_CONFIGURATIONS = [
	{
		id: 'digital_wellness',
		name: 'Digital Wellness Starter',
		description: 'Basic limits for common distracting sites',
		limits: [
			{ targetType: 'site', targetId: 'facebook.com', minutes: 30, timeframe: 'daily' },
			{ targetType: 'site', targetId: 'instagram.com', minutes: 20, timeframe: 'daily' },
			{ targetType: 'site', targetId: 'twitter.com', minutes: 15, timeframe: 'daily' },
			{ targetType: 'category', targetId: 'Social', minutes: 60, timeframe: 'daily' }
		],
		rules: [],
		patterns: []
	},
	{
		id: 'work_focus',
		name: 'Work Hours Focus',
		description: 'Strict blocking during work hours with productivity focus',
		limits: [
			{ targetType: 'category', targetId: 'Entertainment', minutes: 0, timeframe: 'daily' },
			{ targetType: 'category', targetId: 'Social', minutes: 10, timeframe: 'daily' }
		],
		rules: [
			{
				name: 'Work Hours Social Block',
				schedule: { days: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00' },
				targets: [{ type: 'category', value: 'Social', action: 'block' }]
			}
		],
		patterns: [
			{ name: 'Block Gaming Sites', pattern: '*game*', type: 'contains', action: 'block' }
		]
	},
	{
		id: 'student_balance',
		name: 'Student Balance',
		description: 'Balanced approach for students with study periods',
		limits: [
			{ targetType: 'site', targetId: 'youtube.com', minutes: 45, timeframe: 'daily' },
			{ targetType: 'category', targetId: 'Social', minutes: 90, timeframe: 'daily' },
			{ targetType: 'category', targetId: 'Entertainment', minutes: 120, timeframe: 'daily' }
		],
		rules: [
			{
				name: 'Study Time Focus',
				schedule: { days: [1, 2, 3, 4, 5], startTime: '14:00', endTime: '18:00' },
				targets: [{ type: 'category', value: 'Entertainment', action: 'limit', limitMinutes: 15 }]
			}
		],
		patterns: []
	},
	{
		id: 'family_safe',
		name: 'Family Safe Browsing',
		description: 'Child-friendly internet with educational focus',
		limits: [
			{ targetType: 'category', targetId: 'Social', minutes: 30, timeframe: 'daily' },
			{ targetType: 'category', targetId: 'Entertainment', minutes: 60, timeframe: 'daily' }
		],
		rules: [
			{
				name: 'Evening Wind Down',
				schedule: { days: [0, 1, 2, 3, 4, 5, 6], startTime: '20:00', endTime: '23:59' },
				targets: [{ type: 'category', value: 'Entertainment', action: 'block' }]
			}
		],
		patterns: [
			{ name: 'Block Adult Content', pattern: '*(adult|explicit)*', type: 'glob', action: 'block' }
		]
	}
];

export default function ImportExportTab({ onImport, theme }: ImportExportTabProps): React.ReactElement {
	const [showPresetDialog, setShowPresetDialog] = React.useState(false);
	const [selectedPreset, setSelectedPreset] = React.useState<any>(null);
	const [importData, setImportData] = React.useState('');
	const [showImportDialog, setShowImportDialog] = React.useState(false);
	const [importError, setImportError] = React.useState('');
	const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
	const fileInputRef = React.useRef<HTMLInputElement>(null);

	const [exportError, setExportError] = React.useState<string>('');
	const [isExporting, setIsExporting] = React.useState(false);
	const [exportSuccess, setExportSuccess] = React.useState(false);

	const handleExportAll = async (retryCount = 0) => {
		setIsExporting(true);
		setExportError('');
		setExportSuccess(false);

		try {
			// Get all current data with timeout
			const storage = await Promise.race([
				chrome.storage.local.get(null),
				new Promise((_, reject) => setTimeout(() => reject(new Error('Storage access timeout')), 5000))
			]) as any;

			// Get usage logs data
			let usageLogs = [];
			try {
				const logsResponse = await new Promise<any>((resolve) => {
					chrome.runtime.sendMessage({ type: 'get-usage-logs' }, (response) => {
						resolve(response);
					});
				});
				usageLogs = logsResponse?.ok ? logsResponse.data : [];
				console.log(`[ImportExport] Including ${usageLogs.length} usage logs in export`);
			} catch (error) {
				console.warn('[ImportExport] Failed to get usage logs for export:', error);
			}

			const exportData = {
				version: '1.1.0', // Bumped version to include usage logs
				exportedAt: new Date().toISOString(),
				limits: storage.limits || [],
				advancedRules: storage.advancedRules || [],
				urlPatterns: storage.urlPatterns || [],
				categories: storage.categories || [],
				domainCategories: storage.domainCategories || {},
				userGoals: storage.userGoals || [],
				gamification: storage.gamification || {},
				usageLogs: usageLogs // Include usage history
			};

			// Validate export data
			if (!exportData.limits && !exportData.advancedRules && !exportData.urlPatterns) {
				throw new Error('No data found to export. Please configure some limits first.');
			}

			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `focusforge-config-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);

			setExportSuccess(true);
			setTimeout(() => setExportSuccess(false), 3000);
		} catch (error: any) {
			console.error('Export failed:', error);
			const errorMessage = error.message || 'Export failed due to an unknown error';
			
			if (retryCount < 2) {
				setExportError(`${errorMessage}. Retrying... (${retryCount + 1}/3)`);
				setTimeout(() => handleExportAll(retryCount + 1), 1000);
			} else {
				setExportError(`${errorMessage}. Please check your browser permissions and try again.`);
			}
		} finally {
			setIsExporting(false);
		}
	};

	const [isImporting, setIsImporting] = React.useState(false);
	const [importSuccess, setImportSuccess] = React.useState(false);

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
				setImportError('Please select a valid JSON file');
				return;
			}
			setSelectedFile(file);
			setImportError('');
			
			// Read file content
			const reader = new FileReader();
			reader.onload = (e) => {
				const content = e.target?.result as string;
				setImportData(content);
			};
			reader.onerror = () => {
				setImportError('Failed to read file');
			};
			reader.readAsText(file);
		}
	};

	const handleFileUploadClick = () => {
		fileInputRef.current?.click();
	};

	const handleImportData = async (retryCount = 0) => {
		setIsImporting(true);
		setImportError('');
		setImportSuccess(false);

		try {
			// Parse, validate, and sanitize using utility
			const { updates: validated } = parseAndValidateImport(importData);

			// Only persist known keys to storage
			const updates: any = {};
			if (validated.limits) updates.limits = validated.limits;
			if (validated.advancedRules) updates.advancedRules = validated.advancedRules;
			if (validated.urlPatterns) updates.urlPatterns = validated.urlPatterns;
			if (validated.categories) updates.categories = validated.categories;
			if (validated.domainCategories) updates.domainCategories = validated.domainCategories;
			if (validated.userGoals) updates.userGoals = validated.userGoals;
			if (validated.gamification) updates.gamification = validated.gamification;

			// Save configuration data with timeout protection
			await Promise.race([
				chrome.storage.local.set(updates),
				new Promise((_, reject) => setTimeout(() => reject(new Error('Storage save timeout')), 5000))
			]);

			// Import usage logs if present (send to background for IndexedDB)
			if (validated.usageLogs && validated.usageLogs.length > 0) {
				console.log(`[ImportExport] Importing ${validated.usageLogs.length} usage logs...`);
				await new Promise<void>((resolve, reject) => {
					chrome.runtime.sendMessage({ 
						type: 'import-usage-logs', 
						payload: { logs: validated.usageLogs } 
					}, (response) => {
						if (response?.ok) {
							console.log(`[ImportExport] Successfully imported ${validated.usageLogs.length} usage logs`);
							resolve();
						} else {
							reject(new Error(`Failed to import usage logs: ${response?.error || 'Unknown error'}`));
						}
					});
				});
			}

			setImportSuccess(true);
			setShowImportDialog(false);
			setImportData('');
			onImport();
			
			setTimeout(() => setImportSuccess(false), 5000);
		} catch (error: any) {
			console.error('Import failed:', error);
			const errorMessage = error.message || 'Import failed due to an unknown error';
			
			if (retryCount < 2) {
				setImportError(`${errorMessage}. Retrying... (${retryCount + 1}/3)`);
				setTimeout(() => handleImportData(retryCount + 1), 1000);
			} else {
				setImportError(`${errorMessage}. Please verify your configuration file and try again.`);
			}
		} finally {
			setIsImporting(false);
		}
	};

	const handleApplyPreset = async () => {
		if (!selectedPreset) return;

		try {
			const updates: any = {};
			
			// Apply limits
			if (selectedPreset.limits?.length > 0) {
				const existingLimits = await new Promise<any[]>((resolve) => {
					chrome.runtime.sendMessage({ type: 'get-limits' }, (res) => {
						resolve(res?.ok ? res.data : []);
					});
				});

				// Add preset limits
				for (const limit of selectedPreset.limits) {
					const id = `${limit.targetType}:${limit.targetId}:${limit.timeframe}`;
					const payload = {
						id,
						limitMinutes: limit.minutes,
						timeframe: limit.timeframe,
						targetType: limit.targetType,
						targetId: limit.targetId,
						displayName: limit.targetId
					};
					await new Promise((resolve) => 
						chrome.runtime.sendMessage({ type: 'set-limit', payload }, () => resolve(undefined))
					);
				}
			}

			// Apply rules and patterns if they exist
			if (selectedPreset.rules?.length > 0) {
				const { RulesEngine } = await import('../storage/rulesEngine');
				for (const rule of selectedPreset.rules) {
					const ruleObj = {
						id: `preset_rule_${Date.now()}_${Math.random()}`,
						enabled: true,
						priority: 1,
						createdAt: new Date(),
						updatedAt: new Date(),
						...rule
					};
					await RulesEngine.saveRule(ruleObj);
				}
			}

			if (selectedPreset.patterns?.length > 0) {
				const { RulesEngine } = await import('../storage/rulesEngine');
				for (const pattern of selectedPreset.patterns) {
					const patternObj = {
						id: `preset_pattern_${Date.now()}_${Math.random()}`,
						enabled: true,
						createdAt: new Date(),
						...pattern
					};
					await RulesEngine.saveURLPattern(patternObj);
				}
			}

			setShowPresetDialog(false);
			setSelectedPreset(null);
			onImport();
			
			alert(`"${selectedPreset.name}" configuration applied successfully!`);
		} catch (error) {
			console.error('Failed to apply preset:', error);
			alert('Failed to apply preset. Please try again.');
		}
	};

	return (
		<Box>
			{/* Subtle Header */}
			<Card sx={{ 
				mb: 3, 
				borderRadius: 3,
				border: `1px solid ${theme.palette.divider}`,
				background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
				boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
			}}>
				<CardContent sx={{ p: 4 }}>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
						<Box sx={{
							width: 48,
							height: 48,
							borderRadius: '12px',
							background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.light} 100%)`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							boxShadow: `0 4px 12px ${theme.palette.info.main}25`
						}}>
							<ImportExportIcon sx={{ fontSize: 24, color: 'white' }} />
						</Box>
						<Box>
							<Typography variant="h5" fontWeight={700} sx={{ 
								mb: 0.5,
								background: `linear-gradient(45deg, ${theme.palette.text.primary} 60%, ${theme.palette.info.main} 100%)`,
								WebkitBackgroundClip: 'text',
								WebkitTextFillColor: 'transparent',
								backgroundClip: 'text'
							}}>
								Import & Export
							</Typography>
							<Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
								Backup, restore, and manage your configurations
							</Typography>
						</Box>
					</Box>
				</CardContent>
			</Card>

			{/* Export Section */}
			<Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
				<CardContent sx={{ p: 4 }}>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
						<Box sx={{
							width: 40,
							height: 40,
							borderRadius: '10px',
							background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							boxShadow: `0 4px 12px ${theme.palette.primary.main}25`
						}}>
							<DownloadIcon sx={{ fontSize: 20, color: 'white' }} />
						</Box>
						<Box>
							<Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
								Export Configuration
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Save your current limits, rules, and settings
							</Typography>
						</Box>
					</Box>
					
					<Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
						<Typography variant="body2">
							Export includes all limits, scheduled rules, URL patterns, categories, goals, and gamification progress.
						</Typography>
					</Alert>
					
					{exportError && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{exportError}
						</Alert>
					)}
					{exportSuccess && (
						<Alert severity="success" sx={{ mb: 2 }}>
							Configuration exported successfully! Check your downloads folder.
						</Alert>
					)}
					
					<Button
						startIcon={<DownloadIcon />}
						onClick={handleExportAll}
						variant="contained"
						disabled={isExporting}
						sx={{
							borderRadius: 2.5,
							textTransform: 'none',
							fontWeight: 600,
							px: 3,
							py: 1.5,
							background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
							boxShadow: `0 4px 12px ${theme.palette.primary.main}40`,
							'&:hover': {
								background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
								boxShadow: `0 6px 16px ${theme.palette.primary.main}50`,
								transform: 'translateY(-1px)'
							}
						}}
					>
						{isExporting ? 'Exporting...' : 'Export All Settings'}
					</Button>
				</CardContent>
			</Card>

			{/* Import Section */}
			<Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
				<CardContent sx={{ p: 4 }}>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
						<Box sx={{
							width: 40,
							height: 40,
							borderRadius: '10px',
							background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							boxShadow: `0 4px 12px ${theme.palette.success.main}25`
						}}>
							<UploadIcon sx={{ fontSize: 20, color: 'white' }} />
						</Box>
						<Box>
							<Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
								Import Configuration
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Restore settings from a previous export
							</Typography>
						</Box>
					</Box>
					
					<Alert severity="warning" sx={{ 
						mb: 3, 
						borderRadius: 2,
						backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 193, 7, 0.1)',
						border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.3)' : theme.palette.warning.light}`,
						'& .MuiAlert-icon': { 
							color: theme.palette.mode === 'dark' ? '#ffc107' : theme.palette.warning.main 
						}
					}}>
						<Typography variant="body2" sx={{ 
							color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' 
						}}>
							⚠️ Importing will merge with existing settings. Conflicts may override current configurations.
						</Typography>
					</Alert>
					
					{importSuccess && (
						<Alert severity="success" sx={{ mb: 2 }}>
							Configuration imported successfully!
						</Alert>
					)}
					
					<Button
						variant="outlined"
						startIcon={<UploadIcon />}
						onClick={() => setShowImportDialog(true)}
						sx={{
							borderRadius: 2.5,
							textTransform: 'none',
							fontWeight: 600,
							px: 3,
							py: 1.5,
							borderColor: theme.palette.success.main,
							color: theme.palette.success.main,
							'&:hover': {
								borderColor: theme.palette.success.dark,
								backgroundColor: `${theme.palette.success.main}10`,
								transform: 'translateY(-1px)'
							}
						}}
					>
						Import Settings
					</Button>
				</CardContent>
			</Card>

			{/* Preset Configurations */}
			<Card sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
				<CardContent sx={{ p: 4 }}>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
						<Box sx={{
							width: 40,
							height: 40,
							borderRadius: '10px',
							background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.light} 100%)`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							boxShadow: `0 4px 12px ${theme.palette.warning.main}25`
						}}>
							<PresetIcon sx={{ fontSize: 20, color: 'white' }} />
						</Box>
						<Box>
							<Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
								Preset Configurations
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Quick-start templates for common use cases
							</Typography>
						</Box>
					</Box>
					
					<Grid container spacing={2}>
						{PRESET_CONFIGURATIONS.map((preset, index) => (
							<Grid item xs={12} sm={6} key={preset.id}>
								<Card
									sx={{
										cursor: 'pointer',
										borderRadius: 2.5,
										border: `1px solid ${theme.palette.divider}`,
										transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
										'&:hover': {
											transform: 'translateY(-2px)',
											boxShadow: `0 8px 25px ${theme.palette.action.selected}`,
											borderColor: theme.palette.primary.main
										}
									}}
									onClick={() => {
										setSelectedPreset(preset);
										setShowPresetDialog(true);
									}}
								>
									<CardContent sx={{ p: 3 }}>
										<Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
											{preset.name}
										</Typography>
										<Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
											{preset.description}
										</Typography>
										<Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
											<Chip label={`${preset.limits.length} limits`} size="small" color="primary" variant="outlined" />
											{preset.rules.length > 0 && (
												<Chip label={`${preset.rules.length} rules`} size="small" color="secondary" variant="outlined" />
											)}
											{preset.patterns.length > 0 && (
												<Chip label={`${preset.patterns.length} patterns`} size="small" color="success" variant="outlined" />
											)}
										</Stack>
									</CardContent>
								</Card>
							</Grid>
						))}
					</Grid>
				</CardContent>
			</Card>

			{/* Import Dialog */}
			<Dialog 
				open={showImportDialog} 
				onClose={() => {
					setShowImportDialog(false);
					setSelectedFile(null);
					setImportData('');
					setImportError('');
				}} 
				maxWidth="sm" 
				fullWidth
				sx={{
					'& .MuiDialog-paper': {
						maxHeight: '80vh',
						overflow: 'visible'
					}
				}}
			>
				<DialogTitle>Import Configuration</DialogTitle>
				<DialogContent>
					<Typography variant="body2" sx={{ mb: 3 }}>
						Select your exported JSON configuration file:
					</Typography>
					
					<input
						type="file"
						accept=".json,application/json"
						onChange={handleFileSelect}
						ref={fileInputRef}
						style={{ display: 'none' }}
					/>
					
					<Box sx={{ 
						border: '2px dashed',
						borderColor: importError ? 'error.main' : selectedFile ? 'success.main' : 'divider',
						borderRadius: 2,
						p: 4,
						textAlign: 'center',
						cursor: 'pointer',
						transition: 'all 0.3s',
						backgroundColor: selectedFile ? 'success.50' : 'action.hover',
						'&:hover': {
							borderColor: importError ? 'error.dark' : selectedFile ? 'success.dark' : 'primary.main',
							backgroundColor: selectedFile ? 'success.100' : 'action.selected'
						}
					}}
					onClick={handleFileUploadClick}
					>
						<UploadIcon sx={{ 
							fontSize: 48, 
							color: importError ? 'error.main' : selectedFile ? 'success.main' : 'text.secondary',
							mb: 2
						}} />
						<Typography variant="h6" sx={{ mb: 1 }}>
							{selectedFile ? selectedFile.name : 'Click to select file'}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{selectedFile ? 'File loaded successfully' : 'Choose a JSON file exported from FocusForge'}
						</Typography>
					</Box>
					
					{importError && (
						<Alert severity="error" sx={{ mt: 2 }}>
							{importError}
						</Alert>
					)}
					
					{selectedFile && importData && (
						<Alert severity="info" sx={{ mt: 2 }}>
							<Typography variant="body2">
								Ready to import {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
							</Typography>
						</Alert>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => {
						setShowImportDialog(false);
						setSelectedFile(null);
						setImportData('');
						setImportError('');
					}} disabled={isImporting}>
						Cancel
					</Button>
					<Button
						onClick={() => handleImportData()}
						variant="contained"
						disabled={!selectedFile || !importData.trim() || isImporting}
					>
						{isImporting ? 'Importing...' : 'Import'}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Preset Preview Dialog */}
			<Dialog 
				open={showPresetDialog} 
				onClose={() => setShowPresetDialog(false)} 
				maxWidth="md" 
				fullWidth
				disableScrollLock
				disablePortal
				disableEnforceFocus
				disableAutoFocus
				disableRestoreFocus
				BackdropProps={{
					style: { position: 'fixed' }
				}}
				PaperProps={{
					style: { 
						position: 'fixed',
						top: '10vh',
						margin: 0,
						maxHeight: '80vh',
						overflow: 'auto'
					}
				}}
			>
				<DialogTitle>
					{selectedPreset?.name}
				</DialogTitle>
				<DialogContent>
					<Typography variant="body1" sx={{ mb: 3 }}>
						{selectedPreset?.description}
					</Typography>

					{selectedPreset?.limits?.length > 0 && (
						<>
							<Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
								Limits ({selectedPreset.limits.length})
							</Typography>
							<List dense sx={{ mb: 3 }}>
								{selectedPreset.limits.map((limit: any, index: number) => (
									<ListItem key={index} sx={{ py: 0.5 }}>
										<ListItemIcon>
											<CheckCircleIcon color="primary" fontSize="small" />
										</ListItemIcon>
										<ListItemText
											primary={`${limit.targetId} - ${limit.minutes} minutes ${limit.timeframe}`}
											secondary={limit.targetType === 'site' ? 'Website' : 'Category'}
										/>
									</ListItem>
								))}
							</List>
						</>
					)}

					{selectedPreset?.rules?.length > 0 && (
						<>
							<Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
								Scheduled Rules ({selectedPreset.rules.length})
							</Typography>
							<List dense sx={{ mb: 3 }}>
								{selectedPreset.rules.map((rule: any, index: number) => (
									<ListItem key={index} sx={{ py: 0.5 }}>
										<ListItemIcon>
											<CheckCircleIcon color="secondary" fontSize="small" />
										</ListItemIcon>
										<ListItemText
											primary={rule.name}
											secondary={`${rule.schedule.startTime}-${rule.schedule.endTime}`}
										/>
									</ListItem>
								))}
							</List>
						</>
					)}

					{selectedPreset?.patterns?.length > 0 && (
						<>
							<Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
								URL Patterns ({selectedPreset.patterns.length})
							</Typography>
							<List dense>
								{selectedPreset.patterns.map((pattern: any, index: number) => (
									<ListItem key={index} sx={{ py: 0.5 }}>
										<ListItemIcon>
											<CheckCircleIcon color="success" fontSize="small" />
										</ListItemIcon>
										<ListItemText
											primary={pattern.name}
											secondary={pattern.pattern}
										/>
									</ListItem>
								))}
							</List>
						</>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowPresetDialog(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleApplyPreset}
						variant="contained"
						color="primary"
					>
						Apply Configuration
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}