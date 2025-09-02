import React from 'react';
import {
	Box,
	Typography,
	Tabs,
	Tab,
	Card,
	CardContent,
	Grid,
	Alert,
	Stack,
	LinearProgress,
	Chip,
	IconButton,
	Button,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Avatar,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	ToggleButtonGroup,
	ToggleButton,
	Paper,
	Divider,
	Tooltip,
	CircularProgress,
	Fade
} from '@mui/material';
import {
	TrendingUp as TrendingUpIcon,
	Assessment as AssessmentIcon,
	Timeline as TimelineIcon,
	Flag as FlagIcon,
	Refresh as RefreshIcon,
	ChevronLeft as ChevronLeftIcon,
	ChevronRight as ChevronRightIcon,
	Add as AddIcon,
	EmojiEvents as TrophyIcon,
	LocalFireDepartment as StreakIcon,
	TrendingDown as TrendingDownIcon,
	Remove as MinusIcon,
	ShowChart as ChartIcon,
	CalendarToday as CalendarIcon,
	Delete as DeleteIcon,
	Autorenew as AutorenewIcon
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	BarElement,
	ArcElement,
	Title,
	Tooltip as ChartTooltip,
	Legend,
	Filler
} from 'chart.js';
import { useTheme } from '../../contexts/ThemeContext';
import { AdvancedAnalytics, WeeklyReport, MonthlyReport } from '../../utils/advancedAnalytics';
import { CategoriesStore } from '../../storage/categoriesStore';
import { GoalTracker, Goal, ProgressReport } from '../../storage/goalTracker';
import { formatDurationSeconds } from '../../utils/format';
import FadeInView from '../../components/FadeInView';
import EnhancedButton from '../../components/EnhancedButton';
import ReportLayoutTemplate from '../../components/ReportLayoutTemplate';

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	BarElement,
	ArcElement,
	Title,
	ChartTooltip,
	Legend,
	Filler
);

interface UsageData {
	totalTime: number;
	sessionsToday: number;
	topDomains: Array<{
		domain: string;
		time: number;
		category: string;
	}>;
	weeklyData: number[];
}

const AdvancedAnalyticsPanel = React.memo(function AdvancedAnalyticsPanel(): React.ReactElement {
	const { theme } = useTheme();
	const [activeTab, setActiveTab] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [usageData, setUsageData] = React.useState<UsageData | null>(null);
	
	// Initialize current week/month properly
	const currentWeek = React.useMemo(() => {
		const now = new Date();
		const start = new Date(now);
		start.setDate(now.getDate() - now.getDay());
		start.setHours(0, 0, 0, 0);
		return start;
	}, []);

	const currentMonth = React.useMemo(() => {
		const now = new Date();
		return new Date(now.getFullYear(), now.getMonth(), 1);
	}, []);

	// Weekly Report State
	const [weeklyReport, setWeeklyReport] = React.useState<WeeklyReport | null>(null);
	const [selectedWeek, setSelectedWeek] = React.useState(currentWeek);
	const [availableWeeks, setAvailableWeeks] = React.useState<Date[]>([currentWeek]);
	const [weeklyDataView, setWeeklyDataView] = React.useState<'domains' | 'categories'>('domains');
	
	// Monthly Report State
	const [monthlyReport, setMonthlyReport] = React.useState<MonthlyReport | null>(null);
	const [selectedMonth, setSelectedMonth] = React.useState(currentMonth);
	const [availableMonths, setAvailableMonths] = React.useState<Date[]>([currentMonth]);
	const [monthlyDataView, setMonthlyDataView] = React.useState<'domains' | 'categories'>('domains');
	
	// Goals State
	const [goals, setGoals] = React.useState<Goal[]>([]);
	const [progressReport, setProgressReport] = React.useState<ProgressReport | null>(null);
	const [showGoalDialog, setShowGoalDialog] = React.useState(false);
	const [goalTemplates, setGoalTemplates] = React.useState<any[]>([]);
	const [selectedTemplate, setSelectedTemplate] = React.useState<any>(null);

	const handleRefresh = React.useCallback(async () => {
		setLoading(true);
		try {
			// Load basic usage data
			const todayResponse = await new Promise<any>((resolve) => {
				chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'today', by: 'domain' } }, resolve);
			});

			if (todayResponse?.ok) {
				const domains = (todayResponse.data as Array<{key: string; seconds: number}>).filter(d => d.key && d.key.trim() !== '');
				const totalTime = domains.reduce((sum, d) => sum + d.seconds, 0);

				// Load categories to map domains to categories
				const categories = await CategoriesStore.getAll();

				const topDomains = domains.slice(0, 5).map(d => {
					// Simple category mapping - could be enhanced with domain-to-category mapping
					const category = d.key ? categories.find(cat =>
						d.key.toLowerCase().includes(cat.name.toLowerCase()) ||
						cat.name.toLowerCase().includes(d.key.toLowerCase())
					) : null;
					return {
						domain: d.key || 'Unknown',
						time: d.seconds,
						category: category?.name || 'Uncategorized'
					};
				});

				// Get real weekly data for the last 7 days
				const weeklyData = await Promise.all(
					Array.from({length: 7}, async (_, i) => {
						const date = new Date();
						date.setDate(date.getDate() - (6 - i));
						const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
						const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
						
						const dayResponse = await new Promise<any>((resolve) => {
							chrome.runtime.sendMessage({ 
								type: 'get-usage-summary', 
								payload: { 
									range: 'custom',
									start: dayStart.toISOString(),
									end: dayEnd.toISOString(),
									by: 'domain' 
								} 
							}, resolve);
						});
						
						if (dayResponse?.ok) {
							const dayTotal = dayResponse.data.reduce((sum: number, d: any) => sum + d.seconds, 0);
							return Math.round(dayTotal / 3600 * 10) / 10; // Convert to hours, 1 decimal
						}
						return 0;
					})
				);

				setUsageData({
					totalTime,
					sessionsToday: Math.max(1, Math.floor(totalTime / 1800)), // Estimate sessions
					topDomains,
					weeklyData
				});
			}

			// Generate available weeks/months based on data
			await generateAvailablePeriods();

			// Load specific tab data
			if (activeTab === 1) {
				await loadWeeklyReport(selectedWeek);
			} else if (activeTab === 2) {
				await loadMonthlyReport(selectedMonth);
			} else if (activeTab === 3) {
				await loadGoalsData();
			}
		} catch (error) {
			console.error('Error refreshing analytics:', error);
		} finally {
			setLoading(false);
		}
	}, [activeTab, selectedWeek, selectedMonth]);

	const generateAvailablePeriods = async () => {
		try {
			// Get first recorded data date from storage
			const allDataResponse = await new Promise<any>((resolve) => {
				chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'all', by: 'date' } }, resolve);
			});

			if (allDataResponse?.ok && allDataResponse.data.length > 0) {
				const validData = allDataResponse.data.filter((d: any) => d.key && !isNaN(new Date(d.key).getTime()));
				const dates = validData.map((d: any) => new Date(d.key)).sort((a: Date, b: Date) => a.getTime() - b.getTime());
				const firstDate = dates[0];
				const now = new Date();

				// Generate available weeks
				const weeks: Date[] = [];
				let weekStart = getWeekStart(firstDate);
				while (weekStart <= now) {
					weeks.push(new Date(weekStart));
					weekStart.setDate(weekStart.getDate() + 7);
				}
				setAvailableWeeks(weeks.reverse()); // Most recent first

				// Generate available months
				const months: Date[] = [];
				let monthStart = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
				const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
				while (monthStart <= nowMonth) {
					months.push(new Date(monthStart));
					monthStart.setMonth(monthStart.getMonth() + 1);
				}
				setAvailableMonths(months.reverse()); // Most recent first
			}
		} catch (error) {
			console.error('Error generating available periods:', error);
		}
	};

	const getWeekStart = (date: Date) => {
		const start = new Date(date);
		start.setDate(date.getDate() - date.getDay());
		start.setHours(0, 0, 0, 0);
		return start;
	};

	const loadWeeklyReport = async (week: Date) => {
		try {
			console.log('[AdvancedAnalytics] Loading weekly report for:', week);
			const report = await AdvancedAnalytics.generateWeeklyReport(week);
			console.log('[AdvancedAnalytics] Weekly report generated:', report);
			
			// Ensure report has required properties with defaults
			const safeReport = {
				...report,
				summary: report.summary || {
					totalTime: 0,
					averageDaily: 0,
					peakDay: { date: '', duration: 0 },
					mostUsedCategory: '',
					mostUsedDomain: '',
					productivityScore: 0
				},
				weeklyComparison: report.weeklyComparison || {
					thisWeek: 0,
					lastWeek: 0,
					change: 0,
					trend: 'stable' as const
				},
				dailyBreakdown: report.dailyBreakdown || [],
				habitScore: report.habitScore || 0
			};
			
			setWeeklyReport(safeReport);
		} catch (error) {
			console.error('Error loading weekly report:', error);
			// Set a safe fallback report
			setWeeklyReport({
				summary: {
					totalTime: 0,
					averageDaily: 0,
					peakDay: { date: 'No data', duration: 0 },
					mostUsedCategory: 'No data',
					mostUsedDomain: 'No data',
					productivityScore: 0
				},
				timeline: [],
				categories: [],
				insights: {
					patterns: [],
					recommendations: [],
					warnings: [],
					achievements: []
				},
				weeklyComparison: {
					thisWeek: 0,
					lastWeek: 0,
					change: 0,
					trend: 'stable' as const
				},
				dailyBreakdown: [],
				habitScore: 0
			});
		}
	};

	const loadMonthlyReport = async (month: Date) => {
		try {
			console.log('[AdvancedAnalytics] Loading monthly report for:', month);
			const report = await AdvancedAnalytics.generateMonthlyReport(month);
			console.log('[AdvancedAnalytics] Monthly report generated:', report);
			
			// Ensure report has required properties with defaults
			const safeReport = {
				...report,
				summary: report.summary || {
					totalTime: 0,
					averageDaily: 0,
					peakDay: { date: '', duration: 0 },
					mostUsedCategory: '',
					mostUsedDomain: '',
					productivityScore: 0
				},
				monthlyComparison: report.monthlyComparison || {
					thisMonth: 0,
					lastMonth: 0,
					change: 0,
					trend: 'stable' as const
				},
				weeklyBreakdown: report.weeklyBreakdown || [],
				milestones: report.milestones || [],
				topDomains: report.topDomains || []
			};
			
			setMonthlyReport(safeReport);
		} catch (error) {
			console.error('Error loading monthly report:', error);
			// Set a safe fallback report
			setMonthlyReport({
				summary: {
					totalTime: 0,
					averageDaily: 0,
					peakDay: { date: 'No data', duration: 0 },
					mostUsedCategory: 'No data',
					mostUsedDomain: 'No data',
					productivityScore: 0
				},
				timeline: [],
				categories: [],
				insights: {
					patterns: [],
					recommendations: [],
					warnings: [],
					achievements: []
				},
				monthlyComparison: {
					thisMonth: 0,
					lastMonth: 0,
					change: 0,
					trend: 'stable' as const
				},
				weeklyBreakdown: [],
				milestones: [],
				topDomains: []
			});
		}
	};

	const loadGoalsData = async () => {
		try {
			const [goalsData, report] = await Promise.all([
				GoalTracker.getGoals(),
				GoalTracker.generateProgressReport('month')
			]);
			setGoals(goalsData);
			setProgressReport(report);
			// Set default goal templates
			setGoalTemplates([
				{ id: 'limit_social', name: 'Limit Social Media', description: 'Reduce time on social platforms', category: 'wellness', type: 'usage_limit' },
				{ id: 'focus_work', name: 'Focus Work Time', description: 'Increase productive work time', category: 'productivity', type: 'usage_target' },
				{ id: 'daily_break', name: 'Daily Break Habit', description: 'Take regular breaks', category: 'wellness', type: 'build_habit' }
			]);
		} catch (error) {
			console.error('Error loading goals data:', error);
		}
	};

	const handleCreateGoal = async (template: any) => {
		try {
			const goal: Goal = {
				...template,
				id: `goal_${Date.now()}`,
				current: {
					value: 0,
					streak: 0,
					lastUpdated: new Date(),
					history: []
				}
			};
			await GoalTracker.saveGoal(goal);
			setShowGoalDialog(false);
			setSelectedTemplate(null);
			await loadGoalsData();
		} catch (error) {
			console.error('Error creating goal:', error);
		}
	};

	const handleDeleteGoal = async (goalId: string, goalName: string) => {
		if (window.confirm(`Are you sure you want to delete the goal "${goalName}"? This action cannot be undone.`)) {
			try {
				await GoalTracker.deleteGoal(goalId);
				await loadGoalsData(); // Refresh goals and templates
			} catch (error) {
				console.error('Error deleting goal:', error);
			}
		}
	};

	const handleRefreshGoalTemplates = async () => {
		// Refresh with default templates
		setGoalTemplates([
			{ id: 'limit_social', name: 'Limit Social Media', description: 'Reduce time on social platforms', category: 'wellness', type: 'usage_limit' },
			{ id: 'focus_work', name: 'Focus Work Time', description: 'Increase productive work time', category: 'productivity', type: 'usage_target' },
			{ id: 'daily_break', name: 'Daily Break Habit', description: 'Take regular breaks', category: 'wellness', type: 'build_habit' }
		]);
	};

	React.useEffect(() => {
		generateAvailablePeriods();
		handleRefresh();
	}, [handleRefresh]);

	const formatTime = (seconds: number): string => formatDurationSeconds(seconds);

	const formatPercentage = (value: number, total: number): string => {
		return `${Math.round((value / total) * 100)}%`;
	};

	const formatDate = (date: Date): string => {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	};

	const formatWeek = (date: Date): string => {
		const start = getWeekStart(date);
		const end = new Date(start);
		end.setDate(start.getDate() + 6);
		return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
	};

	const formatMonth = (date: Date): string => {
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	};

	return (
		<Box sx={{ width: '100%', p: 3 }}>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
				<Typography variant="h4" fontWeight={800} color="text.primary">
					Advanced Analytics
				</Typography>
				<IconButton 
					onClick={handleRefresh}
					disabled={loading}
					sx={{ 
						bgcolor: 'primary.main',
						color: 'white',
						'&:hover': { bgcolor: 'primary.dark' }
					}}
				>
					<RefreshIcon />
				</IconButton>
			</Box>

			<Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
				<Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
					<Tab 
						icon={<AssessmentIcon />} 
						label="Usage Overview" 
						iconPosition="start"
						sx={{ textTransform: 'none', fontWeight: 600 }}
					/>
					<Tab 
						icon={<TimelineIcon />} 
						label="Weekly Report" 
						iconPosition="start"
						sx={{ textTransform: 'none', fontWeight: 600 }}
					/>
					<Tab 
						icon={<TrendingUpIcon />} 
						label="Monthly Report" 
						iconPosition="start"
						sx={{ textTransform: 'none', fontWeight: 600 }}
					/>
					<Tab 
						icon={<FlagIcon />} 
						label="Goal Tracking" 
						iconPosition="start"
						sx={{ textTransform: 'none', fontWeight: 600 }}
					/>
				</Tabs>
			</Box>

			{loading && (
				<Box sx={{ width: '100%', mb: 3 }}>
					<LinearProgress />
				</Box>
			)}

			{/* Usage Overview Tab */}
			{activeTab === 0 && (
				<FadeInView>
					{usageData ? (
						<Grid container spacing={3}>
							<Grid item xs={12} md={4}>
								<Card sx={{ 
									height: '100%', 
									background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
									color: 'white'
								}}>
									<CardContent sx={{ textAlign: 'center' }}>
										<Typography variant="h6" gutterBottom fontWeight={600}>
											Total Time Today
										</Typography>
										<Typography variant="h3" fontWeight={800}>
											{formatTime(usageData.totalTime)}
										</Typography>
									</CardContent>
								</Card>
							</Grid>

							<Grid item xs={12} md={4}>
								<Card sx={{ 
									height: '100%', 
									background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
									color: 'white'
								}}>
									<CardContent sx={{ textAlign: 'center' }}>
										<Typography variant="h6" gutterBottom fontWeight={600}>
											Sessions Today
										</Typography>
										<Typography variant="h3" fontWeight={800}>
											{usageData.sessionsToday}
										</Typography>
									</CardContent>
								</Card>
							</Grid>

							<Grid item xs={12} md={4}>
								<Card sx={{ 
									height: '100%', 
									background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
									color: 'white'
								}}>
									<CardContent sx={{ textAlign: 'center' }}>
										<Typography variant="h6" gutterBottom fontWeight={600}>
											Avg. Session
										</Typography>
										<Typography variant="h3" fontWeight={800}>
											{formatTime(Math.floor(usageData.totalTime / Math.max(1, usageData.sessionsToday)))}
										</Typography>
									</CardContent>
								</Card>
							</Grid>

							<Grid item xs={12}>
								<Card>
									<CardContent>
										<Typography variant="h6" gutterBottom fontWeight={600}>
											Top Domains Today
										</Typography>
										<Stack spacing={2}>
											{usageData.topDomains.map((domain, index) => (
												<Box key={domain.domain} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
													<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
														<Chip 
															label={`#${index + 1}`} 
															size="small" 
															color="primary"
														/>
														<Typography fontWeight={600}>
															{domain.domain}
														</Typography>
														<Chip 
															label={domain.category} 
															size="small" 
															variant="outlined"
														/>
													</Box>
													<Box sx={{ textAlign: 'right' }}>
														<Typography fontWeight={600}>
															{formatTime(domain.time)}
														</Typography>
														<Typography variant="body2" color="text.secondary">
															{formatPercentage(domain.time, usageData.totalTime)}
														</Typography>
													</Box>
												</Box>
											))}
										</Stack>
									</CardContent>
								</Card>
							</Grid>
						</Grid>
					) : (
						<Box sx={{ textAlign: 'center', py: 8 }}>
							<CircularProgress />
							<Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
								Loading analytics data...
							</Typography>
						</Box>
					)}
				</FadeInView>
			)}

			{/* Weekly Report Tab */}
			{activeTab === 1 && (
				<FadeInView>
					<Box sx={{ mb: 3 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
							<Typography variant="h5" fontWeight={700}>
								Weekly Report
							</Typography>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
								<IconButton 
									onClick={() => {
										const currentIndex = availableWeeks.findIndex(w => w.getTime() === selectedWeek.getTime());
										if (currentIndex < availableWeeks.length - 1) {
											const nextWeek = availableWeeks[currentIndex + 1];
											if (nextWeek) setSelectedWeek(nextWeek);
										}
									}}
									disabled={availableWeeks.findIndex(w => w.getTime() === selectedWeek.getTime()) >= availableWeeks.length - 1}
								>
									<ChevronLeftIcon />
								</IconButton>
								<FormControl size="small" sx={{ minWidth: 200 }}>
									<Select
										value={selectedWeek.getTime()}
										onChange={(e) => setSelectedWeek(new Date(e.target.value as number))}
									>
										{availableWeeks.map((week) => (
											<MenuItem key={week.getTime()} value={week.getTime()}>
												{formatWeek(week)}
											</MenuItem>
										))}
									</Select>
								</FormControl>
								<IconButton 
									onClick={() => {
										const currentIndex = availableWeeks.findIndex(w => w.getTime() === selectedWeek.getTime());
										if (currentIndex > 0) {
											const prevWeek = availableWeeks[currentIndex - 1];
											if (prevWeek) setSelectedWeek(prevWeek);
										}
									}}
									disabled={availableWeeks.findIndex(w => w.getTime() === selectedWeek.getTime()) <= 0}
								>
									<ChevronRightIcon />
								</IconButton>
							</Box>
						</Box>
					</Box>

					<ReportLayoutTemplate
						periodType="weekly"
						periodLabel={formatWeek(selectedWeek)}
						summary={weeklyReport?.summary || {
							totalTime: 0,
							averageDaily: 0,
							peakDay: { date: 'No data', duration: 0 },
							mostUsedCategory: 'No data',
							mostUsedDomain: 'No data',
							productivityScore: 0
						}}
						comparison={{
							thisPeriod: weeklyReport?.weeklyComparison?.thisWeek || 0,
							lastPeriod: weeklyReport?.weeklyComparison?.lastWeek || 0,
							change: weeklyReport?.weeklyComparison?.change || 0,
							trend: weeklyReport?.weeklyComparison?.trend || 'stable' as const
						}}
						timelineData={{
							labels: (weeklyReport?.dailyBreakdown || []).map(d => d.day),
							data: (weeklyReport?.dailyBreakdown || []).map(d => d.totalTime || 0),
							label: 'Daily Breakdown'
						}}
						topItems={weeklyDataView === 'domains' 
							? (weeklyReport?.timeline || []).reduce((acc: any[], day) => {
								day.domains?.forEach((domain: any) => {
									const existing = acc.find(item => item.name === domain.name);
									if (existing) {
										existing.value += domain.time;
									} else {
										acc.push({
											name: domain.name,
											value: domain.time,
											category: 'Domain',
											rank: acc.length + 1
										});
									}
								});
								return acc;
							}, []).sort((a: any, b: any) => b.value - a.value).slice(0, 10).map((item: any, index: number) => ({
								...item,
								rank: index + 1
							}))
							: (weeklyReport?.categories || []).slice(0, 10).map((cat, index) => ({
								name: cat.name,
								value: cat.totalTime,
								category: cat.name,
								rank: index + 1
							}))
						}
						dataView={weeklyDataView}
						onDataViewChange={setWeeklyDataView}
						loading={!weeklyReport}
					/>
				</FadeInView>
			)}

			{/* Monthly Report Tab */}
			{activeTab === 2 && (
				<FadeInView>
					<Box sx={{ mb: 3 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
							<Typography variant="h5" fontWeight={700}>
								Monthly Report
							</Typography>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
								<IconButton 
									onClick={() => {
										const currentIndex = availableMonths.findIndex(m => m.getTime() === selectedMonth.getTime());
										if (currentIndex < availableMonths.length - 1) {
											const nextMonth = availableMonths[currentIndex + 1];
											if (nextMonth) setSelectedMonth(nextMonth);
										}
									}}
									disabled={availableMonths.findIndex(m => m.getTime() === selectedMonth.getTime()) >= availableMonths.length - 1}
								>
									<ChevronLeftIcon />
								</IconButton>
								<FormControl size="small" sx={{ minWidth: 200 }}>
									<Select
										value={selectedMonth.getTime()}
										onChange={(e) => setSelectedMonth(new Date(e.target.value as number))}
									>
										{availableMonths.map((month) => (
											<MenuItem key={month.getTime()} value={month.getTime()}>
												{formatMonth(month)}
											</MenuItem>
										))}
									</Select>
								</FormControl>
								<IconButton 
									onClick={() => {
										const currentIndex = availableMonths.findIndex(m => m.getTime() === selectedMonth.getTime());
										if (currentIndex > 0) {
											const prevMonth = availableMonths[currentIndex - 1];
											if (prevMonth) setSelectedMonth(prevMonth);
										}
									}}
									disabled={availableMonths.findIndex(m => m.getTime() === selectedMonth.getTime()) <= 0}
								>
									<ChevronRightIcon />
								</IconButton>
							</Box>
						</Box>
					</Box>

					<ReportLayoutTemplate
						periodType="monthly"
						periodLabel={formatMonth(selectedMonth)}
						summary={monthlyReport?.summary || {
							totalTime: 0,
							averageDaily: 0,
							peakDay: { date: 'No data', duration: 0 },
							mostUsedCategory: 'No data',
							mostUsedDomain: 'No data',
							productivityScore: 0
						}}
						comparison={{
							thisPeriod: monthlyReport?.monthlyComparison?.thisMonth || 0,
							lastPeriod: monthlyReport?.monthlyComparison?.lastMonth || 0,
							change: monthlyReport?.monthlyComparison?.change || 0,
							trend: monthlyReport?.monthlyComparison?.trend || 'stable' as const
						}}
						timelineData={{
							labels: (monthlyReport?.weeklyBreakdown || []).map(w => `Week ${w.weekNumber}`),
							data: (monthlyReport?.weeklyBreakdown || []).map(w => w.totalTime || 0),
							label: 'Weekly Breakdown'
						}}
						topItems={monthlyDataView === 'domains'
							? (monthlyReport?.topDomains || []).slice(0, 10).map((domain) => ({
								name: domain.domain,
								value: domain.totalTime,
								category: domain.category,
								rank: domain.rank,
								change: domain.changeFromLastMonth
							}))
							: (monthlyReport?.categories || []).slice(0, 10).map((cat, index) => ({
								name: cat.name,
								value: cat.totalTime,
								category: cat.name,
								rank: index + 1
							}))
						}
						dataView={monthlyDataView}
						onDataViewChange={setMonthlyDataView}
						milestones={monthlyReport?.milestones || []}
						loading={!monthlyReport}
					/>
				</FadeInView>
			)}

			{/* Goal Tracking Tab */}
			{activeTab === 3 && (
				<FadeInView>
					<Box sx={{ mb: 3 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
							<Typography variant="h5" fontWeight={700}>
								Goal Tracking
							</Typography>
							<EnhancedButton
								startIcon={<AddIcon />}
								onClick={() => setShowGoalDialog(true)}
								variant="contained"
							>
								Create Goal
							</EnhancedButton>
						</Box>
					</Box>

					{progressReport && (
						<Grid container spacing={3}>
							<Grid item xs={12} md={4}>
								<Card sx={{ 
									height: 200,
									background: `linear-gradient(135deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`,
									color: 'white'
								}}>
									<CardContent>
										<Typography variant="h6" gutterBottom>
											Goals Progress
										</Typography>
										<Box sx={{ textAlign: 'center' }}>
											<Typography variant="h3" fontWeight={800}>
												{progressReport.summary.completedGoals}/{progressReport.summary.totalGoals}
											</Typography>
											<Typography variant="body2">
												Completed Goals
											</Typography>
											<LinearProgress 
												variant="determinate" 
												value={(progressReport.summary.completedGoals / Math.max(1, progressReport.summary.totalGoals)) * 100}
												sx={{ mt: 2, bgcolor: 'rgba(255,255,255,0.3)', '& .MuiLinearProgress-bar': { bgcolor: 'white' } }}
											/>
										</Box>
									</CardContent>
								</Card>
							</Grid>

							<Grid item xs={12} md={4}>
								<Card sx={{ height: 200 }}>
									<CardContent>
										<Typography variant="h6" gutterBottom>
											Average Progress
										</Typography>
										<Box sx={{ textAlign: 'center' }}>
											<Typography variant="h3" fontWeight={800} color="primary">
												{Math.round(progressReport.summary.averageProgress)}%
											</Typography>
											<Typography variant="body2" color="text.secondary">
												Across all goals
											</Typography>
											<Chip 
												label={progressReport.summary.topCategory}
												color="primary"
												size="small"
												sx={{ mt: 2 }}
											/>
										</Box>
									</CardContent>
								</Card>
							</Grid>

							<Grid item xs={12} md={4}>
								<Card sx={{ height: 200 }}>
									<CardContent>
										<Typography variant="h6" gutterBottom>
											Weekly Change
										</Typography>
										<Box sx={{ textAlign: 'center' }}>
											<Typography variant="h3" fontWeight={800} 
												color={progressReport.summary.weekOverWeekChange >= 0 ? 'success.main' : 'error.main'}>
												{progressReport.summary.weekOverWeekChange >= 0 ? '+' : ''}{progressReport.summary.weekOverWeekChange}%
											</Typography>
											<Typography variant="body2" color="text.secondary">
												vs last week
											</Typography>
											{progressReport.summary.strugglingArea !== 'none' && (
												<Chip 
													label={`Focus: ${progressReport.summary.strugglingArea}`}
													color="warning"
													size="small"
													sx={{ mt: 2 }}
												/>
											)}
										</Box>
									</CardContent>
								</Card>
							</Grid>

							<Grid item xs={12}>
								<Card>
									<CardContent>
										<Typography variant="h6" gutterBottom>
											Active Goals
										</Typography>
										{goals.length === 0 ? (
											<Box sx={{ textAlign: 'center', py: 4 }}>
												<Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
													No active goals yet. Create your first goal to start tracking progress!
												</Typography>
												<EnhancedButton
													startIcon={<AddIcon />}
													onClick={() => setShowGoalDialog(true)}
													variant="outlined"
												>
													Create Your First Goal
												</EnhancedButton>
											</Box>
										) : (
											<Grid container spacing={2}>
												{goals.filter(g => g.status === 'active').map((goal) => {
													const progress = goal.target.value > 0 ? Math.min(100, (goal.current.value / goal.target.value) * 100) : 0;
													return (
														<Grid item xs={12} md={6} key={goal.id}>
															<Paper sx={{ p: 3 }}>
																<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
																	<Typography variant="h6" fontWeight={600}>
																		{goal.name}
																	</Typography>
																	<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
																		<Chip 
																			label={goal.difficulty}
																			size="small"
																			color={goal.difficulty === 'easy' ? 'success' : goal.difficulty === 'medium' ? 'warning' : 'error'}
																		/>
																		<Tooltip title="Delete Goal">
																			<IconButton 
																				size="small" 
																				onClick={() => handleDeleteGoal(goal.id, goal.name)}
																				sx={{ color: 'error.main', '&:hover': { bgcolor: 'error.light', color: 'white' } }}
																			>
																				<DeleteIcon fontSize="small" />
																			</IconButton>
																		</Tooltip>
																	</Box>
																</Box>
																<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
																	{goal.description}
																</Typography>
																<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
																	<Box sx={{ flex: 1 }}>
																		<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
																			<Typography variant="body2">Progress</Typography>
																			<Typography variant="body2" fontWeight={600}>{Math.round(progress)}%</Typography>
																		</Box>
																		<LinearProgress 
																			variant="determinate" 
																			value={progress}
																			sx={{ height: 8, borderRadius: 4 }}
																		/>
																	</Box>
																	{goal.current.streak > 0 && (
																		<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
																			<StreakIcon color="warning" fontSize="small" />
																			<Typography variant="body2" fontWeight={600}>
																				{goal.current.streak}
																			</Typography>
																		</Box>
																	)}
																</Box>
																<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
																	<Typography variant="body2" color="text.secondary">
																		{goal.current.value} / {goal.target.value} {goal.target.period === 'daily' ? 'daily' : goal.target.period}
																	</Typography>
																	<Chip 
																		label={goal.category}
																		size="small"
																		variant="outlined"
																	/>
																</Box>
															</Paper>
														</Grid>
													);
												})}
											</Grid>
										)}
									</CardContent>
								</Card>
							</Grid>

							{progressReport.summary.recommendations.length > 0 && (
								<Grid item xs={12}>
									<Card>
										<CardContent>
											<Typography variant="h6" gutterBottom>
												Recommendations
											</Typography>
											<Stack spacing={1}>
												{progressReport.summary.recommendations.map((rec, index) => (
													<Alert key={index} severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
														{rec}
													</Alert>
												))}
											</Stack>
										</CardContent>
									</Card>
								</Grid>
							)}
						</Grid>
					)}
				</FadeInView>
			)}

			{/* Goal Creation Dialog */}
			<Dialog 
				open={showGoalDialog} 
				onClose={() => setShowGoalDialog(false)} 
				maxWidth="md" 
				fullWidth
			>
				<DialogTitle>
					<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
						Create New Goal
						<Tooltip title="Refresh Goal Templates">
							<IconButton onClick={handleRefreshGoalTemplates} size="small">
								<AutorenewIcon />
							</IconButton>
						</Tooltip>
					</Box>
				</DialogTitle>
				<DialogContent>
					<Typography variant="body2" sx={{ mb: 3 }}>
						Choose a goal template to get started:
					</Typography>
					<Grid container spacing={2}>
						{goalTemplates.map((template, index) => (
							<Grid item xs={12} md={6} key={index}>
								<Paper 
									sx={{ 
										p: 2, 
										cursor: 'pointer',
										border: selectedTemplate === template ? 2 : 1,
										borderColor: selectedTemplate === template ? 'primary.main' : 'divider',
										'&:hover': { borderColor: 'primary.main' }
									}}
									onClick={() => setSelectedTemplate(template)}
								>
									<Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
										{template.name}
									</Typography>
									<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
										{template.description}
									</Typography>
									<Stack direction="row" spacing={1}>
										<Chip label={template.type.replace('_', ' ')} size="small" />
										<Chip label={template.difficulty} size="small" color="primary" />
										<Chip label={template.category} size="small" variant="outlined" />
									</Stack>
								</Paper>
							</Grid>
						))}
					</Grid>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => { setShowGoalDialog(false); setSelectedTemplate(null); }}>
						Cancel
					</Button>
					<Button
						onClick={() => handleCreateGoal(selectedTemplate)}
						variant="contained"
						disabled={!selectedTemplate}
					>
						Create Goal
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
});

export default AdvancedAnalyticsPanel;
