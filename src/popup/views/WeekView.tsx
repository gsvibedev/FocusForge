import React from 'react';
import { Box, Card, CardContent, useTheme, Typography, Stack } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EnhancedBarChart from '../../components/EnhancedBarChart';
import FadeInView from '../../components/FadeInView';
import { ChartLoadingSkeleton } from '../../components/LoadingStates';

export default function WeekView(): JSX.Element {
	const { theme, isDarkMode } = useTheme();
	const [rows, setRows] = React.useState<{ key: string; seconds: number }[]>([]);
	const [isLoading, setIsLoading] = React.useState(true);

	React.useEffect(() => {
		setIsLoading(true);
		chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'week', by: 'date' } }, (res) => {
			if (res?.ok) setRows(res.data);
			setIsLoading(false);
		});
	}, []);

	if (isLoading) {
		return (
			<ChartLoadingSkeleton 
				title="Loading weekly data..."
				height={300}
				bars={7}
			/>
		);
	}

	if (rows.length === 0) {
		return (
				<Box display="flex" justifyContent="center" alignItems="center" height={300}>
					<Card elevation={0} sx={{ 
						p: 4, 
						textAlign: 'center', 
						backgroundColor: theme.palette.background.paper, 
						border: `2px dashed ${theme.palette.divider}`,
						borderRadius: 3,
						boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)'
					}}>
					<CardContent>
						<Stack spacing={2} alignItems="center">
							<CalendarTodayIcon 
								sx={{ 
									fontSize: 48, 
									color: theme.palette.text.disabled,
									opacity: 0.5
								}} 
							/>
							<Typography variant="h6" color="text.secondary" fontWeight={600}>
								No Weekly Data Yet
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
								Start browsing to see your weekly usage patterns. Data will appear here as you visit websites.
							</Typography>
							<Typography variant="caption" color="text.disabled">
								💡 Tip: Weekly view shows daily breakdowns for the past 7 days
							</Typography>
						</Stack>
					</CardContent>
				</Card>
			</Box>
		);
	}

	return (
			<FadeInView>
				<Card elevation={0} sx={{ 
					borderRadius: 3, 
					overflow: 'hidden',
					boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
					transition: 'all 0.2s ease',
					'&:hover': {
						boxShadow: '0 6px 24px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.12)',
						transform: 'translateY(-2px)'
					}
				}}>
			<CardContent sx={{ p: 3 }}>
				<EnhancedBarChart data={rows} title="Weekly Usage" timeframe="week" />
			</CardContent>
			</Card>
		</FadeInView>
	);
}