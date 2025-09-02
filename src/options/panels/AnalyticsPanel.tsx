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
	CircularProgress
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TimelineIcon from '@mui/icons-material/Timeline';
import FlagIcon from '@mui/icons-material/Flag';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useTheme } from '../../contexts/ThemeContext';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

// Register all Chart.js components (robust against missing scale/element issues)
ChartJS.register(...registerables);

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

// Helper function to format time
const formatTime = (seconds: number): string => {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = seconds % 60;

	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	} else if (minutes > 0) {
		return `${minutes}m ${remainingSeconds}s`;
	} else {
		return `${remainingSeconds}s`;
	}
};

// Error boundary wrapper component
class ChartErrorBoundary extends React.Component<
	{ children: React.ReactNode; fallback?: React.ReactNode },
	{ hasError: boolean }
> {
	constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(): { hasError: boolean } {
		return { hasError: true };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
		console.error('Chart rendering error:', error, errorInfo);
	}

	render(): React.ReactNode {
		if (this.state.hasError) {
			return this.props.fallback || (
				<Alert severity="error" sx={{ my: 2 }}>
					<Stack direction="row" alignItems="center" spacing={1}>
						<ErrorOutlineIcon />
						<Typography>Unable to render chart. Please try refreshing.</Typography>
					</Stack>
				</Alert>
			);
		}

		return this.props.children;
	}
}

const AnalyticsPanel = React.memo(function AnalyticsPanel(): React.ReactElement {
	const { theme } = useTheme();
	const [activeTab, setActiveTab] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [usageData, setUsageData] = React.useState<UsageData | null>(null);
	const [error, setError] = React.useState<string | null>(null);

	const handleRefresh = React.useCallback(async () => {
		setLoading(true);
		setError(null);
		
		try {
			// Get real usage data from background script
			const [weeklyUsage, domainUsage, sessionData] = await Promise.all([
				new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'week', by: 'date' } }, (r) => resolve(r))),
				new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'week', by: 'domain' } }, (r) => resolve(r))),
				new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-usage-logs' }, (r) => resolve(r)))
			]);

			// Calculate total time and sessions today
			const today = new Date().toISOString().split('T')[0];
			const todayData = weeklyUsage?.ok ? weeklyUsage.data.find((d: any) => d.key === today) : null;
			const totalTimeToday = todayData ? todayData.seconds : 0;

			// Calculate sessions from logs
			const logs = sessionData?.ok ? sessionData.data : [];
			const todayLogs = logs.filter((log: any) => log.dateKey === today);
			const sessionsToday = todayLogs.length > 0 ? Math.max(1, Math.ceil(todayLogs.length / 10)) : 0;

			// Get domain categories mapping
			const domainCategories = (await chrome.storage.local.get('domainCategories'))['domainCategories'] as Record<string, string> || {};

			// Process top domains with categories
			const topDomains = domainUsage?.ok ? domainUsage.data.slice(0, 5).map((d: any) => ({
				domain: d.key,
				time: d.seconds,
				category: domainCategories[d.key] || 'Other'
			})) : [];

			// Process weekly data for chart (convert to hours per day)
			// Ensure data aligns with chart labels ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
			const weeklyData: number[] = [];
			if (weeklyUsage?.ok && weeklyUsage.data) {
				const dataMap = new Map(weeklyUsage.data.map((d: any) => [d.key, d.seconds]));
				const now = new Date();
				
				// Get last 7 days in order
				for (let i = 6; i >= 0; i--) {
					const date = new Date(now);
					date.setDate(date.getDate() - i);
					const dateKey = date.toISOString().split('T')[0];
					const seconds = Number(dataMap.get(dateKey) || 0);
					weeklyData.push(Math.round(seconds / 3600 * 10) / 10);
				}
			} else {
				// Fill with zeros if no data
				weeklyData.push(...new Array(7).fill(0));
			}

			setUsageData({
				totalTime: totalTimeToday,
				sessionsToday,
				topDomains,
				weeklyData
			});
		} catch (err) {
			setError('Failed to load analytics data. Please try again.');
			console.error('Analytics data fetch error:', err);
		} finally {
			setLoading(false);
		}
	}, []);

	React.useEffect(() => {
		handleRefresh();
	}, [handleRefresh]);

	const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
		setActiveTab(newValue);
	};

	// Chart configurations
	const weeklyChartData = {
		labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
		datasets: [
			{
				label: 'Hours Spent',
				data: usageData?.weeklyData || [],
				borderColor: theme.palette.primary.main,
				backgroundColor: alpha(theme.palette.primary.main, 0.2),
				tension: 0.4,
				fill: true,
			},
		],
	};

	const domainChartData = {
		labels: usageData?.topDomains.map(d => d.domain) || [],
		datasets: [
			{
				data: usageData?.topDomains.map(d => d.time / 3600) || [], // Convert to hours
				backgroundColor: [
					theme.palette.primary.main,
					theme.palette.secondary.main,
					theme.palette.success.main,
					theme.palette.warning.main,
					theme.palette.error.main,
				],
			},
		],
	};

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: 'top' as const,
				labels: {
					color: theme.palette.text.primary,
				},
			},
			title: {
				display: false,
			},
			tooltip: {
				enabled: true,
				backgroundColor: theme.palette.mode === 'dark' 
					? 'rgba(30, 41, 59, 0.95)' 
					: 'rgba(255, 255, 255, 0.95)',
				titleColor: theme.palette.text.primary,
				bodyColor: theme.palette.text.primary,
				borderColor: theme.palette.mode === 'dark' 
					? 'rgba(71, 85, 105, 0.6)' 
					: 'rgba(226, 232, 240, 0.8)',
				borderWidth: 1,
				cornerRadius: 16,
				padding: {
					top: 12,
					right: 16,
					bottom: 14,
					left: 16
				},
				boxShadow: theme.palette.mode === 'dark'
					? '0 25px 50px -12px rgba(0,0,0,0.4), 0 12px 20px -8px rgba(0,0,0,0.2)'
					: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
				opacity: 1,
				displayColors: false,
				animation: {
					duration: 300,
					easing: 'easeOutQuart'
				},
				titleFont: { 
					size: 14, 
					weight: 'bold' as const,
					family: '-apple-system, BlinkMacSystemFont, Segoe UI, Inter, Roboto, sans-serif'
				},
				bodyFont: { 
					size: 12, 
					weight: 500 as const,
					family: '-apple-system, BlinkMacSystemFont, Segoe UI, Inter, Roboto, sans-serif'
				},
				filter: {
					backdropFilter: 'blur(20px) saturate(180%)'
				}
			},
		},
		scales: {
			x: {
				ticks: {
					color: theme.palette.text.secondary,
				},
				grid: {
					color: theme.palette.divider,
				},
			},
			y: {
				ticks: {
					color: theme.palette.text.secondary,
				},
				grid: {
					color: theme.palette.divider,
				},
			},
		},
	};

	const doughnutOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: 'right' as const,
				labels: {
					color: theme.palette.text.primary,
				},
			},
			tooltip: {
				enabled: true,
				backgroundColor: theme.palette.mode === 'dark' 
					? 'rgba(30, 41, 59, 0.95)' 
					: 'rgba(255, 255, 255, 0.95)',
				titleColor: theme.palette.text.primary,
				bodyColor: theme.palette.text.primary,
				borderColor: theme.palette.mode === 'dark' 
					? 'rgba(71, 85, 105, 0.6)' 
					: 'rgba(226, 232, 240, 0.8)',
				borderWidth: 1,
				cornerRadius: 16,
				padding: {
					top: 12,
					right: 16,
					bottom: 14,
					left: 16
				},
				boxShadow: theme.palette.mode === 'dark'
					? '0 25px 50px -12px rgba(0,0,0,0.4), 0 12px 20px -8px rgba(0,0,0,0.2)'
					: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
				opacity: 1,
				displayColors: false,
				animation: {
					duration: 300,
					easing: 'easeOutQuart'
				},
				titleFont: { 
					size: 14, 
					weight: 'bold' as const,
					family: '-apple-system, BlinkMacSystemFont, Segoe UI, Inter, Roboto, sans-serif'
				},
				bodyFont: { 
					size: 12, 
					weight: 500 as const,
					family: '-apple-system, BlinkMacSystemFont, Segoe UI, Inter, Roboto, sans-serif'
				},
				filter: {
					backdropFilter: 'blur(20px) saturate(180%)'
				}
			},
		},
	};

	if (error) {
		return (
			<Box sx={{ p: 3 }}>
				<Alert severity="error" action={
					<IconButton onClick={handleRefresh} color="inherit" size="small">
						<RefreshIcon />
					</IconButton>
				}>
					{error}
				</Alert>
			</Box>
		);
	}

	// Guards for data-driven rendering
	const hasWeeklyData = (usageData?.weeklyData?.length || 0) > 0;
	const hasDomainData = (usageData?.topDomains?.length || 0) > 0;

	return (
		<Box sx={{ width: '100%', p: 3 }}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
				<Typography variant="h4" component="h1" fontWeight="bold">
					Analytics Dashboard
				</Typography>
				<IconButton onClick={handleRefresh} disabled={loading}>
					<RefreshIcon />
				</IconButton>
			</Stack>

			<Tabs
				value={activeTab}
				onChange={handleTabChange}
				variant="fullWidth"
				sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
			>
				<Tab icon={<TrendingUpIcon />} label="Usage Overview" />
				<Tab icon={<AssessmentIcon />} label="Weekly Report" />
				<Tab icon={<TimelineIcon />} label="Monthly Report" />
				<Tab icon={<FlagIcon />} label="Goal Tracking" />
			</Tabs>

			{loading && (
				<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
					<CircularProgress />
				</Box>
			)}

			{!loading && (
				<>
					{/* Usage Overview Tab */}
					{activeTab === 0 && (
						<Grid container spacing={3}>
							{/* Summary Cards */}
							<Grid item xs={12} md={4}>
								<Card sx={{ textAlign: 'center', py: 2 }}>
									<CardContent>
										<Typography variant="h3" color="primary" fontWeight="bold">
											{formatTime(usageData?.totalTime || 0)}
										</Typography>
										<Typography variant="subtitle1" color="text.secondary">
											Total Time Today
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} md={4}>
								<Card sx={{ textAlign: 'center', py: 2 }}>
									<CardContent>
										<Typography variant="h3" color="secondary" fontWeight="bold">
											{usageData?.sessionsToday || 0}
										</Typography>
										<Typography variant="subtitle1" color="text.secondary">
											Sessions Today
										</Typography>
									</CardContent>
								</Card>
							</Grid>
							<Grid item xs={12} md={4}>
								<Card sx={{ textAlign: 'center', py: 2 }}>
									<CardContent>
										<Typography variant="h3" color="success.main" fontWeight="bold">
											{usageData?.totalTime ? formatTime(Math.floor(usageData.totalTime / (usageData.sessionsToday || 1))) : '0s'}
										</Typography>
										<Typography variant="subtitle1" color="text.secondary">
											Avg Session
										</Typography>
									</CardContent>
								</Card>
							</Grid>

							{/* Weekly Chart */}
							<Grid item xs={12} md={8}>
								<Card sx={{ p: 2, height: 300 }}>
									<Typography variant="h6" gutterBottom>
										Weekly Activity
									</Typography>
									<ChartErrorBoundary>
										{hasWeeklyData ? (
											<Line data={weeklyChartData} options={chartOptions} />
										) : (
											<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
												<Typography variant="body2" color="text.secondary">No weekly data available</Typography>
											</Box>
										)}
									</ChartErrorBoundary>
								</Card>
							</Grid>

							{/* Domain Breakdown */}
							<Grid item xs={12} md={4}>
								<Card sx={{ p: 2, height: 300 }}>
									<Typography variant="h6" gutterBottom>
										Top Domains
									</Typography>
									<ChartErrorBoundary>
										{hasDomainData ? (
											<Doughnut data={domainChartData} options={doughnutOptions} />
										) : (
											<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
												<Typography variant="body2" color="text.secondary">No domain data available</Typography>
											</Box>
										)}
									</ChartErrorBoundary>
								</Card>
							</Grid>

							{/* Top Domains List */}
							<Grid item xs={12}>
								<Card sx={{ p: 2 }}>
									<Typography variant="h6" gutterBottom>
										Domain Usage Details
									</Typography>
									<Grid container spacing={2}>
										{usageData?.topDomains.map((domain, index) => (
											<Grid item xs={12} sm={6} md={4} key={index}>
												<Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
													<Stack direction="row" justifyContent="space-between" alignItems="center">
														<Typography variant="subtitle2" noWrap>
															{domain.domain}
														</Typography>
														<Chip
															label={domain.category}
															size="small"
															color="primary"
															variant="outlined"
														/>
													</Stack>
													<Typography variant="h6" color="primary" sx={{ mt: 1 }}>
														{formatTime(domain.time)}
													</Typography>
													<LinearProgress
														variant="determinate"
														value={(domain.time / (usageData?.totalTime || 1)) * 100}
														sx={{ mt: 1 }}
													/>
												</Box>
											</Grid>
										))}
									</Grid>
								</Card>
							</Grid>
						</Grid>
					)}

					{/* Weekly Report Tab */}
					{activeTab === 1 && (
						<Alert severity="info" sx={{ mt: 2 }}>
							<Typography variant="h6" gutterBottom>
								Weekly Report - Coming Soon
							</Typography>
							<Typography>
								Detailed weekly analytics and trends will be available in the next update.
							</Typography>
						</Alert>
					)}

					{/* Monthly Report Tab */}
					{activeTab === 2 && (
						<Alert severity="info" sx={{ mt: 2 }}>
							<Typography variant="h6" gutterBottom>
								Monthly Report - Coming Soon
							</Typography>
							<Typography>
								Comprehensive monthly insights and comparisons will be available in the next update.
							</Typography>
						</Alert>
					)}

					{/* Goal Tracking Tab */}
					{activeTab === 3 && (
						<Alert severity="info" sx={{ mt: 2 }}>
							<Typography variant="h6" gutterBottom>
								Goal Tracking - Coming Soon
							</Typography>
							<Typography>
								Set and track your digital wellness goals with personalized recommendations.
							</Typography>
						</Alert>
					)}
				</>
			)}
		</Box>
	);
});

export default AnalyticsPanel;
