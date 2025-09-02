import React from 'react';
import { Box, Typography, Stack, TextField, Button, IconButton, Chip, ToggleButtonGroup, ToggleButton, Autocomplete } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import PublicIcon from '@mui/icons-material/Public';
import CategoryIcon from '@mui/icons-material/Category';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { stringToColor } from '../../utils/colors';
import { normalizeDomain } from '../../utils/time';
import { useTheme } from '../../contexts/ThemeContext';
import FadeInView from '../../components/FadeInView';

// Domain validation function
function isValidDomain(input: string): boolean {
	// Remove common user mistakes
	const cleaned = input.toLowerCase()
		.replace(/^https?:\/\//, '') // Remove protocol
		.replace(/^www\./, '') // Remove www prefix
		.replace(/\/.*$/, '') // Remove path
		.trim();
	
	// Basic domain format validation
	const domainPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/;
	
	// Additional checks
	if (cleaned.length < 3 || cleaned.length > 253) return false;
	if (!cleaned.includes('.')) return false;
	if (cleaned.startsWith('.') || cleaned.endsWith('.')) return false;
	if (cleaned.includes('..')) return false;
	
	return domainPattern.test(cleaned);
}

type TargetType = 'site' | 'category';
interface LimitForm { targetType: TargetType; targetId: string; minutes: number; timeframe: 'daily' | 'weekly' | 'monthly' }

export default function OptionsView(): React.ReactElement {
	const { theme } = useTheme();
	const [limits, setLimits] = React.useState<any[]>([]);
	const [form, setForm] = React.useState<LimitForm>({ targetType: 'site', targetId: '', minutes: 30, timeframe: 'daily' });
	const [editingId, setEditingId] = React.useState<string | null>(null);
	const [editMinutes, setEditMinutes] = React.useState<number>(30);
	const [availableCategories, setAvailableCategories] = React.useState<string[]>([]);
	// Export/import state moved to SettingsView

	const loadCategories = React.useCallback(async () => {
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
	}, []);

	const load = React.useCallback(async () => {
		// Force commit any pending usage for real-time accuracy
		await new Promise<void>((resolve) => chrome.runtime.sendMessage({ type: 'force-immediate-commit' }, () => resolve()));
		
		chrome.runtime.sendMessage({ type: 'get-limits' }, (res) => {
			if (res?.ok) setLimits(res.data);
		});
		await loadCategories();
	}, [loadCategories]);

	React.useEffect(() => { load(); }, [load]);

	async function addLimit(): Promise<void> {
		if (!form.targetId.trim()) return;
		let targetId = form.targetId.trim();
		let displayName = targetId;
		
		if (form.targetType === 'site') {
			// Validate domain format
			if (!isValidDomain(targetId)) {
				alert('Please enter a valid domain (e.g., "instagram.com", "youtube.com"). Do not include protocols (http/https) or paths.');
				return;
			}
			targetId = normalizeDomain(targetId);
			displayName = targetId;
		}
		let candidate = limits.find((l) => l.targetType === form.targetType && l.timeframe === form.timeframe && (form.targetType === 'site' ? normalizeDomain(l.targetId) === targetId : l.targetId === targetId));
		if (candidate && candidate.targetId !== targetId) {
			await chrome.runtime.sendMessage({ type: 'delete-limit', payload: { id: candidate.id } });
			candidate = undefined;
		}
		const id = `${form.targetType}:${targetId}:${form.timeframe}`;
		const payload = { id, limitMinutes: form.minutes, timeframe: form.timeframe, targetType: form.targetType, targetId, displayName };
		await new Promise((resolve) => chrome.runtime.sendMessage({ type: 'set-limit', payload }, () => resolve(undefined)));
		setForm({ targetType: 'site', targetId: '', minutes: 30, timeframe: 'daily' });
		load();
	}

	async function deleteLimit(id: string): Promise<void> {
		await chrome.runtime.sendMessage({ type: 'delete-limit', payload: { id } });
		load();
	}

	async function saveEdit(limit: any): Promise<void> {
		if (!editingId) return;
		// Keep the original timeframe - only allow changing the minutes
		const payload = { id: limit.id, limitMinutes: editMinutes, timeframe: limit.timeframe, targetType: limit.targetType, targetId: limit.targetId, displayName: limit.displayName };
		await new Promise((resolve) => chrome.runtime.sendMessage({ type: 'set-limit', payload }, () => resolve(undefined)));
		setEditingId(null);
		load();
	}

	// Export/import functions moved to SettingsView

	return (
		<FadeInView>
			<Box sx={{ p: 2 }}>
			<Typography variant="body2" fontWeight={600} color="text.primary" sx={{ mb: 2 }}>
				Limits
			</Typography>

			{/* Improved Add Form */}
			<Box sx={{ 
				mb: 2.5, 
				p: 2.5, 
				borderRadius: 2, 
				border: `1px solid ${theme.palette.divider}`, 
				background: theme.palette.background.paper
			}}>
				<Typography variant="body2" fontWeight={600} color="text.primary" sx={{ mb: 2 }}>
					Add New Limit
				</Typography>

				<Stack spacing={2}>
					{/* Row 1: Target type and input */}
					<Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
						<ToggleButtonGroup 
							value={form.targetType} 
							size="small"
							exclusive 
							onChange={(_e, v) => v && setForm({ ...form, targetType: v as TargetType })} 
							sx={{ 
								'& .MuiToggleButton-root': { 
									px: 1.5, 
									py: 0.75, 
									fontSize: '0.75rem', 
									fontWeight: 500,
									minWidth: 60,
									'&.Mui-selected': {
														backgroundColor: theme.palette.primary.main,
														color: theme.palette.primary.contrastText
													}
								} 
							}}
						>
							<ToggleButton value="site">
								<PublicIcon sx={{ fontSize: 16, mr: 0.5 }} />
								Site
							</ToggleButton>
							<ToggleButton value="category">
								<CategoryIcon sx={{ fontSize: 16, mr: 0.5 }} />
								Category
							</ToggleButton>
						</ToggleButtonGroup>
						{form.targetType === 'category' ? (
							<Autocomplete
								size="small"
								freeSolo
								options={availableCategories}
								value={form.targetId}
								onChange={(_, value) => setForm({ ...form, targetId: value || '' })}
								onInputChange={(_, value) => setForm({ ...form, targetId: value || '' })}
								renderInput={(params) => {
									const { InputLabelProps: _omit, ...rest } = params as any;
									return (
										<TextField
											{...rest}
											placeholder="Select or type a category"
											size="small"
										/>
									);
								}}
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
								sx={{ flex: 1, minWidth: 160 }}
							/>
						) : (
							<TextField
								size="small"
								placeholder="facebook.com"
								value={form.targetId}
								onChange={(e) => setForm({ ...form, targetId: e.target.value })}
								sx={{ flex: 1, minWidth: 160 }}
							/>
						)}
					</Stack>

					{/* Row 2: Timeframe and time input */}
					<Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
						<ToggleButtonGroup 
							value={form.timeframe} 
							size="small"
							exclusive 
							onChange={(_e, v) => v && setForm({ ...form, timeframe: v as any })} 
							sx={{ 
								'& .MuiToggleButton-root': { 
									px: 1.5, 
									py: 0.75, 
									fontSize: '0.75rem', 
									fontWeight: 500,
									minWidth: 60,
									'&.Mui-selected': {
														backgroundColor: theme.palette.primary.main,
														color: theme.palette.primary.contrastText
													}
								} 
							}}
						>
							<ToggleButton value="daily">Daily</ToggleButton>
							<ToggleButton value="weekly">Weekly</ToggleButton>
							<ToggleButton value="monthly">Monthly</ToggleButton>
						</ToggleButtonGroup>
						
						{/* Time input with hours/minutes */}
						<Stack direction="row" spacing={1} alignItems="center">
							<TextField 
								type="number" 
								size="small"
								value={Math.floor(form.minutes / 60)} 
								onChange={(e) => {
									const hours = Number(e.target.value) || 0;
									const mins = form.minutes % 60;
									setForm({ ...form, minutes: hours * 60 + mins });
								}} 
								inputProps={{ min: 0, max: 23, inputMode: 'numeric' }} 
								sx={{ 
									width: 96,
									'& input[type=number]': { MozAppearance: 'textfield', textAlign: 'center', fontWeight: 600 },
									'& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
										WebkitAppearance: 'none',
										margin: 0
									},
									'& .MuiInputBase-input': { px: 1.25 }
								}}
								InputProps={{
									endAdornment: <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', mr: 0.25 }}>h</Typography>
								}}
							/>
							<TextField
								type="number"
								size="small"
								value={form.minutes % 60} 
								onChange={(e) => {
									const hours = Math.floor(form.minutes / 60);
									const mins = Number(e.target.value) || 0;
									setForm({ ...form, minutes: hours * 60 + mins });
								}} 
								inputProps={{ min: 0, max: 59, inputMode: 'numeric' }} 
								sx={{ 
									width: 96,
									'& input[type=number]': { MozAppearance: 'textfield', textAlign: 'center', fontWeight: 600 },
									'& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
										WebkitAppearance: 'none',
										margin: 0
									},
									'& .MuiInputBase-input': { px: 1.25 }
								}}
								InputProps={{
									endAdornment: <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', mr: 0.25 }}>m</Typography>
								}}
							/>
						</Stack>
					</Stack>

					{/* Add button - properly positioned */}
					<Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
						<Button
						variant="contained"
						size="medium"
						startIcon={<AddIcon sx={{ fontSize: 16 }} />}
						onClick={() => void addLimit()}
						disabled={!form.targetId.trim() || form.minutes === 0} 
						sx={{ 
							px: 3,
							py: 1,
							fontSize: '0.8rem',
							fontWeight: 600,
							borderRadius: 2,
							background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
							transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
							'&:hover': { 
								background: `linear-gradient(135deg, ${theme.palette.success.dark}, ${theme.palette.success.dark})`,
								transform: 'translateY(-1px)',
								boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
							},
							'&:active': {
								transform: 'translateY(0px) scale(0.98)'
							},
							'&:disabled': {
								background: theme.palette.action.disabled,
								transform: 'none',
								boxShadow: 'none'
							}
						}}
						>
							Add Limit
						</Button>
					</Box>
				</Stack>
			</Box>

			{/* Active Limits */}
			{limits.length === 0 ? (
				<Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary', background: theme.palette.background.paper, borderRadius: 2, border: `1px dashed ${theme.palette.divider}` }}>
					<Stack spacing={2} alignItems="center">
						<Typography variant="h6" color="text.secondary" fontWeight={600}>
							⏰ No Limits Set
						</Typography>
						<Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
							Create time limits for specific websites or categories to help manage your digital habits and stay focused.
						</Typography>
						<Typography variant="caption" color="text.disabled">
							💡 Use the form above to add your first limit
						</Typography>
					</Stack>
				</Box>
			) : (
				<Box>
					<Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
						Active Limits ({limits.length})
					</Typography>
					<Stack spacing={0.5}>
						{limits.map((limit) => {
							const base = stringToColor(limit.displayName);
							const isEditing = editingId === limit.id;
							return (
								<Box key={limit.id} sx={{ 
								p: 1.5, 
								borderRadius: 2, 
								backgroundColor: theme.palette.background.paper, 
								border: `1px solid ${theme.palette.divider}`, 
								'&:hover': { backgroundColor: theme.palette.action.hover, borderColor: theme.palette.action.selected },
								transition: 'all 0.2s ease'
							}}>
									<Stack direction="row" justifyContent="space-between" alignItems="center">
										{/* Left side - site info */}
										<Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
											<Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: base, flexShrink: 0 }} />
											<Box sx={{ minWidth: 0, flex: 1 }}>
												<Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem', lineHeight: 1.2, mb: 0.2, color: 'text.primary' }} noWrap>
													{limit.displayName}
												</Typography>
												<Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', opacity: 0.8 }}>
													{limit.targetType} • {limit.timeframe}
												</Typography>
											</Box>
										</Stack>

										{/* Right side - limit info and actions */}
										<Stack direction="row" spacing={0.5} alignItems="center">
											{!isEditing ? (
												<>
													<Chip 
														label={limit.limitMinutes >= 60 ? 
															`${Math.floor(limit.limitMinutes / 60)}h ${limit.limitMinutes % 60}m` : 
															`${limit.limitMinutes}m`
														} 
														size="small" 
														sx={{ 
															height: 20, 
															fontSize: '0.7rem', 
															fontWeight: 600,
															backgroundColor: theme.palette.primary.main, 
															color: theme.palette.primary.contrastText,
															border: 'none'
														}} 
													/>
													{limit.isCurrentlyBlocked && (
														<Chip 
															label="BLOCKED" 
															size="small" 
															sx={{ 
																height: 20, 
																fontSize: '0.6rem', 
																fontWeight: 700,
																backgroundColor: theme.palette.error.light,
																color: theme.palette.error.contrastText,
																border: 'none'
															}} 
														/>
													)}
													<IconButton 
														size="small" 
														onClick={() => { setEditingId(limit.id); setEditMinutes(limit.limitMinutes); }} 
														sx={{ 
															color: theme.palette.text.secondary, 
															p: 0.5,
															transition: 'all 0.2s ease',
															'&:hover': {
																color: theme.palette.primary.main,
																transform: 'scale(1.1)',
																backgroundColor: theme.palette.action.hover
															}
														}}
													>
														<EditIcon sx={{ fontSize: 14 }} />
													</IconButton>
													<IconButton 
														size="small" 
														onClick={() => deleteLimit(limit.id)} 
														sx={{ 
															color: theme.palette.text.disabled, 
															p: 0.5,
															transition: 'all 0.2s ease',
															'&:hover': {
																color: theme.palette.error.main,
																transform: 'scale(1.1)',
																backgroundColor: theme.palette.action.hover
															}
														}}
													>
														<DeleteIcon sx={{ fontSize: 14 }} />
													</IconButton>
												</>
											) : (
												<>
													<Stack direction="row" spacing={1} alignItems="center">
														<TextField 
															type="number" 
															size="small"
															value={Math.floor(editMinutes / 60)} 
															onChange={(e) => {
																const hours = Number(e.target.value) || 0;
																const mins = editMinutes % 60;
																setEditMinutes(hours * 60 + mins);
															}} 
															inputProps={{ min: 0, max: 23, inputMode: 'numeric' }} 
															sx={{ 
																width: 76,
																'& input[type=number]': { MozAppearance: 'textfield', textAlign: 'center', fontWeight: 600 },
																'& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
																	WebkitAppearance: 'none',
																	margin: 0
																},
																'& .MuiInputBase-input': { px: 1.0 }
															}}
															InputProps={{
																endAdornment: <Typography variant="caption" sx={{ fontSize: '0.6rem', mr: 0.2 }}>h</Typography>
															}}
														/>
														<TextField 
															type="number" 
															size="small"
															value={editMinutes % 60} 
															onChange={(e) => {
																const hours = Math.floor(editMinutes / 60);
																const mins = Number(e.target.value) || 0;
																setEditMinutes(hours * 60 + mins);
															}} 
															inputProps={{ min: 0, max: 59, inputMode: 'numeric' }} 
															sx={{ 
																width: 76,
																'& input[type=number]': { MozAppearance: 'textfield', textAlign: 'center', fontWeight: 600 },
																'& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
																	WebkitAppearance: 'none',
																	margin: 0
																},
																'& .MuiInputBase-input': { px: 1.0 }
															}}
															InputProps={{
																endAdornment: <Typography variant="caption" sx={{ fontSize: '0.6rem', mr: 0.2 }}>m</Typography>
															}}
														/>
														<IconButton size="small" onClick={() => void saveEdit(limit)} sx={{ color: theme.palette.success.main, p: 0.5 }}>
															<CheckIcon sx={{ fontSize: 14 }} />
														</IconButton>
														<IconButton size="small" onClick={() => setEditingId(null)} sx={{ color: theme.palette.text.disabled, p: 0.5 }}>
															<CloseIcon sx={{ fontSize: 14 }} />
														</IconButton>
													</Stack>
												</>
											)}
										</Stack>
									</Stack>
								</Box>
						);
						})}
					</Stack>
				</Box>
			)}
			</Box>
			
			{/* Backup/restore functionality moved to Quick Settings */}
		</FadeInView>
	);
}




