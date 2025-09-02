import React from 'react';
import {
	Box, Card, CardContent, Typography, Button, Grid, IconButton, Chip, Dialog,
	DialogTitle, DialogContent, DialogActions, TextField, FormControlLabel, Checkbox,
	MenuItem, Stack, Alert, Tooltip, FormControl, InputLabel, Select, Autocomplete
} from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { TimeRule, RulesEngine } from '../storage/rulesEngine';

interface ScheduledRulesTabProps {
	scheduleRules: TimeRule[];
	onRefresh: () => void;
	theme: any;
}

const DAYS_OF_WEEK = [
	{ value: 0, label: 'Sunday', short: 'Sun' },
	{ value: 1, label: 'Monday', short: 'Mon' },
	{ value: 2, label: 'Tuesday', short: 'Tue' },
	{ value: 3, label: 'Wednesday', short: 'Wed' },
	{ value: 4, label: 'Thursday', short: 'Thu' },
	{ value: 5, label: 'Friday', short: 'Fri' },
	{ value: 6, label: 'Saturday', short: 'Sat' }
];

const PRESET_RULES = [
	{
		name: 'Work Hours Focus',
		schedule: { days: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00' },
		targets: [{ type: 'category', value: 'Social', action: 'block' }]
	},
	{
		name: 'Evening Wind Down',
		schedule: { days: [0, 1, 2, 3, 4, 5, 6], startTime: '21:00', endTime: '23:59' },
		targets: [{ type: 'category', value: 'Entertainment', action: 'limit', limitMinutes: 30 }]
	}
];

export default function ScheduledRulesTab({ scheduleRules, onRefresh, theme }: ScheduledRulesTabProps): React.ReactElement {
	const [showRuleDialog, setShowRuleDialog] = React.useState(false);
	const [editingRule, setEditingRule] = React.useState<TimeRule | null>(null);
	const [isLoading, setIsLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [isMounted, setIsMounted] = React.useState(false);
	const [newRule, setNewRule] = React.useState<Partial<TimeRule>>({
		name: '',
		enabled: true,
		schedule: { days: [], startTime: '09:00', endTime: '17:00' },
		targets: [{ type: 'domain', value: '', action: 'block' }],
		priority: 1
	});
	const [availableCategories, setAvailableCategories] = React.useState<string[]>([]);

	// Ensure component is properly mounted before showing dialogs
	React.useEffect(() => {
		setIsMounted(true);
		return () => setIsMounted(false);
	}, []);

	// Safely handle dialog operations
	const safeSetShowRuleDialog = React.useCallback((show: boolean) => {
		if (!isMounted) return;
		
		try {
			setShowRuleDialog(show);
			if (!show) {
				// Reset form when closing
				setNewRule({
					name: '',
					enabled: true,
					schedule: { days: [], startTime: '09:00', endTime: '17:00' },
					targets: [{ type: 'domain', value: '', action: 'block' }],
					priority: 1
				});
				setEditingRule(null);
				setError(null);
			} else {
				// Load categories when opening (call directly to avoid dependency issues)
				const loadCategoriesAsync = async () => {
					try {
						const { categories = {}, domainCategories = {} } = await chrome.storage.local.get(['categories', 'domainCategories']);
						
						// Get user-defined categories
						const userCategories = Object.keys(categories);
						
						// Get categories from domain assignments - ensure they are strings
						const assignedCategories = [...new Set(Object.values(domainCategories) as string[])]
							.filter(cat => typeof cat === 'string' && cat.trim().length > 0);
						
						// Combine and remove duplicates, filter out invalid entries
						const allCategories = [...new Set([...userCategories, ...assignedCategories])]
							.filter(cat => typeof cat === 'string' && cat.trim().length > 0 && isNaN(Number(cat)));
						
						setAvailableCategories(allCategories.sort());
					} catch (error) {
						console.error('Failed to load categories:', error);
					}
				};
				loadCategoriesAsync();
			}
		} catch (err) {
			console.error('Error managing dialog state:', err);
			setError('Failed to manage dialog state');
		}
	}, [isMounted]);

	const handleSaveRule = React.useCallback(async () => {
		if (!newRule.name || !newRule.schedule?.days.length || !newRule.targets?.[0]?.value) return;

		setIsLoading(true);
		setError(null);

		try {
			const rule: TimeRule = {
				id: editingRule?.id || `rule_${Date.now()}`,
				name: newRule.name,
				enabled: newRule.enabled ?? true,
				schedule: newRule.schedule!,
				targets: newRule.targets!,
				priority: newRule.priority ?? 1,
				createdAt: editingRule?.createdAt || new Date(),
				updatedAt: new Date()
			};

			await RulesEngine.saveRule(rule);
			safeSetShowRuleDialog(false);
			onRefresh();
		} catch (err) {
			console.error('Failed to save rule:', err);
			setError('Failed to save rule. Please try again.');
		} finally {
			setIsLoading(false);
		}
	}, [newRule, editingRule, onRefresh, safeSetShowRuleDialog]);

	const handleDeleteRule = React.useCallback(async (ruleId: string) => {
		setIsLoading(true);
		try {
			await RulesEngine.deleteRule(ruleId);
			onRefresh();
		} catch (err) {
			console.error('Failed to delete rule:', err);
			setError('Failed to delete rule. Please try again.');
		} finally {
			setIsLoading(false);
		}
	}, [onRefresh]);

	const handleToggleRule = React.useCallback(async (rule: TimeRule) => {
		setIsLoading(true);
		try {
			await RulesEngine.saveRule({ ...rule, enabled: !rule.enabled });
			onRefresh();
		} catch (err) {
			console.error('Failed to toggle rule:', err);
			setError('Failed to toggle rule. Please try again.');
		} finally {
			setIsLoading(false);
		}
	}, [onRefresh]);

	const loadCategories = React.useCallback(async () => {
		try {
			const { categories = {}, domainCategories = {} } = await chrome.storage.local.get(['categories', 'domainCategories']);
			
			// Get user-defined categories
			const userCategories = Object.keys(categories);
			
			// Get categories from domain assignments
			const assignedCategories = [...new Set(Object.values(domainCategories) as string[])];
			
			// Combine and remove duplicates
			const allCategories = [...new Set([...userCategories, ...assignedCategories])].filter(Boolean);
			
			setAvailableCategories(allCategories.sort());
		} catch (error) {
			console.error('Failed to load categories:', error);
		}
	}, []);

	const handleEditRule = React.useCallback((rule: TimeRule) => {
		try {
			setEditingRule(rule);
			setNewRule(rule);
			safeSetShowRuleDialog(true);
		} catch (err) {
			console.error('Failed to edit rule:', err);
			setError('Failed to load rule for editing.');
		}
	}, [safeSetShowRuleDialog]);

	const formatDays = (days: number[]) => {
		if (days.length === 7) return 'Every day';
		if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) return 'Weekdays';
		if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
		return days.map(d => DAYS_OF_WEEK[d]?.short || '').filter(Boolean).join(', ');
	};

	return (
		<>
			{/* Error Display */}
			{error && (
				<Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}
	
			{/* Header with Add Button */}
			<Card sx={{ mb: 3, borderRadius: 3, border: 1, borderColor: 'divider' }}>
					<CardContent sx={{ p: 4 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
								<Box sx={{
									width: 56,
									height: 56,
									borderRadius: '16px',
									background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									boxShadow: `0 4px 16px ${theme.palette.primary.main}40`,
									position: 'relative',
									'&::before': {
										content: '""',
										position: 'absolute',
										top: -2,
										left: -2,
										right: -2,
										bottom: -2,
										borderRadius: '18px',
										background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
										zIndex: -1,
										opacity: 0.3
									}
								}}>
									<ScheduleIcon sx={{ fontSize: 32, color: 'white' }} />
								</Box>
								<Box>
									<Typography variant="h4" fontWeight={800} sx={{ 
										mb: 0.5, 
										fontSize: '1.5rem',
										background: `linear-gradient(45deg, ${theme.palette.text.primary} 60%, ${theme.palette.primary.main} 100%)`,
										WebkitBackgroundClip: 'text',
										WebkitTextFillColor: 'transparent',
										backgroundClip: 'text'
									}}>
										Scheduled Rules ({scheduleRules.length})
									</Typography>
									<Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem', fontWeight: 500 }}>
										Set time-based blocking and limits with precision control
									</Typography>
								</Box>
							</Box>
							<Button
								variant="contained"
								startIcon={<AddIcon />}
								onClick={() => safeSetShowRuleDialog(true)}
								size="large"
								disabled={isLoading}
								sx={{
									borderRadius: 3,
									textTransform: 'none',
									fontWeight: 600,
									px: 3,
									py: 1.5,
									background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
									boxShadow: `0 4px 16px ${theme.palette.primary.main}40`,
									'&:hover': {
										background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
										boxShadow: `0 6px 20px ${theme.palette.primary.main}60`,
										transform: 'translateY(-1px)'
									}
								}}
							>
								Add Rule
							</Button>
						</Box>

					{/* Preset Rules Quick Add */}
					<Alert 
						severity="info" 
						sx={{ 
							borderRadius: 3, 
							mb: 2,
							border: `2px solid ${theme.palette.info.light}`,
							background: `linear-gradient(135deg, ${theme.palette.info.light}20 0%, ${theme.palette.info.light}10 100%)`,
							boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
						}}
					>
						<Typography variant="body1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
							⚡ Quick Start Templates:
						</Typography>
						<Stack direction="row" spacing={2} flexWrap="wrap">
							{PRESET_RULES.map((preset, index) => (
								<Chip
									key={index}
									label={preset.name}
									variant="outlined"
									size="medium"
									clickable
									color="primary"
									onClick={() => {
										try {
											setNewRule({
												name: preset.name,
												enabled: true,
												schedule: preset.schedule,
												targets: preset.targets as any,
												priority: 1
											});
											safeSetShowRuleDialog(true);
										} catch (err) {
											console.error('Failed to load preset:', err);
											setError('Failed to load preset template.');
										}
									}}
									sx={{ 
										mb: 1, 
										minWidth: 'auto',
										borderRadius: 2.5,
										fontWeight: 600,
										transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
										'&:hover': {
											transform: 'translateY(-1px)',
											boxShadow: `0 4px 12px ${theme.palette.primary.main}40`,
										}
									}}
								/>
							))}
						</Stack>
					</Alert>
				</CardContent>
			</Card>

			{/* Rules List */}
			{scheduleRules.length === 0 ? (
				<Card sx={{ borderRadius: 3, textAlign: 'center', py: 4 }}>
					<CardContent>
						<ScheduleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
						<Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
							No scheduled rules
						</Typography>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
							Create time-based rules to automatically block or limit sites during specific hours
						</Typography>
						<Button
							variant="contained"
							startIcon={<AddIcon />}
							onClick={() => safeSetShowRuleDialog(true)}
							sx={{ borderRadius: 2 }}
							disabled={isLoading}
						>
							Create First Rule
						</Button>
					</CardContent>
				</Card>
			) : (
				<Grid container spacing={2}>
					{scheduleRules.map((rule) => (
						<Grid item xs={12} key={rule.id}>
							<Card
								sx={{
									borderRadius: 2.5,
									border: `1px solid ${theme.palette.divider}`,
									opacity: rule.enabled ? 1 : 0.6,
									transition: 'all 0.2s ease'
								}}
							>
								<CardContent sx={{ p: 3 }}>
									<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
										<Box sx={{ flex: 1 }}>
											<Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
												{rule.name}
											</Typography>
											<Stack direction="row" spacing={2} sx={{ mb: 2 }}>
												<Chip
													label={formatDays(rule.schedule.days)}
													size="small"
													color="primary"
													variant="outlined"
												/>
												<Chip
													label={`${rule.schedule.startTime} - ${rule.schedule.endTime}`}
													size="small"
													color="secondary"
													variant="outlined"
												/>
												<Chip
													label={rule.enabled ? 'Active' : 'Disabled'}
													size="small"
													color={rule.enabled ? 'success' : 'default'}
												/>
											</Stack>
											<Box>
												{rule.targets.map((target, index) => (
													<Typography key={index} variant="body2" color="text.secondary">
														{target.action === 'block' ? '🚫' : '⏱️'} {target.type}: {target.value}
														{target.limitMinutes && ` (${target.limitMinutes} min)`}
													</Typography>
												))}
											</Box>
										</Box>
										<Stack direction="row" spacing={1}>
											<Tooltip title={rule.enabled ? 'Disable' : 'Enable'}>
												<IconButton
													onClick={() => handleToggleRule(rule)}
													size="small"
													color={rule.enabled ? 'success' : 'default'}
													disabled={isLoading}
												>
													{rule.enabled ? '⏸️' : '▶️'}
												</IconButton>
											</Tooltip>
											<Tooltip title="Edit">
												<IconButton
													onClick={() => handleEditRule(rule)}
													size="small"
													color="primary"
													disabled={isLoading}
												>
													<EditIcon fontSize="small" />
												</IconButton>
											</Tooltip>
											<Tooltip title="Delete">
												<IconButton
													onClick={() => handleDeleteRule(rule.id)}
													size="small"
													color="error"
													disabled={isLoading}
												>
													<DeleteIcon fontSize="small" />
												</IconButton>
											</Tooltip>
										</Stack>
									</Box>
								</CardContent>
							</Card>
						</Grid>
					))}
				</Grid>
			)}

			{/* Add/Edit Rule Dialog - Only render when mounted */}
			{isMounted && (
				<Dialog 
				open={showRuleDialog} 
				onClose={() => setShowRuleDialog(false)} 
				maxWidth="md" 
				fullWidth
				sx={{
					'& .MuiDialog-paper': {
						maxHeight: '90vh',
						overflow: 'visible'
					}
				}}
			>
				<DialogTitle>
					{editingRule ? 'Edit Scheduled Rule' : 'Create Scheduled Rule'}
				</DialogTitle>
				<DialogContent>
					<Grid container spacing={3} sx={{ mt: 1 }}>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Rule Name"
								value={newRule.name || ''}
								onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
								placeholder="e.g., Work Hours Focus"
							/>
						</Grid>

						<Grid item xs={12}>
							<Typography variant="subtitle2" sx={{ mb: 1 }}>Days of Week</Typography>
							<Stack direction="row" spacing={1} flexWrap="wrap">
								{DAYS_OF_WEEK.map((day) => (
									<FormControlLabel
										key={day.value}
										control={
											<Checkbox
												checked={newRule.schedule?.days.includes(day.value) || false}
												onChange={(e) => {
													const days = newRule.schedule?.days || [];
													const newDays = e.target.checked
														? [...days, day.value]
														: days.filter(d => d !== day.value);
													setNewRule({
														...newRule,
														schedule: { ...newRule.schedule!, days: newDays }
													});
												}}
											/>
										}
										label={day.short}
									/>
								))}
							</Stack>
						</Grid>

						<Grid item xs={6}>
							<TextField
								fullWidth
								label="Start Time"
								type="time"
								value={newRule.schedule?.startTime || '09:00'}
								onChange={(e) => setNewRule({
									...newRule,
									schedule: { ...newRule.schedule!, startTime: e.target.value }
								})}
								InputLabelProps={{ shrink: true }}
							/>
						</Grid>

						<Grid item xs={6}>
							<TextField
								fullWidth
								label="End Time"
								type="time"
								value={newRule.schedule?.endTime || '17:00'}
								onChange={(e) => setNewRule({
									...newRule,
									schedule: { ...newRule.schedule!, endTime: e.target.value }
								})}
								InputLabelProps={{ shrink: true }}
							/>
						</Grid>

						<Grid item xs={6}>
							<FormControl fullWidth>
								<InputLabel>Target Type</InputLabel>
								<Select
									value={newRule.targets?.[0]?.type || 'domain'}
									label="Target Type"
									onChange={(e) => {
										setNewRule({
											...newRule,
											targets: [{
												type: e.target.value as any,
												value: newRule.targets?.[0]?.value || '',
												action: newRule.targets?.[0]?.action || 'block'
											}]
										});
									}}
									disabled={isLoading}
									MenuProps={{
										PaperProps: {
											style: {
												maxHeight: 224,
												zIndex: 9999,
											},
										},
									}}
								>
									<MenuItem value="domain">Website Domain</MenuItem>
									<MenuItem value="category">Category</MenuItem>
								</Select>
							</FormControl>
						</Grid>

						<Grid item xs={6}>
							{newRule.targets?.[0]?.type === 'category' ? (
								<Autocomplete
									fullWidth
									freeSolo
									options={availableCategories}
									value={newRule.targets?.[0]?.value || ''}
									onChange={(_, value) => setNewRule({
										...newRule,
										targets: [{
											type: 'category',
											value: value || '',
											action: newRule.targets?.[0]?.action || 'block'
										}]
									})}
									onInputChange={(_, value) => setNewRule({
										...newRule,
										targets: [{
											type: 'category',
											value: value || '',
											action: newRule.targets?.[0]?.action || 'block'
										}]
									})}
									renderInput={(params) => (
										<TextField
											{...params}
											label="Category Name"
											placeholder="Select or type a category"
											helperText="Choose from existing categories or create a new one"
										/>
									)}
									filterOptions={(options, { inputValue }) => {
										const filtered = options.filter(option =>
											option.toLowerCase().includes(inputValue.toLowerCase())
										);
										
										// Add option to create new category if not found
										if (inputValue && !options.some(option => 
											option.toLowerCase() === inputValue.toLowerCase()
										)) {
											filtered.push(inputValue);
										}
										
										return filtered;
									}}
								/>
							) : (
								<TextField
									fullWidth
									label="Website Domain"
									value={newRule.targets?.[0]?.value || ''}
									onChange={(e) => setNewRule({
										...newRule,
										targets: [{
											type: newRule.targets?.[0]?.type || 'domain',
											value: e.target.value,
											action: newRule.targets?.[0]?.action || 'block'
										}]
									})}
									placeholder="e.g., facebook.com, youtube.com"
									helperText="Enter a website domain name (without www.)"
								/>
							)}
						</Grid>

						<Grid item xs={6}>
							<FormControl fullWidth>
								<InputLabel>Action</InputLabel>
								<Select
									value={newRule.targets?.[0]?.action || 'block'}
									label="Action"
									onChange={(e) => {
										setNewRule({
											...newRule,
											targets: [{
												type: newRule.targets?.[0]?.type || 'domain',
												value: newRule.targets?.[0]?.value || '',
												action: e.target.value as any
											}]
										});
									}}
									disabled={isLoading}
									MenuProps={{
										PaperProps: {
											style: {
												maxHeight: 224,
												zIndex: 9999,
											},
										},
									}}
								>
									<MenuItem value="block">Block Completely</MenuItem>
									<MenuItem value="limit">Time Limit</MenuItem>
								</Select>
							</FormControl>
						</Grid>

						{newRule.targets?.[0]?.action === 'limit' && (
							<Grid item xs={6}>
								<TextField
									fullWidth
									label="Time Limit (minutes)"
									type="number"
									value={newRule.targets?.[0]?.limitMinutes || 30}
									onChange={(e) => setNewRule({
										...newRule,
										targets: [{
											type: newRule.targets?.[0]?.type || 'domain',
											value: newRule.targets?.[0]?.value || '',
											action: newRule.targets?.[0]?.action || 'limit',
											limitMinutes: parseInt(e.target.value) || 30
										}]
									})}
									inputProps={{ min: 1, max: 480 }}
								/>
							</Grid>
						)}
					</Grid>
				</DialogContent>
				<DialogActions>
					<Button 
						onClick={() => safeSetShowRuleDialog(false)}
						disabled={isLoading}
					>
						Cancel
					</Button>
					<Button
						onClick={handleSaveRule}
						variant="contained"
						disabled={!newRule.name || !newRule.schedule?.days.length || !newRule.targets?.[0]?.value || isLoading}
					>
						{isLoading ? 'Saving...' : (editingRule ? 'Update Rule' : 'Create Rule')}
					</Button>
				</DialogActions>
				</Dialog>
			)}
		</>
	);
}