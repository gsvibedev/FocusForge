import React, { type ReactElement } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Box, Typography, Stack, Chip } from '@mui/material';
import '../styles/chart-tooltips.css';
import { stringToColor, adjustHexLightness } from '../utils/colors';
import { formatDurationSeconds } from '../utils/format';
import { useTheme } from '../contexts/ThemeContext';

ChartJS.register(ArcElement, Tooltip, Legend);

// Fixed external tooltip handler that prevents layout shifts
const externalTooltipHandler = (context: any, isDarkMode?: boolean) => {
  const { chart, tooltip } = context;
  
  // Create unique ID for this chart's tooltip
  const chartId = chart.canvas.id || 'chart-' + Math.random().toString(36).substr(2, 9);
  if (!chart.canvas.id) chart.canvas.id = chartId;
  const tooltipId = `tooltip-${chartId}`;

  let tooltipEl = document.getElementById(tooltipId) as HTMLDivElement | null;
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = tooltipId;
    tooltipEl.className = `chartjs-tooltip ${isDarkMode ? 'dark' : ''}`;
    tooltipEl.style.position = 'fixed';
    tooltipEl.style.pointerEvents = 'none';
    tooltipEl.style.transform = 'translate(-50%, -120%)';
    tooltipEl.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
    tooltipEl.style.zIndex = '10000';
    tooltipEl.style.opacity = '0';
    tooltipEl.style.visibility = 'hidden';
    tooltipEl.style.willChange = 'transform, opacity';
    // Append to document.body to prevent layout shifts
    document.body.appendChild(tooltipEl);
  } else {
    // Update theme class if tooltip already exists
    tooltipEl.className = `chartjs-tooltip ${isDarkMode ? 'dark' : ''}`;
  }

  // Let CSS classes handle theming - remove inline styles that override dark mode
  // Only set essential positioning and layout styles
  tooltipEl.style.borderRadius = '16px';
  tooltipEl.style.backdropFilter = 'blur(20px) saturate(180%)';
  tooltipEl.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, sans-serif';
  tooltipEl.style.minWidth = '140px';
  tooltipEl.style.maxWidth = '320px';
  tooltipEl.style.padding = '0';
  tooltipEl.style.overflow = 'hidden';

  // Hide with elegant animation
  if (!tooltip || tooltip.opacity === 0) {
    tooltipEl.style.opacity = '0';
    tooltipEl.style.visibility = 'hidden';
    tooltipEl.style.transform = 'translate(-50%, -130%) scale(0.92)';
    tooltipEl.style.filter = 'blur(4px)';
    return;
  }

  // Extract data for professional formatting
  const dataIndex = tooltip.dataPoints?.[0]?.dataIndex;
  const label = tooltip.title?.[0] || '';
  const bodyLines = tooltip.body?.map((b: any) => b.lines?.[0]).filter(Boolean) || [];
  
  // Get color from chart data
  const backgroundColor = chart.data.datasets[0]?.backgroundColor?.[dataIndex] || '#6366f1';
  
  // Create professional tooltip structure with theme-aware colors and XSS protection
  const textColor = isDarkMode ? '#ffffff' : '#1f2937';
  const shadowColor = isDarkMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.3)';
  
  // Safely sanitize and truncate the label
  const sanitizedLabel = (label || '').replace(/[<>&"']/g, '').trim();
  const truncatedLabel = sanitizedLabel.length > 30 ? sanitizedLabel.substring(0, 27) + '...' : sanitizedLabel;
  
  // Safely sanitize body text
  const sanitizedBodyText = bodyLines.map(line => (line || '').replace(/[<>&"']/g, '')).join(' ');
  
  // Clear existing content and build DOM safely
  tooltipEl.innerHTML = '';
  
  // Create title container
  const titleDiv = document.createElement('div');
  titleDiv.className = 'chartjs-tooltip-title';
  const titleBorderColor = isDarkMode ? 'rgba(71, 85, 105, 0.6)' : 'rgba(226, 232, 240, 0.6)';
  const titleBackground = isDarkMode 
    ? 'linear-gradient(135deg, rgba(51, 65, 85, 0.3) 0%, rgba(30, 41, 59, 0.4) 100%)'
    : 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.9) 100%)';
  titleDiv.style.cssText = `display: flex; align-items: center; gap: 8px; padding: 12px 16px 10px; margin: 0; border-bottom: 1px solid ${titleBorderColor}; background: ${titleBackground};`;
  
  // Create color indicator
  const colorIndicator = document.createElement('div');
  colorIndicator.style.cssText = `
    width: 8px; 
    height: 8px; 
    border-radius: 50%; 
    background: ${backgroundColor};
    box-shadow: 0 0 0 2px ${shadowColor}, 0 2px 4px rgba(0,0,0,0.1);
    flex-shrink: 0;
  `;
  
  // Create title text
  const titleText = document.createElement('span');
  titleText.style.cssText = `font-weight: 600; color: ${textColor}; letter-spacing: -0.025em;`;
  titleText.textContent = truncatedLabel; // Safe text content
  
  titleDiv.appendChild(colorIndicator);
  titleDiv.appendChild(titleText);
  
  // Create body container
  const bodyDiv = document.createElement('div');
  bodyDiv.className = 'chartjs-tooltip-body';
  bodyDiv.style.cssText = 'padding: 12px 16px 14px; margin: 0;';
  
  const bodyContent = document.createElement('div');
  bodyContent.style.cssText = `
    display: flex; 
    align-items: center; 
    justify-content: space-between;
    padding: 2px 0;
    font-weight: 500;
    letter-spacing: -0.01em;
  `;
  
  const bodyText = document.createElement('span');
  bodyText.style.cssText = `font-weight: 600; color: ${textColor};`;
  bodyText.textContent = `Usage ${sanitizedBodyText}`; // Safe text content
  
  bodyContent.appendChild(bodyText);
  bodyDiv.appendChild(bodyContent);
  
  // Assemble tooltip
  tooltipEl.appendChild(titleDiv);
  tooltipEl.appendChild(bodyDiv);

  // Calculate position relative to viewport
  const canvasRect = chart.canvas.getBoundingClientRect();
  const tooltipX = canvasRect.left + tooltip.caretX;
  const tooltipY = canvasRect.top + tooltip.caretY;
  
  tooltipEl.style.opacity = '1';
  tooltipEl.style.visibility = 'visible';
  tooltipEl.style.left = `${tooltipX}px`;
  tooltipEl.style.top = `${tooltipY}px`;
  tooltipEl.style.transform = 'translate(-50%, -120%) scale(1)';
  tooltipEl.style.filter = 'blur(0px)';
};

interface SummaryRow {
	key: string;
	seconds: number;
}

interface Props {
	data: SummaryRow[];
}

export default function EnhancedPieChart({ data }: Props): ReactElement {
	const { theme, isDarkMode } = useTheme();
	const total = data.reduce((sum, item) => sum + item.seconds, 0) || 1;
	const sorted = data.sort((a, b) => b.seconds - a.seconds);

	// Limit to top 10 items for better display and performance
	const topItems = sorted.slice(0, 10);
	
	// Create gradient function for pie segments
	const createRadialGradient = (ctx: CanvasRenderingContext2D, chartArea: any, baseColor: string) => {
		const centerX = chartArea.left + (chartArea.right - chartArea.left) / 2;
		const centerY = chartArea.top + (chartArea.bottom - chartArea.top) / 2;
		const radius = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top) / 2;
		
		const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
		
		// Extract RGB values from hex color
		const r = parseInt(baseColor.slice(1, 3), 16);
		const g = parseInt(baseColor.slice(3, 5), 16);
		const b = parseInt(baseColor.slice(5, 7), 16);
		
		gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.9)`);
		gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.8)`);
		gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.6)`);
		
		return gradient;
	};

	// Cleanup orphaned tooltips on unmount
	React.useEffect(() => {
		return () => {
			// Clean up tooltips specifically created by this component
			const chartTooltips = document.querySelectorAll('.chartjs-tooltip');
			chartTooltips.forEach(tooltip => {
				if (tooltip.parentNode === document.body) {
					tooltip.remove();
				}
			});
		};
	}, []);

	const chartData = {
		labels: topItems.map(item => item.key),
		datasets: [
			{
				data: topItems.map(item => Math.max(1, Math.round(item.seconds / 60))),
				backgroundColor: (context: any) => {
					const chart = context.chart;
					const { ctx, chartArea } = chart;
					
					if (!chartArea) {
						// Fallback for initial render
						return stringToColor(topItems[context.dataIndex]?.key || '');
					}
					
					const baseColor = stringToColor(topItems[context.dataIndex]?.key || '');
					return createRadialGradient(ctx, chartArea, baseColor);
				},
				borderColor: topItems.map(item => adjustHexLightness(stringToColor(item.key), -15)),
				borderWidth: 3,
				hoverBorderWidth: 4,
				hoverBackgroundColor: (context: any) => {
					const chart = context.chart;
					const { ctx, chartArea } = chart;
					
					if (!chartArea) {
						// Fallback for initial render
						return adjustHexLightness(stringToColor(topItems[context.dataIndex]?.key || ''), 10);
					}
					
					const baseColor = adjustHexLightness(stringToColor(topItems[context.dataIndex]?.key || ''), 15);
					// Create a more vibrant gradient for hover
					const centerX = chartArea.left + (chartArea.right - chartArea.left) / 2;
					const centerY = chartArea.top + (chartArea.bottom - chartArea.top) / 2;
					const radius = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top) / 2;
					
					const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
					
					const r = parseInt(baseColor.slice(1, 3), 16);
					const g = parseInt(baseColor.slice(3, 5), 16);
					const b = parseInt(baseColor.slice(5, 7), 16);
					
					gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
					gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.9)`);
					gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.7)`);
					
					return gradient;
				},
				borderRadius: 4,
				borderSkipped: false,
			}
		]
	};

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		cutout: '65%',
		plugins: {
			legend: {
				display: false
			},
			tooltip: {
				enabled: false,
				external: (context: any) => externalTooltipHandler(context, isDarkMode),
				displayColors: false,
				titleFont: { size: 14, weight: 'bold' as const },
				bodyFont: { size: 12 },
				callbacks: {
					label: (context: any) => {
						const idx = context?.dataIndex;
						const value = (idx === undefined || idx === null) ? 0 : (topItems[idx]?.seconds || 0);
						const percentage = Math.round((value / total) * 100);
						return `${percentage}% ${formatDurationSeconds(value)}`;
					}
				}
			}
		},
		elements: {
			arc: {
				borderJoinStyle: 'round' as const
			}
		}
	};

	return (
		<Box>
			<Box 
				sx={{ 
					position: 'relative', 
					height: 200, 
					width: '100%',
					overflow: 'hidden',
					mb: 2
				}} 
				className="chart-container"
			>
				<Doughnut data={chartData} options={options} />
				<Box
					sx={{
						position: 'absolute',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						textAlign: 'center',
						pointerEvents: 'none'
					}}
				>
					<Typography variant="h4" fontWeight={800} color="primary.main">
						{formatDurationSeconds(total)}
					</Typography>
					<Typography variant="body2" color="text.secondary" fontWeight={600}>
						Total Time
					</Typography>
				</Box>
			</Box>
			
			<Stack spacing={1}>
				{topItems.map((item, index) => {
					const percentage = Math.round((item.seconds / total) * 100);
					const color = stringToColor(item.key);
					return (
						<Box
							key={item.key}
							sx={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								py: 1.5,
								px: 2,
								borderRadius: 2,
					backgroundColor: index % 2 === 0 
						? theme.palette.action.hover
						: 'transparent',
					border: '1px solid',
					borderColor: theme.palette.divider,
					transition: 'all 0.2s ease',
					'&:hover': {
						backgroundColor: theme.palette.action.selected,
						transform: 'translateY(-1px)',
						boxShadow: `0 2px 8px ${theme.palette.action.selected}`
					}
							}}
						>
							<Stack direction="row" alignItems="center" spacing={1.5}>
								<Box
									sx={{
										width: 16,
										height: 16,
										borderRadius: '50%',
										backgroundColor: color,
										border: `2px solid ${adjustHexLightness(color, -10)}`,
										flexShrink: 0
									}}
								/>
								<Typography fontWeight={700} sx={{ fontSize: '0.95rem' }}>
									{item.key}
								</Typography>
							</Stack>
							<Stack direction="row" alignItems="center" spacing={1}>
								<Chip
									label={`${percentage}%`}
									size="small"
									sx={{
										backgroundColor: color,
									color: theme.palette.getContrastText(color),
										fontWeight: 700,
										fontSize: '0.8rem',
										minWidth: 45
									}}
								/>
								<Typography variant="body2" fontWeight={600} color="text.secondary">
									{formatDurationSeconds(item.seconds)}
								</Typography>
							</Stack>
						</Box>
					);
				})}
			</Stack>
		</Box>
	);
}





