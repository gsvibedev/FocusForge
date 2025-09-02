import React from 'react';
import {
	Box,
	Typography,
	Card,
	CardContent,
	Grid,
	Stack,
	Chip,
	Paper,
	Avatar,
	Divider,
	LinearProgress,
	ToggleButtonGroup,
	ToggleButton
} from '@mui/material';
import {
	TrendingUp as TrendingUpIcon,
	TrendingDown as TrendingDownIcon,
	TrendingFlat as TrendingFlatIcon,
	EmojiEvents as TrophyIcon,
	LocalFireDepartment as StreakIcon,
	Timeline as TimelineIcon,
	Language as DomainIcon,
	Category as CategoryIcon
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useTheme } from '../contexts/ThemeContext';
import { formatDurationSeconds } from '../utils/format';

interface SummaryMetrics {
	totalTime: number;
	averageDaily: number;
	peakDay: { date: string; duration: number };
	mostUsedCategory: string;
	mostUsedDomain: string;
	productivityScore: number;
}

interface ComparisonData {
	thisPeriod: number;
	lastPeriod: number;
	change: number;
	trend: 'improving' | 'declining' | 'stable';
}

interface TimelineData {
	labels: string[];
	data: number[];
	label: string;
}

interface TopItem {
	name: string;
	value: number;
	category?: string;
	rank: number;
	change?: number;
}

interface Milestone {
	date: string;
	type: 'streak' | 'goal' | 'limit' | 'achievement';
	description: string;
}

interface ReportLayoutProps {
	periodType: 'weekly' | 'monthly';
	periodLabel: string;
	summary: SummaryMetrics;
	comparison: ComparisonData;
	timelineData: TimelineData;
	topItems: TopItem[];
	milestones?: Milestone[];
	loading?: boolean;
	dataView?: 'domains' | 'categories';
	onDataViewChange?: (view: 'domains' | 'categories') => void;
}

const ReportLayoutTemplate: React.FC<ReportLayoutProps> = ({
	periodType,
	periodLabel,
	summary,
	comparison,
	timelineData,
	topItems,
	milestones = [],
	loading = false,
	dataView = 'domains',
	onDataViewChange
}) => {
	const { theme } = useTheme();

	const formatTime = (seconds: number): string => formatDurationSeconds(seconds);

	const getTrendIcon = (trend: string) => {
		switch (trend) {
			case 'improving':
				return <TrendingDownIcon color="success" fontSize="small" />;
			case 'declining':
				return <TrendingUpIcon color="error" fontSize="small" />;
			default:
				return <TrendingFlatIcon color="warning" fontSize="small" />;
		}
	};

	const getTrendColor = (trend: string, change: number) => {
		if (trend === 'stable') return 'warning.main';
		return change > 0 ? 'error.main' : 'success.main';
	};

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: false },
			tooltip: {
				backgroundColor: theme.palette.background.paper,
				titleColor: theme.palette.text.primary,
				bodyColor: theme.palette.text.primary,
				borderColor: theme.palette.divider,
				borderWidth: 1,
				cornerRadius: 12,
				displayColors: false,
				titleFont: { weight: 600 },
				bodyFont: { weight: 500 }
			}
		},
		scales: {
			y: {
				beginAtZero: true,
				grid: {
					color: theme.palette.divider,
					drawBorder: false
				},
				ticks: {
					color: theme.palette.text.secondary,
					font: { size: 11 }
				}
			},
			x: {
				grid: {
					display: false
				},
				ticks: {
					color: theme.palette.text.secondary,
					font: { size: 11 }
				}
			}
		}
	};

	const doughnutData = {
		labels: topItems.slice(0, 5).map(item => item.name),
		datasets: [{
			data: topItems.slice(0, 5).map(item => item.value),
			backgroundColor: [
				theme.palette.primary.main,
				theme.palette.secondary.main,
				theme.palette.success.main,
				theme.palette.warning.main,
				theme.palette.error.main,
			],
			borderWidth: 0,
			cutout: '65%'
		}]
	};

	if (loading) {
		return (
			<Box sx={{ textAlign: 'center', py: 8 }}>
				<Typography variant="h6" color="text.secondary">
					Generating {periodLabel.toLowerCase()} report...
				</Typography>
			</Box>
		);
	}

	return (
		<Grid container spacing={3}>
			{/* Summary Cards Row */}
			<Grid item xs={12}>
				<Grid container spacing={2}>
					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ 
							height: 140,
							background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
							color: 'white'
						}}>
							<CardContent sx={{ textAlign: 'center', py: 2 }}>
								<Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
									Total Time
								</Typography>
								<Typography variant="h4" fontWeight={800}>
									{formatTime(summary.totalTime)}
								</Typography>
								<Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
									{periodLabel}
								</Typography>
							</CardContent>
						</Card>
					</Grid>

					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ height: 140 }}>
							<CardContent sx={{ textAlign: 'center', py: 2 }}>
								<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
									Daily Average
								</Typography>
								<Typography variant="h4" fontWeight={800} color="primary">
									{formatTime(summary.averageDaily)}
								</Typography>
								<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
									per day
								</Typography>
							</CardContent>
						</Card>
					</Grid>

					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ height: 140 }}>
							<CardContent sx={{ textAlign: 'center', py: 2 }}>
								<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
									Peak Day
								</Typography>
								<Typography variant="h6" fontWeight={700} color="text.primary">
									{summary.peakDay.date || 'No data'}
								</Typography>
								<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
									{formatTime(summary.peakDay.duration)}
								</Typography>
							</CardContent>
						</Card>
					</Grid>

					<Grid item xs={12} sm={6} md={3}>
						<Card sx={{ height: 140 }}>
							<CardContent sx={{ textAlign: 'center', py: 2 }}>
								<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
									Productivity Score
								</Typography>
								<Typography variant="h4" fontWeight={800} 
									color={summary.productivityScore >= 70 ? 'success.main' : 
										   summary.productivityScore >= 50 ? 'warning.main' : 'error.main'}>
									{summary.productivityScore}
								</Typography>
								<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
									out of 100
								</Typography>
							</CardContent>
						</Card>
					</Grid>
				</Grid>
			</Grid>

			{/* Comparison and Timeline Row */}
			<Grid item xs={12} md={6}>
				<Card sx={{ height: 300 }}>
					<CardContent>
						<Typography variant="h6" gutterBottom fontWeight={600}>
							{periodType === 'weekly' ? 'Week Comparison' : 'Month Comparison'}
						</Typography>
						<Box sx={{ textAlign: 'center', mb: 3 }}>
							<Typography variant="h3" fontWeight={800} 
								color={getTrendColor(comparison.trend, comparison.change)}>
								{comparison.change > 0 ? '+' : ''}{comparison.change}%
							</Typography>
							<Typography variant="body2" color="text.secondary">
								vs last {periodType === 'weekly' ? 'week' : 'month'}
							</Typography>
							<Chip 
								icon={getTrendIcon(comparison.trend)}
								label={comparison.trend}
								color={comparison.trend === 'improving' ? 'success' : 
									   comparison.trend === 'declining' ? 'error' : 'warning'}
								size="small"
								sx={{ mt: 1 }}
							/>
						</Box>
						<Divider sx={{ my: 2 }} />
						<Stack spacing={2}>
							<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
								<Typography variant="body2">This {periodType === 'weekly' ? 'week' : 'month'}:</Typography>
								<Typography variant="body2" fontWeight={600}>{formatTime(comparison.thisPeriod)}</Typography>
							</Box>
							<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
								<Typography variant="body2">Last {periodType === 'weekly' ? 'week' : 'month'}:</Typography>
								<Typography variant="body2" fontWeight={600}>{formatTime(comparison.lastPeriod)}</Typography>
							</Box>
						</Stack>
					</CardContent>
				</Card>
			</Grid>

			<Grid item xs={12} md={6}>
				<Card sx={{ height: 300 }}>
					<CardContent>
						<Typography variant="h6" gutterBottom fontWeight={600}>
							{timelineData.label}
						</Typography>
						<Box sx={{ height: 220 }}>
							{periodType === 'weekly' ? (
								<Bar
									data={{
										labels: timelineData.labels,
										datasets: [{
											label: 'Hours',
											data: timelineData.data.map(d => d / 3600),
											backgroundColor: theme.palette.primary.main,
											borderRadius: 6,
											maxBarThickness: 32
										}]
									}}
									options={chartOptions}
								/>
							) : (
								<Line
									data={{
										labels: timelineData.labels,
										datasets: [{
											label: 'Hours',
											data: timelineData.data.map(d => d / 3600),
											borderColor: theme.palette.primary.main,
											backgroundColor: `${theme.palette.primary.main}20`,
											fill: true,
											tension: 0.4,
											pointBackgroundColor: theme.palette.primary.main,
											pointBorderColor: 'white',
											pointBorderWidth: 2,
											pointRadius: 4
										}]
									}}
									options={chartOptions}
								/>
							)}
						</Box>
					</CardContent>
				</Card>
			</Grid>

			{/* Top Domains/Categories */}
			<Grid item xs={12} md={6}>
				<Card sx={{ height: 400 }}>
					<CardContent>
						<Typography variant="h6" gutterBottom fontWeight={600}>
							Top {periodType === 'weekly' ? 'Domains' : 'Domains'} - Distribution
						</Typography>
						<Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
							<Box sx={{ position: 'relative', width: 250, height: 250 }}>
								<Doughnut
									data={doughnutData}
									options={{
										responsive: true,
										maintainAspectRatio: false,
										plugins: {
											legend: { display: false },
											tooltip: {
												backgroundColor: theme.palette.background.paper,
												titleColor: theme.palette.text.primary,
												bodyColor: theme.palette.text.primary,
												borderColor: theme.palette.divider,
												borderWidth: 1,
												cornerRadius: 12,
												displayColors: true,
												titleFont: { weight: 600 },
												bodyFont: { weight: 500 }
											}
										},
										cutout: '65%'
									}}
								/>
								<Box sx={{
									position: 'absolute',
									top: '50%',
									left: '50%',
									transform: 'translate(-50%, -50%)',
									textAlign: 'center'
								}}>
									<Typography variant="h6" fontWeight={700}>
										{topItems.length}
									</Typography>
									<Typography variant="body2" color="text.secondary">
										domains
									</Typography>
								</Box>
							</Box>
						</Box>
					</CardContent>
				</Card>
			</Grid>

			<Grid item xs={12} md={6}>
				<Card sx={{ height: 400 }}>
					<CardContent>
						<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
							<Typography variant="h6" fontWeight={600}>
								Top {dataView === 'domains' ? 'Domains' : 'Categories'} - Details
							</Typography>
							{onDataViewChange && (
								<ToggleButtonGroup
									value={dataView}
									exclusive
									onChange={(_, value) => value && onDataViewChange(value)}
									size="small"
									sx={{ ml: 2 }}
								>
									<ToggleButton value="domains" aria-label="domains">
										<DomainIcon sx={{ mr: 0.5, fontSize: 16 }} />
										Domains
									</ToggleButton>
									<ToggleButton value="categories" aria-label="categories">
										<CategoryIcon sx={{ mr: 0.5, fontSize: 16 }} />
										Categories
									</ToggleButton>
								</ToggleButtonGroup>
							)}
						</Box>
						<Box sx={{ maxHeight: 320, overflow: 'auto' }}>
							<Stack spacing={1.5}>
								{topItems.slice(0, 8).map((item, index) => (
									<Paper key={item.name} sx={{ p: 2, bgcolor: 'background.default' }}>
										<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
											<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
												<Chip 
													label={`#${item.rank}`} 
													size="small" 
													color="primary"
													sx={{ minWidth: 36, fontWeight: 600 }}
												/>
												<Box sx={{ flex: 1, minWidth: 0 }}>
													<Typography variant="body2" fontWeight={600} noWrap>
														{item.name.length > 25 ? `${item.name.substring(0, 22)}...` : item.name}
													</Typography>
													{item.category && (
														<Typography variant="caption" color="text.secondary">
															{item.category}
														</Typography>
													)}
												</Box>
											</Box>
											<Box sx={{ textAlign: 'right', minWidth: 80 }}>
												<Typography variant="body2" fontWeight={600}>
													{formatTime(item.value)}
												</Typography>
												{item.change !== undefined && (
													<Typography 
														variant="caption" 
														color={item.change > 0 ? 'error.main' : item.change < 0 ? 'success.main' : 'text.secondary'}
													>
														{item.change > 0 ? '+' : ''}{item.change}%
													</Typography>
												)}
											</Box>
										</Box>
									</Paper>
								))}
							</Stack>
						</Box>
					</CardContent>
				</Card>
			</Grid>

			{/* Milestones */}
			{milestones.length > 0 && (
				<Grid item xs={12}>
					<Card>
						<CardContent>
							<Typography variant="h6" gutterBottom fontWeight={600}>
								Milestones & Achievements
							</Typography>
							<Grid container spacing={2}>
								{milestones.map((milestone, index) => (
									<Grid item xs={12} sm={6} md={4} key={index}>
										<Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
											<Avatar sx={{ 
												bgcolor: milestone.type === 'streak' ? 'warning.main' : 
														milestone.type === 'goal' ? 'success.main' :
														milestone.type === 'achievement' ? 'primary.main' : 'info.main'
											}}>
												{milestone.type === 'streak' ? <StreakIcon /> : <TrophyIcon />}
											</Avatar>
											<Box sx={{ flex: 1, minWidth: 0 }}>
												<Typography variant="body2" fontWeight={600} noWrap>
													{milestone.description}
												</Typography>
												<Typography variant="caption" color="text.secondary">
													{new Date(milestone.date).toLocaleDateString()}
												</Typography>
											</Box>
										</Paper>
									</Grid>
								))}
							</Grid>
						</CardContent>
					</Card>
				</Grid>
			)}
		</Grid>
	);
};

export default ReportLayoutTemplate;

