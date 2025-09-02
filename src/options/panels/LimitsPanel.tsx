import React from 'react';
import { 
	Box, TextField, Button, Stack, Typography, Card, CardContent, IconButton, Chip, Alert, MenuItem, Tooltip, 
	Accordion, AccordionSummary, AccordionDetails, Grid, Dialog, DialogTitle, DialogContent, DialogActions,
	FormControlLabel, Checkbox, Divider, Switch, Tab, Tabs, FormControl, InputLabel, Select, Autocomplete
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FadeInView from '../../components/FadeInView';
import SearchableSelect from '../../components/SearchableSelect';
import ErrorBoundary from '../../components/ErrorBoundary';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import TimerIcon from '@mui/icons-material/Timer';
import BlockIcon from '@mui/icons-material/Block';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PatternIcon from '@mui/icons-material/Pattern';
import AddIcon from '@mui/icons-material/Add';
import { useTheme } from '../../contexts/ThemeContext';
import { RulesEngine, TimeRule, URLPattern } from '../../storage/rulesEngine';
import ScheduledRulesTab from '../../components/ScheduledRulesTab';
import URLPatternsTab from '../../components/URLPatternsTab';
// ImportExportTab removed - now handled in Privacy & Data section
import { normalizeDomain } from '../../utils/time';

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
type Timeframe = 'daily' | 'weekly' | 'monthly';
interface LimitForm { targetType: TargetType; targetId: string; minutes: number; timeframe: Timeframe }

export default function LimitsPanel(): React.ReactElement {
	const { theme } = useTheme();
	const [limits, setLimits] = React.useState<any[]>([]);
	const [form, setForm] = React.useState<LimitForm>({ targetType: 'site', targetId: '', minutes: 30, timeframe: 'daily' });
	const [activeTab, setActiveTab] = React.useState(0);
	const [scheduleRules, setScheduleRules] = React.useState<TimeRule[]>([]);
	const [urlPatterns, setUrlPatterns] = React.useState<URLPattern[]>([]);
	const [showRuleDialog, setShowRuleDialog] = React.useState(false);
	const [showPatternDialog, setShowPatternDialog] = React.useState(false);
	const [showImportExport, setShowImportExport] = React.useState(false);
	const [availableCategories, setAvailableCategories] = React.useState<string[]>([]);

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
		chrome.runtime.sendMessage({ type: 'get-limits' }, (res) => {
			if (res?.ok) setLimits(res.data);
		});
		
		// Load scheduled rules and URL patterns
		try {
			const rules = await RulesEngine.getRules();
			const patterns = await RulesEngine.getURLPatterns();
			setScheduleRules(rules);
			setUrlPatterns(patterns);
		} catch (error) {
			console.error('Failed to load advanced rules:', error);
		}
		
		// Load categories
		await loadCategories();
	}, [loadCategories]);

	React.useEffect(() => { 
		load(); 
	}, [load]);

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
		// If an existing limit matches the same canonical site/category+timeframe, delete it to avoid duplicates
		let candidate = limits.find((l) => 
			l.targetType === form.targetType && 
			l.timeframe === form.timeframe && 
			(form.targetType === 'site' ? normalizeDomain(l.targetId) === targetId : l.targetId === targetId)
		);
		if (candidate && candidate.targetId !== targetId) {
			await chrome.runtime.sendMessage({ type: 'delete-limit', payload: { id: candidate.id } });
			candidate = undefined;
		}
		const id = `${form.targetType}:${targetId}:${form.timeframe}`;
		const payload = { 
			id, 
			limitMinutes: form.minutes, 
			timeframe: form.timeframe, 
			targetType: form.targetType, 
			targetId, 
			displayName 
		};
		await new Promise((resolve) => chrome.runtime.sendMessage({ type: 'set-limit', payload }, () => resolve(undefined)));
		setForm({ targetType: 'site', targetId: '', minutes: 30, timeframe: 'daily' });
		load();
	}

	const blockedCount = limits.filter(l => l.isCurrentlyBlocked).length;

	return (
		<Box>
			{/* Hero Section */}
			<Box sx={{ 
				textAlign: 'center', 
				mb: 4,
				background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
				color: 'white',
				py: 3.5,
				borderRadius: 3,
				position: 'relative',
				overflow: 'hidden',
				boxShadow: `0 8px 32px ${theme.palette.primary.main}40`
			}}>
				<Box sx={{ position: 'relative', zIndex: 1 }}>
					<TimerIcon sx={{ fontSize: 40, mb: 1.2, opacity: 0.95 }} />
					<Typography variant="h4" component="h1" sx={{ 
						fontWeight: 600, 
						mb: 1,
						textShadow: `0 2px 4px ${theme.palette.action.selected}`,
						fontSize: '1.75rem'
					}}>
						Time Management
					</Typography>
					<Typography variant="subtitle1" sx={{ 
						opacity: 0.95,
						maxWidth: 480,
						mx: 'auto',
						lineHeight: 1.4,
						fontSize: '0.95rem',
						fontWeight: 400
					}}>
						Set focused time limits to maintain healthy digital habits
					</Typography>
				</Box>
				<Box sx={{
					position: 'absolute',
					top: -20,
					right: -20,
					width: 80,
					height: 80,
					background: theme.palette.action.hover,
					borderRadius: '50%',
					zIndex: 0
				}} />
				<Box sx={{
					position: 'absolute',
					bottom: -15,
					left: -15,
					width: 60,
					height: 60,
					background: theme.palette.action.selected,
					borderRadius: '50%',
					zIndex: 0
				}} />
			</Box>

			{blockedCount > 0 && (
				<Alert severity="warning" sx={{
					mb: 3,
					borderRadius: 2.5,
					border: `1px solid ${theme.palette.warning.light}`,
					background: `linear-gradient(135deg, ${theme.palette.warning.main}20 0%, ${theme.palette.warning.main}10 100%)`,
					'& .MuiAlert-icon': { color: theme.palette.warning.main }
				}}>
					<Typography variant="body2" fontWeight={600}>
						🚫 {blockedCount} site{blockedCount > 1 ? 's' : ''} currently blocked due to limit exceeded
					</Typography>
				</Alert>
			)}

			{/* Tabbed Navigation */}
			<Card sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
				<Tabs 
					value={activeTab} 
					onChange={(_, newValue) => setActiveTab(newValue)}
					variant="fullWidth"
					sx={{
						backgroundColor: theme.palette.background.paper,
						'& .MuiTab-root': {
							fontWeight: 600,
							textTransform: 'none',
							fontSize: '0.9rem',
							py: 2
						}
					}}
				>
					<Tab icon={<TimerIcon />} label="Basic Limits" />
					<Tab icon={<ScheduleIcon />} label="Scheduled Rules" />
					<Tab icon={<PatternIcon />} label="URL Patterns" />
				</Tabs>
			</Card>

			{/* Tab Content */}
			{activeTab === 0 && (
				<>
					{/* Add New Limit Card */}
					<Card sx={{ 
						mb: 3, 
						borderRadius: 3,
						boxShadow: `0 4px 20px ${theme.palette.action.selected}`,
						border: `1px solid ${theme.palette.divider}`,
						overflow: 'hidden',
						background: theme.palette.background.paper
					}}>
				<CardContent sx={{ p: 3 }}>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
						<Box sx={{
							width: 40,
							height: 40,
							borderRadius: '10px',
							background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							boxShadow: `0 4px 16px ${theme.palette.primary.main}40`
						}}>
							<BlockIcon sx={{ fontSize: 20, color: theme.palette.primary.contrastText }} />
						</Box>
						<Box>
							<Typography variant="h6" fontWeight={600} sx={{ mb: 0.5, fontSize: '1.1rem' }}>
								Create New Limit
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
								Set time restrictions for websites or categories
							</Typography>
						</Box>
					</Box>

					<Grid container spacing={2} alignItems="end">
						<Grid item xs={12} sm={6} md={3}>
							<TextField
								select
								fullWidth
								label="Target Type"
								value={form.targetType}
								onChange={(e) => setForm({ ...form, targetType: e.target.value as TargetType })}
								size="small"
								sx={{
									'& .MuiOutlinedInput-root': {
										borderRadius: 2.5,
										backgroundColor: theme.palette.action.hover
									}
								}}
							>
								<MenuItem value="site">🌐 Website</MenuItem>
								<MenuItem value="category">📂 Category</MenuItem>
							</TextField>
						</Grid>
						<Grid item xs={12} sm={6} md={4}>

							{form.targetType === 'category' ? (
								<Autocomplete
									fullWidth
									freeSolo
									size="small"
									options={availableCategories}
									value={form.targetId}

									onChange={(_, value) => setForm({ ...form, targetId: value || '' })}
									onInputChange={(_, value) => setForm({ ...form, targetId: value || '' })}
									renderInput={(params) => (
										<TextField
											{...(params as any)}
											size="small"
											label="Category Name"
											placeholder="Select or type a category"
											sx={{
												'& .MuiOutlinedInput-root': {
													borderRadius: 2.5,
													backgroundColor: theme.palette.action.hover,
													'&:hover': {
														backgroundColor: theme.palette.action.selected
													},
													'&.Mui-focused': {
														backgroundColor: `${theme.palette.primary.main}20`,
														borderColor: theme.palette.primary.main
													}
												}
											}}
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
									label="Website URL"
									value={form.targetId}
									onChange={(e) => setForm({ ...form, targetId: e.target.value })}
									placeholder="e.g., facebook.com"
									size="small"
									sx={{
										'& .MuiOutlinedInput-root': {
											borderRadius: 2.5,
											backgroundColor: theme.palette.action.hover,
											'&:hover': {
												backgroundColor: theme.palette.action.selected
											},
											'&.Mui-focused': {
												backgroundColor: `${theme.palette.primary.main}20`,
												borderColor: theme.palette.primary.main
											}
										}
									}}
								/>
							)}
						</Grid>
						<Grid item xs={12} sm={6} md={2.5}>
							<TextField
								select
								fullWidth
								label="Timeframe"
								value={form.timeframe}
								onChange={(e) => setForm({ ...form, timeframe: e.target.value as Timeframe })}
								size="small"
								sx={{
									'& .MuiOutlinedInput-root': {
										borderRadius: 2.5,
										backgroundColor: theme.palette.action.hover,
										'&:hover': {
											backgroundColor: theme.palette.action.selected
										},
										'&.Mui-focused': {
											backgroundColor: `${theme.palette.primary.main}20`,
											borderColor: theme.palette.primary.main
										}
									}
								}}
							>
								<MenuItem value="daily">📅 Daily</MenuItem>
								<MenuItem value="weekly">📊 Weekly</MenuItem>
								<MenuItem value="monthly">📈 Monthly</MenuItem>
							</TextField>
						</Grid>
						<Grid item xs={12} sm={6} md={2.5}>
							<TextField
								fullWidth
								label="Time Limit (minutes)"
								type="number"
								value={form.minutes}
								onChange={(e) => setForm({ ...form, minutes: parseInt(e.target.value) || 0 })}
								size="small"
								inputProps={{ min: 1, max: 1440 }}
								sx={{
									'& .MuiOutlinedInput-root': {
										borderRadius: 2.5,
										backgroundColor: theme.palette.action.hover,
										'&:hover': {
											backgroundColor: theme.palette.action.selected
										},
										'&.Mui-focused': {
											backgroundColor: `${theme.palette.primary.main}20`,
											borderColor: theme.palette.primary.main
										}
									},
									'& input': {
										textAlign: 'center',
										fontWeight: 700
									},
									'& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
										WebkitAppearance: 'none',
										margin: 0
									},
									'& input[type=number]': {
										MozAppearance: 'textfield'
									}
								}}
							/>
						</Grid>
						<Grid item xs={12} md={"auto"}>
							<Button
								variant="contained"
								onClick={() => void addLimit()}
								disabled={!form.targetId.trim()}
								sx={{
									px: 3,
									py: 1.25,
									borderRadius: 2.5,
									background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
							boxShadow: `0 4px 16px ${theme.palette.primary.main}40`,
									fontWeight: 600,
									textTransform: 'none',
									fontSize: '0.875rem',
									'&:hover': {
										background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
										boxShadow: `0 6px 20px ${theme.palette.primary.main}60`,
										transform: 'translateY(-1px)'
									},
									'&:disabled': {
										background: theme.palette.action.disabledBackground,
										color: theme.palette.action.disabled,
										boxShadow: 'none'
									}
								}}
							>
								Create Limit
							</Button>
						</Grid>
					</Grid>
				</CardContent>
			</Card>

			{/* Active Limits Section */}
			<Card elevation={0} sx={{
				borderRadius: 4,
				border: `1px solid ${theme.palette.divider}`,
				background: theme.palette.background.paper
			}}>
				<CardContent sx={{ p: 4 }}>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
						<Box sx={{
							width: 40,
							height: 40,
							borderRadius: '10px',
							background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					boxShadow: `0 4px 16px ${theme.palette.primary.main}40`
						}}>
							<TimerIcon sx={{ fontSize: 20, color: theme.palette.primary.contrastText }} />
						</Box>
						<Box>
							<Typography variant="h6" fontWeight={600} sx={{ mb: 0.5, fontSize: '1.1rem' }}>
								Active Limits ({limits.length})
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
								Manage your current time restrictions
							</Typography>
						</Box>
					</Box>

					{limits.length === 0 ? (
				<Box sx={{ 
					textAlign: 'center', 
					py: 5,
					color: 'text.secondary',
					borderRadius: 2.5,
					background: theme.palette.action.hover,
					border: `2px dashed ${theme.palette.divider}`
				}}>
					<TimerIcon sx={{ fontSize: 40, mb: 2, opacity: 0.6, color: theme.palette.text.secondary }} />
					<Typography variant="h6" fontWeight={500} sx={{ mb: 1, fontSize: '1rem' }}>
						No limits configured
					</Typography>
					<Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
						Create your first time limit using the form above
					</Typography>
				</Box>
			) : (
						<Grid container spacing={2}>
							{limits.map((limit, index) => (
								<Grid item xs={12} key={limit.id}>
									<Card
										elevation={0}
										sx={{
											borderRadius: 2.5,
											border: `1px solid ${theme.palette.divider}`,
											backgroundColor: theme.palette.background.paper,
											transition: 'all 0.3s ease',
											'&:hover': {
												backgroundColor: theme.palette.action.hover,
												transform: 'translateY(-2px)',
												boxShadow: theme.shadows[8],
												borderColor: 'primary.main'
											}
										}}
									>
										<CardContent sx={{
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'space-between',
											py: 3,
											px: 4
										}}>
											<Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1 }}>
												<Box
												sx={{
													width: 10,
													height: 10,
													borderRadius: '50%',
													backgroundColor: limit.targetType === 'site' 
														? theme.palette.success.main 
														: theme.palette.warning.main,
													flexShrink: 0,
													boxShadow: theme.shadows[2]
												}}
											/>
												<Box>
													<Typography fontWeight={700} sx={{ fontSize: '1.1rem', mb: 0.5 }}>
														{limit.displayName}
													</Typography>
													<Stack direction="row" spacing={2} alignItems="center">
														<Typography variant="caption" color="text.secondary" fontWeight={500}>
															{limit.targetType === 'site' ? '🌐 Website' : '📂 Category'}
														</Typography>
														<Typography variant="caption" color="text.secondary" fontWeight={500}>
															• {limit.timeframe.charAt(0).toUpperCase() + limit.timeframe.slice(1)}
														</Typography>
													</Stack>
												</Box>
											</Box>
											<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
												<Chip
													label={`${limit.limitMinutes} minutes`}
													size="small"
													color="primary"
													variant="outlined"
													sx={{
														fontWeight: 700,
														fontSize: '0.75rem',
														borderRadius: 2,
														px: 1
													}}
												/>
												{limit.isCurrentlyBlocked && (
													<Chip
														label="🚫 BLOCKED"
														size="small"
														color="error"
														sx={{
															fontWeight: 700,
															fontSize: '0.7rem',
															backgroundColor: theme.palette.error.light,
																border: `1px solid ${theme.palette.error.main}`
														}}
													/>
												)}
												<Tooltip title="Remove limit">
													<IconButton
																				size="small"
																				color="error"
																				sx={{
																					borderRadius: 2,
																					'&:hover': {
																						backgroundColor: theme.palette.error.light,
																						transform: 'scale(1.1)'
																					}
																				}}
																				onClick={async () => {
																					await chrome.runtime.sendMessage({ type: 'delete-limit', payload: { id: limit.id } });
																					load();
																				}}
																			>
																				<DeleteOutlineRoundedIcon fontSize="small" />
																			</IconButton>
												</Tooltip>
											</Box>
										</CardContent>
									</Card>
								</Grid>
							))}
						</Grid>
					)}
				</CardContent>
			</Card>
			</>
		)}
		
		{/* Scheduled Rules Tab */}
		{activeTab === 1 && (
			<ErrorBoundary
				onError={(error, errorInfo) => {
					console.error('ScheduledRulesTab error:', error, errorInfo);
				}}
			>
				<ScheduledRulesTab
					scheduleRules={scheduleRules}
					onRefresh={load}
					theme={theme}
				/>
			</ErrorBoundary>
		)}
		
		{/* URL Patterns Tab */}
		{activeTab === 2 && (
			<URLPatternsTab
				urlPatterns={urlPatterns}
				onRefresh={load}
				theme={theme}
			/>
		)}
		
		{/* Import/Export functionality moved to Privacy & Data section */}
		
		</Box>
	);
}