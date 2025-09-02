import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Box, Typography } from '@mui/material';
import '../styles/chart-tooltips.css';
import { formatDurationSeconds } from '../utils/format';
import { useTheme } from '../contexts/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface DataPoint {
	key: string;
	seconds: number;
}

interface Props {
	data: DataPoint[];
	title: string;
	timeframe: 'week' | 'month';
}

export default function EnhancedBarChart({ data, title, timeframe }: Props): JSX.Element {
	const { theme, isDarkMode } = useTheme();
	const maxValue = Math.max(...data.map(d => d.seconds)) || 1;
	
	// Create gradient function for bars
	const createGradient = (ctx: CanvasRenderingContext2D, chartArea: any, intensity: number) => {
		const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
		const primaryColor = theme.palette.primary.main;
		const r = parseInt(primaryColor.slice(1, 3), 16);
		const g = parseInt(primaryColor.slice(3, 5), 16);
		const b = parseInt(primaryColor.slice(5, 7), 16);
		
		const baseAlpha = 0.2 + (intensity * 0.6);
		const topAlpha = 0.8 + (intensity * 0.2);
		
		gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${baseAlpha})`);
		gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${topAlpha})`);
		gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${Math.min(topAlpha + 0.1, 1)})`);
		
		return gradient;
	};
	
	const chartData = {
		labels: data.map(item => {
			if (timeframe === 'week') {
				const date = new Date(item.key);
				return date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
			}
			return item.key;
		}),
		datasets: [
			{
				label: 'Time Spent',
				data: data.map(item => Math.round(item.seconds / 60)),
				backgroundColor: (context: any) => {
					const chart = context.chart;
					const { ctx, chartArea } = chart;
					
					if (!chartArea) {
						// Fallback for initial render
						const intensity = data[context.dataIndex]?.seconds / maxValue || 0;
						const alpha = 0.3 + (intensity * 0.7);
						const primaryColor = theme.palette.primary.main;
						const r = parseInt(primaryColor.slice(1, 3), 16);
						const g = parseInt(primaryColor.slice(3, 5), 16);
						const b = parseInt(primaryColor.slice(5, 7), 16);
						return `rgba(${r}, ${g}, ${b}, ${alpha})`;
					}
					
					const intensity = data[context.dataIndex]?.seconds / maxValue || 0;
					return createGradient(ctx, chartArea, intensity);
				},
				borderColor: theme.palette.primary.main,
				borderWidth: 2,
				borderRadius: {
					topLeft: 8,
					topRight: 8,
				},
				borderSkipped: false,
				hoverBackgroundColor: (context: any) => {
					const chart = context.chart;
					const { ctx, chartArea } = chart;
					
					if (!chartArea) {
						// Fallback for initial render
						const intensity = data[context.dataIndex]?.seconds / maxValue || 0;
						const alpha = 0.5 + (intensity * 0.5);
						const primaryColor = theme.palette.primary.main;
						const r = parseInt(primaryColor.slice(1, 3), 16);
						const g = parseInt(primaryColor.slice(3, 5), 16);
						const b = parseInt(primaryColor.slice(5, 7), 16);
						return `rgba(${r}, ${g}, ${b}, ${alpha})`;
					}
					
					const intensity = data[context.dataIndex]?.seconds / maxValue || 0;
					// Create a more vibrant gradient for hover
					const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
					const primaryColor = theme.palette.primary.main;
					const r = parseInt(primaryColor.slice(1, 3), 16);
					const g = parseInt(primaryColor.slice(3, 5), 16);
					const b = parseInt(primaryColor.slice(5, 7), 16);
					
					const baseAlpha = 0.4 + (intensity * 0.4);
					const topAlpha = 0.9 + (intensity * 0.1);
					
					gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${baseAlpha})`);
					gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${topAlpha})`);
					gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 1)`);
					
					return gradient;
				},
				hoverBorderWidth: 3,
			}
		]
	};

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		animation: {
			duration: 800,
			easing: 'easeInOutQuart',
			delay: (context: any) => context.dataIndex * 60,
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
			legend: {
				display: false
			},
			title: {
				display: false
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
				},
				callbacks: {
					label: (context: any) => {
						const seconds = data[context.dataIndex].seconds;
						return ` ${formatDurationSeconds(seconds)}`;
					},
					title: (context: any) => {
						return context[0].label.length > 20 
							? context[0].label.substring(0, 17) + '...'
							: context[0].label;
					}
				}
			},
		},
		scales: {
			y: {
				beginAtZero: true,
				grid: {
					color: theme.palette.divider,
					lineWidth: 1,
				},
				border: {
					display: false,
				},
				ticks: {
					color: theme.palette.text.secondary,
					font: {
						size: 12,
						weight: '600' as const,
					},
					callback: (value: any) => {
						return `${value}min`;
					}
				}
			},
			x: {
				grid: {
					display: false,
				},
				border: {
					display: false,
				},
				ticks: {
					color: theme.palette.text.secondary,
					font: {
						size: 12,
						weight: '600' as const,
					},
					maxRotation: 45,
				}
			}
		},
		elements: {
			bar: {
				borderSkipped: false,
			}
		}
	};

	const totalTime = data.reduce((sum, item) => sum + item.seconds, 0);
	// Calculate average based on days with actual data, not total days
	const daysWithData = data.filter(item => item.seconds > 0).length;
	const avgTime = daysWithData > 0 ? totalTime / daysWithData : 0;

	return (
		<Box>
			<Box sx={{ mb: 1, textAlign: 'center' }}>
				<Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
					{title}
				</Typography>
				<Box sx={{ display: 'flex', justifyContent: 'center', gap: 3 }}>
					<Box sx={{ textAlign: 'center' }}>
						<Typography variant="h5" fontWeight={700} color="primary.main">
							{formatDurationSeconds(totalTime)}
						</Typography>
						<Typography variant="caption" color="text.secondary" fontWeight={600}>
							Total
						</Typography>
					</Box>
					<Box sx={{ textAlign: 'center' }}>
						<Typography variant="h5" fontWeight={700} color="secondary.main">
							{formatDurationSeconds(avgTime)}
						</Typography>
						<Typography variant="caption" color="text.secondary" fontWeight={600}>
							Daily Avg {daysWithData > 0 ? `(${daysWithData} day${daysWithData === 1 ? '' : 's'})` : ''}
						</Typography>
					</Box>
				</Box>
			</Box>
			{/* Fit nicely inside popup without scrolling */}
			<Box sx={{ position: 'relative', height: '100%' }} className="chart-container">
				<Bar data={chartData} options={options} />
			</Box>
		</Box>
	);
}



