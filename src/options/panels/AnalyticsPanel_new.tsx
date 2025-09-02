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
	Button
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TimelineIcon from '@mui/icons-material/Timeline';
import FlagIcon from '@mui/icons-material/Flag';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTheme } from '../../contexts/ThemeContext';

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

const AnalyticsPanel = React.memo(function AnalyticsPanel(): React.ReactElement {
	const { theme } = useTheme();
	const [activeTab, setActiveTab] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [usageData, setUsageData] = React.useState<UsageData | null>(null);

	const handleRefresh = React.useCallback(() => {
		setLoading(true);
		setTimeout(() => {
			setUsageData({
				totalTime: 28800,
				sessionsToday: 12,
				topDomains: [
					{ domain: 'github.com', time: 7200, category: 'Development' },
					{ domain: 'stackoverflow.com', time: 3600, category: 'Development' },
					{ domain: 'youtube.com', time: 1800, category: 'Entertainment' }
				],
				weeklyData: [6, 8, 5.5, 7, 9, 3, 4]
			});
			setLoading(false);
		}, 1000);
	}, []);

	React.useEffect(() => {
		handleRefresh();
	}, [handleRefresh]);

	const formatTime = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		return `${hours}h ${minutes}m`;
	};

	const formatPercentage = (value: number, total: number): string => {
		return `${Math.round((value / total) * 100)}%`;
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
				<Box>
					{usageData ? (
						<Grid container spacing={3}>
							<Grid item xs={12} md={4}>
								<Card sx={{ height: '100%', background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})` }}>
									<CardContent sx={{ color: 'white', textAlign: 'center' }}>
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
								<Card sx={{ height: '100%', background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})` }}>
									<CardContent sx={{ color: 'white', textAlign: 'center' }}>
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
								<Card sx={{ height: '100%', background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})` }}>
									<CardContent sx={{ color: 'white', textAlign: 'center' }}>
										<Typography variant="h6" gutterBottom fontWeight={600}>
											Avg. Session
										</Typography>
										<Typography variant="h3" fontWeight={800}>
											{formatTime(Math.floor(usageData.totalTime / usageData.sessionsToday))}
										</Typography>
									</CardContent>
								</Card>
							</Grid>

							<Grid item xs={12}>
								<Card>
									<CardContent>
										<Typography variant="h6" gutterBottom fontWeight={600}>
											Top Domains
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
							<Typography variant="h6" color="text.secondary">
								Loading analytics data...
							</Typography>
						</Box>
					)}
				</Box>
			)}

			{/* Weekly Report Tab */}
			{activeTab === 1 && (
				<Box>
					<Alert severity="info" sx={{ mb: 3 }}>
						<Typography variant="body2">
							📊 Weekly analytics and trend charts are coming soon! Stay tuned for detailed insights.
						</Typography>
					</Alert>
					<Card>
						<CardContent>
							<Typography variant="h6" gutterBottom>
								Weekly Overview
							</Typography>
							<Typography color="text.secondary">
								This section will show detailed weekly usage patterns, productivity trends, and comparative analysis.
							</Typography>
						</CardContent>
					</Card>
				</Box>
			)}

			{/* Monthly Report Tab */}
			{activeTab === 2 && (
				<Box>
					<Alert severity="info" sx={{ mb: 3 }}>
						<Typography variant="body2">
							📈 Monthly reports with advanced visualizations are under development.
						</Typography>
					</Alert>
					<Card>
						<CardContent>
							<Typography variant="h6" gutterBottom>
								Monthly Analytics
							</Typography>
							<Typography color="text.secondary">
								Comprehensive monthly insights, goal progress tracking, and habit analysis will be available here.
							</Typography>
						</CardContent>
					</Card>
				</Box>
			)}

			{/* Goal Tracking Tab */}
			{activeTab === 3 && (
				<Box>
					<Alert severity="warning" sx={{ mb: 3 }}>
						<Typography variant="body2">
							🎯 Goal tracking and gamification features are being implemented for the next release.
						</Typography>
					</Alert>
					<Card>
						<CardContent>
							<Typography variant="h6" gutterBottom>
								Goal Tracking
							</Typography>
							<Typography color="text.secondary">
								Set daily/weekly goals, track achievements, and unlock productivity badges. Full gamification system coming soon!
							</Typography>
						</CardContent>
					</Card>
				</Box>
			)}
		</Box>
	);
});

export default AnalyticsPanel;
