import React from 'react';
import { Box, Typography, Stack, FormControlLabel, Switch, Card, CardContent } from '@mui/material';
import CleanPieChart from '../../components/CleanPieChart';
import FadeInView from '../../components/FadeInView';
import { generateUsageInsights, UsageInsights } from '../../utils/analytics';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingCard } from '../../components/LoadingStates';

interface SummaryRow { key: string; seconds: number }

interface Props {
	onSelectDomain?: (domain: string) => void;
}

export default function TodayView({ onSelectDomain }: Props): React.ReactElement {
	const { theme, isDarkMode } = useTheme();
	const [domainData, setDomainData] = React.useState<SummaryRow[]>([]);
	const [categoryData, setCategoryData] = React.useState<SummaryRow[]>([]);
	const [groupByCategory, setGroupByCategory] = React.useState(false);
	const [switching, setSwitching] = React.useState(false);
	const [insights, setInsights] = React.useState<UsageInsights | null>(null);
	const [loading, setLoading] = React.useState(true);
	const hasLoadedRef = React.useRef(false);

	// Derived data based on current toggle
	const currentData = groupByCategory ? categoryData : domainData;

	React.useEffect(() => {
		const loadData = async () => {
			// Start with optimistic loading - show content faster
			setLoading(true);
			
			// Load essential data first (today's data) without delay
			const loadEssentialData = async () => {
				const [todayDomainData, todayCategoryData] = await Promise.all([
					new Promise<SummaryRow[]>((resolve) => {
						chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'today', by: 'domain' } }, (res) => resolve(res?.ok ? (res.data as SummaryRow[]) : []));
					}),
					new Promise<SummaryRow[]>((resolve) => {
						chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'today', by: 'category' } }, (res) => resolve(res?.ok ? (res.data as SummaryRow[]) : []));
					})
				]);
				
				// Set essential data immediately to show content
				setDomainData(todayDomainData);
				setCategoryData(todayCategoryData);
				setLoading(false);
				hasLoadedRef.current = true;
				
				// Load insights data in background
				const [weekData, monthData] = await Promise.all([
					new Promise<SummaryRow[]>((resolve) => {
						chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'week', by: 'date' } }, (res) => resolve(res?.ok ? (res.data as SummaryRow[]) : []));
					}),
					new Promise<SummaryRow[]>((resolve) => {
						chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'month', by: 'date' } }, (res) => resolve(res?.ok ? (res.data as SummaryRow[]) : []));
					})
				]);
				
				const usageInsights = await generateUsageInsights(todayDomainData, weekData, monthData);
				setInsights(usageInsights);
				
				// Add debugging info for empty data
				if (todayDomainData.length === 0 && todayCategoryData.length === 0) {
					console.warn('[TodayView] No usage data found for today. This might indicate:');
					console.warn('1. No browsing activity has been recorded today');
					console.warn('2. The extension is not properly tracking usage');
					console.warn('3. There might be a database or timezone issue');
					
					// Try to get some debug info
					chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'all', by: 'domain' } }, (allRes) => {
						if (allRes?.ok && allRes.data?.length > 0) {
							console.log('[TodayView] Extension has recorded data (total items):', allRes.data.length);
							console.log('[TodayView] But no data found for today. Today\'s date key should be:', new Date().toISOString().split('T')[0]);
						} else {
							console.log('[TodayView] No usage data found in entire database - extension may not be tracking properly');
						}
					});
				}
			};
			
			// Request immediate commit and load data
			console.log('[TodayView] Requesting immediate commit and data refresh...');
			chrome.runtime.sendMessage({ type: 'force-immediate-commit' }, () => {
				console.log('[TodayView] Immediate commit completed, loading data...');
				// Minimal delay for commit, then load essential data immediately
				setTimeout(() => {
					console.log('[TodayView] Loading essential data...');
					loadEssentialData();
				}, 100);
			});

			// Also request a debug dump of today's data for troubleshooting
			setTimeout(() => {
				chrome.runtime.sendMessage({ type: 'debug-todays-data' }, (response) => {
					if (response?.ok && response.data) {
						console.log('[TodayView] Debug - Today\'s usage data:', response.data);
					}
				});

				// Also request a complete data refresh to ensure everything is in sync
				chrome.runtime.sendMessage({ type: 'force-data-refresh' }, (response) => {
					if (response?.ok && response.data) {
						console.log('[TodayView] Debug - Complete data refresh:', response.data);
					}
				});
			}, 100);
		};
		
		loadData();
	}, []); // Only load once

	function handleToggle(_: any, checked: boolean): void {
		setSwitching(true);
		setGroupByCategory(checked);
		setTimeout(() => setSwitching(false), 300);
	}

		// Show loading only for very brief initial load
	if (loading && !hasLoadedRef.current) {
		return (
			<Box sx={{ p: 2.5, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>
					Loading...
				</Typography>
			</Box>
		);
	}

		return (
			<Box sx={{ p: 2.5 }}>
			{currentData.length === 0 ? (
				<FadeInView>
					<Box sx={{ 
						textAlign: 'center', 
						py: 8, 
						background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
						borderRadius: 3, 
						border: `2px dashed ${theme.palette.divider}`,
						position: 'relative',
						overflow: 'hidden'
					}}>
						<Stack spacing={2} alignItems="center">
							<Box sx={{
								width: 64,
								height: 64,
								borderRadius: '50%',
								background: `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.secondary.main}20 100%)`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								border: `1px solid ${theme.palette.divider}`
							}}>
								<Typography sx={{ fontSize: '2rem' }}>📊</Typography>
							</Box>
							<Typography variant="h6" fontWeight={600} color="text.primary">
								No Activity Today
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ maxWidth: 250 }}>
								Start browsing to see your daily usage statistics and track your digital habits.
							</Typography>
							<Typography variant="caption" color="text.disabled">
								⚡ Real-time tracking begins automatically
							</Typography>
						</Stack>
					</Box>
				</FadeInView>
			) : (
				<Stack spacing={2}>
					<FadeInView delay={0.05}>
						<Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
							<FormControlLabel
								control={<Switch size="small" checked={groupByCategory} onChange={handleToggle} />}
								label={<Typography variant="caption" fontWeight={600} color="text.primary">Categories</Typography>}
								sx={{ 
									m: 0, 
									backgroundColor: theme.palette.background.paper, 
									borderRadius: 2, 
									px: 1.5, 
									py: 0.5, 
									border: `1px solid ${theme.palette.divider}` 
								}}
							/>
						</Box>
					</FadeInView>

					{/* Chart with crossfade */}
					<Box sx={{ position: 'relative', overflow: 'visible' }}>
						<FadeInView key={groupByCategory ? 'cat' : 'site'} delay={0.05} duration={0.3} y={10} sx={{ position: switching ? 'absolute' : 'relative', inset: 0 }}>
							<CleanPieChart data={currentData} onRowClick={onSelectDomain || undefined} isCategory={groupByCategory} />
						</FadeInView>
					</Box>

					{/* Smart Insights temporarily hidden - implementation preserved for future enhancement */}
					{false && insights && insights.recommendations.length > 0 && !switching && (
						<FadeInView delay={switching ? 0.5 : 0.2}>
							<Card elevation={0} sx={{ 
								borderRadius: 2, 
								backgroundColor: theme.palette.background.paper,
								boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
								transition: 'all 0.2s ease',
								'&:hover': {
									boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
									transform: 'translateY(-1px)'
								}
							}}>
								<CardContent sx={{ p: 2 }}>
									<Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>💡 Smart Insights</Typography>
									<Stack spacing={0.5}>
										{insights.recommendations.slice(0, 2).map((rec, i) => (
											<Typography key={i} variant="caption" color="text.secondary">• {rec}</Typography>
										))}
									</Stack>
								</CardContent>
							</Card>
						</FadeInView>
					)}
				</Stack>
			)}
			</Box>
	);
}