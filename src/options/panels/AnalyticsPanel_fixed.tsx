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
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TimelineIcon from '@mui/icons-material/Timeline';
import FlagIcon from '@mui/icons-material/Flag';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useTheme } from '../../contexts/ThemeContext';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	BarElement,
	ArcElement,
	Title,
	Tooltip,
	Legend,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	BarElement,
	ArcElement,
	Title,
	Tooltip,
	Legend
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
			// Simulate API call with error handling
			await new Promise(resolve => setTimeout(resolve, 1000));
			
			setUsageData({
				totalTime: 28800, // 8 hours in seconds
				sessionsToday: 12,
				topDomains: [
					{ domain: 'github.com', time: 7200, category: 'Development' },
					{ domain: 'stackoverflow.com', time: 3600, category: 'Development' },
					{ domain: 'youtube.com', time: 1800, category: 'Entertainment' },
					{ domain: 'twitter.com', time: 900, category: 'Social' },
					{ domain: 'linkedin.com', time: 600, category: 'Professional' }
				],
				weeklyData: [6, 8, 7, 9, 8, 4, 5] // Hours per day for the week
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
				backgroundColor: `${theme.palette.primary.main}20`,
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
										<Line data={weeklyChartData} options={chartOptions} />
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
										<Doughnut data={domainChartData} options={doughnutOptions} />
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
