import React from 'react';
import { Box, Typography, Stack, Card, CardContent, Collapse, Divider, Link, ToggleButtonGroup, ToggleButton, useTheme } from '@mui/material';
import FadeInView from '../../components/FadeInView';
import { Bar } from 'react-chartjs-2';
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	Tooltip,
} from 'chart.js';
import { formatDurationSeconds } from '../../utils/format';
import CleanPieChart from '../../components/CleanPieChart';
import type { LimitChangeRecord } from '../../storage/limitsStore';
import { normalizeDomain } from '../../utils/time';
import { ChartLoadingSkeleton, LoadingSkeleton, LoadingCard } from '../../components/LoadingStates';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

type TimeRange = 'week' | 'month';

interface Props {
	onSelectDomain?: (domain: string) => void;
}

export default function StatsView({ onSelectDomain }: Props): React.ReactElement {
	const currentTheme = useTheme();
	const isDarkMode = currentTheme.palette.mode === 'dark';
	const [timeRange, setTimeRange] = React.useState<TimeRange>('week');
	const [data, setData] = React.useState<{ key: string; seconds: number }[]>([]);
	const [domainSummary, setDomainSummary] = React.useState<{ key: string; seconds: number }[]>([]);
	const [categorySummary, setCategorySummary] = React.useState<{ key: string; seconds: number }[]>([]);
	const [topMode, setTopMode] = React.useState<'sites' | 'categories'>('sites');
	const [limitHistory, setLimitHistory] = React.useState<LimitChangeRecord[]>([]);
	const [limitsReachedWeek, setLimitsReachedWeek] = React.useState<number>(0);
	const [limitsReachedMonth, setLimitsReachedMonth] = React.useState<number>(0);
	const [showHistory, setShowHistory] = React.useState(false);
	const [section, setSection] = React.useState<'overview' | 'breakdown' | 'limits'>('overview');
	const [isLoading, setIsLoading] = React.useState(true);

	React.useEffect(() => {
		const load = async (): Promise<void> => {
			setIsLoading(true);
			// Force commit any pending usage for real-time accuracy
			await new Promise<void>((resolve) => chrome.runtime.sendMessage({ type: 'force-immediate-commit' }, () => resolve()));
			
			const [byDate, byDomain, byCategory, historyRes, limitsRes, logsRes] = await Promise.all([
				new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: timeRange, by: 'date' } }, (r) => resolve(r))),
				new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: timeRange, by: 'domain' } }, (r) => resolve(r))),
				new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: timeRange, by: 'category' } }, (r) => resolve(r))),
				new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-limit-history' }, (r) => resolve(r))),
				new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-limits' }, (r) => resolve(r))),
				new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-usage-logs' }, (r) => resolve(r)))
			]);

			if (byDate?.ok) setData(byDate.data as { key: string; seconds: number }[]);
			if (byDomain?.ok) setDomainSummary(byDomain.data as { key: string; seconds: number }[]);
			if (byCategory?.ok) setCategorySummary(byCategory.data as { key: string; seconds: number }[]);
			if (historyRes?.ok) setLimitHistory(historyRes.data as LimitChangeRecord[]);

			try {
				const limits = (limitsRes?.ok ? limitsRes.data : []) as Array<any>;
				const logs = (logsRes?.ok ? logsRes.data : []) as Array<{ domain: string; seconds: number; dateKey: string }>;
				const mapping = (await chrome.storage.local.get('domainCategories'))['domainCategories'] as Record<string, string> | undefined;

				const now = new Date();
				const past7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
				const past30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);

				const byDayDomain = new Map<string, number>();
				for (const row of logs) {
					const key = `${row.dateKey}|${row.domain}`;
					byDayDomain.set(key, (byDayDomain.get(key) ?? 0) + row.seconds);
				}

				function dateKeyToDate(k: string): Date {
					const parts = k.split('-');
					if (parts.length !== 3) return new Date(NaN);
					const [ys, ms, ds] = parts as [string, string, string];
					const y = Number(ys);
					const m = Number(ms);
					const d = Number(ds);
					return new Date(y, m - 1, d);
				}

				let reachedWeek = 0;
				let reachedMonth = 0;

				for (const limit of limits) {
					const threshold = limit.limitMinutes * 60;
					if (limit.targetType === 'site') {
						const targetBase = normalizeDomain(limit.targetId);
						const matchesSite = (d: string): boolean => {
							const keyNorm = normalizeDomain(d);
							return keyNorm === targetBase || keyNorm.endsWith(`.${targetBase}`);
						};
						if (limit.timeframe === 'daily') {
							// Sum per-day totals across domains/subdomains matching target base
							const dayTotalsWeek = new Map<string, number>();
							const dayTotalsMonth = new Map<string, number>();
							for (const [key, secs] of byDayDomain) {
								const parts = key.split('|');
								const dateKey = parts[0];
								const domain = parts[1];
								if (!dateKey || !domain) continue;
								if (!matchesSite(domain)) continue;
								const d = dateKeyToDate(dateKey);
								if (d >= past7) dayTotalsWeek.set(dateKey, (dayTotalsWeek.get(dateKey) ?? 0) + secs);
								if (d >= past30) dayTotalsMonth.set(dateKey, (dayTotalsMonth.get(dateKey) ?? 0) + secs);
							}
							reachedWeek += Array.from(dayTotalsWeek.values()).filter((s) => s >= threshold).length;
							reachedMonth += Array.from(dayTotalsMonth.values()).filter((s) => s >= threshold).length;
						} else if (limit.timeframe === 'weekly') {
							let sum7 = 0;
							let sum30 = 0;
							for (const [key, secs] of byDayDomain) {
								const parts = key.split('|');
								const dateKey = parts[0];
								const domain = parts[1];
								if (!dateKey || !domain) continue;
								if (!matchesSite(domain)) continue;
								const d = dateKeyToDate(dateKey);
								if (d >= past7) sum7 += secs;
								if (d >= past30) sum30 += secs;
							}
							reachedWeek += sum7 >= threshold ? 1 : 0;
							reachedMonth += sum30 >= threshold ? 1 : 0;
						} else if (limit.timeframe === 'monthly') {
							let sum30 = 0;
							for (const [key, secs] of byDayDomain) {
								const parts = key.split('|');
								const dateKey = parts[0];
								const domain = parts[1];
								if (!dateKey || !domain) continue;
								if (!matchesSite(domain)) continue;
								const d = dateKeyToDate(dateKey);
								if (d >= past30) sum30 += secs;
							}
							reachedMonth += sum30 >= threshold ? 1 : 0;
						}
					} else {
						const domainOfCat = (domain: string): boolean => (mapping?.[domain] ?? 'Other') === limit.targetId;
						if (limit.timeframe === 'daily') {
							const dayTotals = new Map<string, number>();
							for (const [key, secs] of byDayDomain) {
								const parts = key.split('|');
								const dateKey = parts[0];
								const domain = parts[1];
								if (!dateKey || !domain) continue;
								if (!domainOfCat(domain)) continue;
								dayTotals.set(dateKey, (dayTotals.get(dateKey) ?? 0) + secs);
							}
							for (const [dateKey, secs] of dayTotals) {
								const d = dateKeyToDate(dateKey);
								if (secs >= threshold) {
									if (d >= past7) reachedWeek += 1;
									if (d >= past30) reachedMonth += 1;
								}
							}
						} else {
							let sum7 = 0;
							let sum30 = 0;
							for (const [key, secs] of byDayDomain) {
								const parts = key.split('|');
								const dateKey = parts[0];
								const domain = parts[1];
								if (!dateKey || !domain) continue;
								if (!domainOfCat(domain)) continue;
								const d = dateKeyToDate(dateKey);
								if (d >= past7) sum7 += secs;
								if (d >= past30) sum30 += secs;
							}
							reachedWeek += limit.timeframe === 'weekly' ? (sum7 >= threshold ? 1 : 0) : 0;
							reachedMonth += sum30 >= threshold ? 1 : 0;
						}
					}
				}

				setLimitsReachedWeek(reachedWeek);
				setLimitsReachedMonth(reachedMonth);
			} catch {
				// ignore
			} finally {
				setIsLoading(false);
			}
		};

		void load();
	}, [timeRange]);

	const totalTime = data.reduce((sum, item) => sum + item.seconds, 0);
	// Calculate average based on days with actual data, not total days
	const daysWithData = data.filter(item => item.seconds > 0).length;
	const avgTime = daysWithData > 0 ? totalTime / daysWithData : 0;

	// Create gradient for chart bars
	const createGradient = (ctx: CanvasRenderingContext2D) => {
		const gradient = ctx.createLinearGradient(0, 0, 0, 400);
		const primaryColor = currentTheme.palette.primary.main;
		const lightColor = isDarkMode ? currentTheme.palette.primary.dark : currentTheme.palette.primary.light;
		
		gradient.addColorStop(0, primaryColor);
		gradient.addColorStop(1, lightColor);
		return gradient;
	};

	const chartData = {
		labels: data.map(item => {
			const date = new Date(item.key);
			return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
		}),
		datasets: [
			{
				label: 'Minutes',
				data: data.map(item => Math.round(item.seconds / 60)),
				backgroundColor: (context: any) => {
					const chart = context.chart;
					const { ctx } = chart;
					if (!ctx) return isDarkMode ? currentTheme.palette.primary.dark : currentTheme.palette.primary.light;
					return createGradient(ctx);
				},
				borderColor: currentTheme.palette.primary.main,
				borderWidth: 1,
				barThickness: timeRange === 'week' ? 30 : 20,
			}
		]
	};

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		animation: {
			duration: 750,
			easing: 'easeInOutQuart',
			delay: (context: any) => context.dataIndex * 50,
		},
		transitions: {
			active: {
				animation: {
					duration: 400,
					easing: 'easeOutQuart'
				}
			}
		},
		plugins: {
			legend: { display: false },
			tooltip: {
				backgroundColor: currentTheme.palette.background.paper,
				titleColor: currentTheme.palette.text.primary,
				bodyColor: currentTheme.palette.text.secondary,
				borderColor: currentTheme.palette.divider,
				borderWidth: 1,
				cornerRadius: 8,
				callbacks: {
					label: (context: any) => {
						const idx = typeof context?.dataIndex === 'number' ? context.dataIndex as number : undefined;
						const seconds = idx != null && data[idx] ? data[idx].seconds : 0;
						return formatDurationSeconds(seconds);
					}
				}
			}
		},
		scales: {
			y: {
				beginAtZero: true,
				grid: { color: currentTheme.palette.divider, lineWidth: 1 },
				border: { display: false },
				ticks: {
					color: currentTheme.palette.text.secondary,
					font: { size: 11 },
					callback: (value: any) => `${value}m`,
				}
			}
			,
			x: {
				grid: { display: false },
				border: { display: false },
				ticks: {
					color: currentTheme.palette.text.secondary,
					font: { size: 11 },
				}
			}
		}
	};

	return (
		<Box sx={{ p: 2 }}>
			{/* Compact sticky controls */}
			<Box sx={{ position: 'sticky', top: 0, zIndex: 2, mb: 2, backgroundColor: currentTheme.palette.background.default }}>
				<Stack
					direction="row"
					alignItems="center"
					justifyContent="space-between"
					sx={{
					p: 1,
					border: `1px solid ${currentTheme.palette.divider}`,
					backgroundColor: currentTheme.palette.background.paper,
					borderRadius: 2,
					boxShadow: `0 1px 2px ${currentTheme.palette.action.selected}`
				}}
				>
					<ToggleButtonGroup
						size="small"
						value={section}
						exclusive
						onChange={(_e, v) => v && setSection(v)}
						aria-label="Stats section"
						sx={{
						backgroundColor: currentTheme.palette.background.paper,
						border: `1px solid ${currentTheme.palette.divider}`,
						borderRadius: 1.5,
						overflow: 'hidden',
						'& .MuiToggleButton-root': {
							px: 1.2,
							py: 0.5,
							fontSize: '0.72rem',
							textTransform: 'none',
							color: currentTheme.palette.text.secondary,
							border: 0
						},
						'& .MuiToggleButton-root.Mui-selected': {
							backgroundColor: currentTheme.palette.text.secondary,
							color: currentTheme.palette.background.paper
						},
						'& .MuiToggleButton-root.Mui-selected:hover': {
							backgroundColor: currentTheme.palette.text.primary
						}
					}}
					>
						<ToggleButton value="overview">Overview</ToggleButton>
						<ToggleButton value="breakdown">Breakdown</ToggleButton>
						<ToggleButton value="limits">Limits</ToggleButton>
					</ToggleButtonGroup>

					<ToggleButtonGroup
						size="small"
						value={timeRange}
						exclusive
						onChange={(_e, v) => v && setTimeRange(v)}
						aria-label="Time range"
						sx={{
						backgroundColor: currentTheme.palette.background.paper,
						border: `1px solid ${currentTheme.palette.divider}`,
						borderRadius: 1.5,
						overflow: 'hidden',
						'& .MuiToggleButton-root': {
							px: 1.2,
							py: 0.5,
							fontSize: '0.72rem',
							textTransform: 'none',
							color: currentTheme.palette.text.secondary,
							border: 0,
							minWidth: 56,
							transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
							'&:hover': {
								transform: 'translateY(-1px)',
								boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
							},
							'&:active': {
								transform: 'translateY(0px) scale(0.98)'
							}
						},
						'& .MuiToggleButton-root.Mui-selected': {
							backgroundColor: currentTheme.palette.text.secondary,
							color: currentTheme.palette.background.paper
						},
						'& .MuiToggleButton-root.Mui-selected:hover': {
							backgroundColor: currentTheme.palette.text.primary
						}
					}}
					>
						<ToggleButton value="week">Week</ToggleButton>
						<ToggleButton value="month">Month</ToggleButton>
					</ToggleButtonGroup>
				</Stack>
			</Box>

			{/* Overview */}
			{section === 'overview' && (
				<FadeInView delay={0.1}>
					{isLoading ? (
						<Box>
							<Stack direction="row" spacing={3} sx={{ mb: 2 }}>
								<Box>
									<LoadingSkeleton width={40} height={12} sx={{ mb: 0.5 }} />
									<LoadingSkeleton width={60} height={16} />
								</Box>
								<Box>
									<LoadingSkeleton width={80} height={12} sx={{ mb: 0.5 }} />
									<LoadingSkeleton width={60} height={16} />
								</Box>
							</Stack>
							<ChartLoadingSkeleton 
								title="Loading usage data..."
								height={280}
								bars={timeRange === 'week' ? 7 : 30}
							/>
						</Box>
					) : (
						<Box>
							<Stack direction="row" spacing={3} sx={{ mb: 2 }}>
								<Box>
									<Typography variant="caption" color="text.secondary">Total</Typography>
									<Typography variant="body2" fontWeight={600} color="text.primary">{formatDurationSeconds(totalTime)}</Typography>
								</Box>
								<Box>
									<Typography variant="caption" color="text.secondary">
										Daily average {daysWithData > 0 ? `(${daysWithData} day${daysWithData === 1 ? '' : 's'})` : ''}
									</Typography>
									<Typography variant="body2" fontWeight={600} color="text.primary">{formatDurationSeconds(avgTime)}</Typography>
								</Box>
							</Stack>
							{data.length === 0 ? (
								<Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
									<Stack spacing={2} alignItems="center">
										<Typography variant="h6" color="text.secondary" fontWeight={600}>
											No Data Available
										</Typography>
										<Typography variant="body2" color="text.secondary" sx={{ maxWidth: 250 }}>
											No browsing activity recorded for the selected {timeRange}. Start visiting websites to see your usage patterns.
										</Typography>
										<Typography variant="caption" color="text.disabled">
											⏱️ Data updates in real-time as you browse
										</Typography>
									</Stack>
								</Box>
							) : (
								<Box sx={{ height: 280 }}>
									<Bar data={chartData as any} options={options as any} />
								</Box>
							)}
						</Box>
					)}
				</FadeInView>
			)}

			{/* Breakdown */}
			{section === 'breakdown' && (
				<FadeInView delay={0.1}>
					{isLoading ? (
						<Box>
							<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
								<LoadingSkeleton width={120} height={16} />
								<LoadingSkeleton width={140} height={32} />
							</Stack>
							<LoadingCard 
								title="Loading breakdown data..."
								height={300}
							/>
						</Box>
					) : (
						<Box>
							<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
								<Typography variant="body2" fontWeight={700}>Top {topMode === 'sites' ? 'sites' : 'categories'}</Typography>
								<ToggleButtonGroup 
								size="small" 
								value={topMode} 
								exclusive 
								onChange={(_, v) => v && setTopMode(v)}
								sx={{
									'& .MuiToggleButton-root': {
										transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
										'&:hover': {
											transform: 'translateY(-1px)',
											boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
										},
										'&:active': {
											transform: 'translateY(0px) scale(0.98)'
										}
									}
								}}
							>
								<ToggleButton value="sites">Sites</ToggleButton>
								<ToggleButton value="categories">Categories</ToggleButton>
							</ToggleButtonGroup>
							</Stack>
							<Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${currentTheme.palette.divider}` }}>
								<CardContent sx={{ p: 1.5 }}>
									<CleanPieChart
										data={topMode === 'sites' ? domainSummary : categorySummary}
										{...(onSelectDomain ? { onRowClick: onSelectDomain } : {})}
										isCategory={topMode === 'categories'}
									/>
								</CardContent>
							</Card>
						</Box>
					)}
				</FadeInView>
			)}

			{/* Limits */}
			{section === 'limits' && (
				<FadeInView delay={0.1}>
					{isLoading ? (
						<LoadingCard 
							title="Loading limit insights..."
							subtitle="Analyzing your usage patterns"
							height={200}
							showSubtitle
						/>
					) : (
						<Box>
							<Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${currentTheme.palette.divider}` }}>
								<CardContent sx={{ p: 1.5 }}>
									<Stack direction="row" alignItems="center" justifyContent="space-between">
										<Typography variant="body2" fontWeight={700}>Limit insights</Typography>
										<Link component="button" type="button" underline="hover" onClick={() => setShowHistory((s) => !s)} sx={{ fontSize: '0.8rem' }}>
											{showHistory ? 'Hide history' : 'View change history'}
										</Link>
									</Stack>
									<Stack direction="row" spacing={3} sx={{ mt: 1 }}>
										<Box>
											<Typography variant="caption" color="text.secondary">Reaches this week</Typography>
											<Typography variant="body2" fontWeight={600}>{limitsReachedWeek}</Typography>
										</Box>
										<Box>
											<Typography variant="caption" color="text.secondary">Reaches this month</Typography>
											<Typography variant="body2" fontWeight={600}>{limitsReachedMonth}</Typography>
							</Box>
						</Stack>
									<Collapse in={showHistory} timeout="auto" unmountOnExit>
										<Divider sx={{ my: 1 }} />
										<Stack spacing={1}>
											{limitHistory.slice(-6).reverse().map((h, i) => {
												// Format timestamp consistently
												const timestamp = new Date(h.timestamp).toLocaleString('en-US', {
													month: 'numeric',
													day: 'numeric',
													hour: 'numeric',
													minute: '2-digit',
													hour12: false
												});
												
												// Truncate display name to consistent length for alignment
												const maxNameLength = 15;
												const truncatedName = h.displayName.length > maxNameLength 
													? `${h.displayName.substring(0, maxNameLength)}...`
													: h.displayName;
												
												// Create consistent left text format
												const leftText = `${timestamp} • ${h.action.toUpperCase()} • ${truncatedName}`;
												
												return (
													<Box key={i} sx={{ 
														display: 'flex', 
														justifyContent: 'space-between',
														alignItems: 'center',
														minHeight: 20
													}}>
														<Typography 
															variant="caption" 
															color="text.secondary"
															sx={{ 
																flex: 1,
																overflow: 'hidden',
																textOverflow: 'ellipsis',
																whiteSpace: 'nowrap',
																maxWidth: '70%',
																fontFamily: 'monospace',
																fontSize: '0.7rem'
															}}
														>
															{leftText}
														</Typography>
														<Box sx={{ 
															ml: 2,
															minWidth: 60,
															textAlign: 'right',
															fontFamily: 'monospace'
														}}>
															<Typography 
																variant="caption" 
																color="text.secondary"
																sx={{ 
																	fontSize: '0.7rem',
																	fontWeight: 600
																}}
															>
																{h.oldMinutes !== undefined ? `${h.oldMinutes}→` : ''}{h.newMinutes ?? h.oldMinutes} min
															</Typography>
														</Box>
													</Box>
												);
											})}
										</Stack>
									</Collapse>
								</CardContent>
							</Card>
						</Box>
					)}
				</FadeInView>
			)}
		</Box>
	);
}
