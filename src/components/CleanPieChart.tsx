import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Box, Typography, Stack } from '@mui/material';
import '../styles/chart-tooltips.css';
import { formatDurationSeconds } from '../utils/format';
import { useTheme } from '../contexts/ThemeContext';
import FaviconAvatar from './FaviconAvatar';

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
  const rawLabel = tooltip.title?.[0] || '';
  const label = rawLabel.trim();
  const bodyLines = tooltip.body?.map((b: any) => b.lines?.[0]).filter(Boolean) || [];
  
  // Skip tooltip if we don't have a valid label
  if (!label || label === '') {
    return;
  }
  
  // Get color from chart data
  const backgroundColor = chart.data.datasets[0]?.backgroundColor?.[dataIndex] || '#6366f1';
  
  // Create professional tooltip structure with theme-aware colors and XSS protection
  const textColor = isDarkMode ? '#ffffff' : '#1f2937';
  const shadowColor = isDarkMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.3)';
  
  // Safely sanitize and truncate the label
  const sanitizedLabel = (label || '').replace(/[<>&"']/g, '').trim();
  const truncatedLabel = sanitizedLabel.length > 25 ? sanitizedLabel.substring(0, 22) + '...' : sanitizedLabel;
  
  // Safely sanitize body text
  const sanitizedBodyText = bodyLines.map(line => (line || '').replace(/[<>&"']/g, '')).join(' ');
  
  // Clear existing content and build DOM safely
  tooltipEl.innerHTML = '';
  
  // Create title container with theme-aware border
  const titleDiv = document.createElement('div');
  titleDiv.className = 'chartjs-tooltip-title';
  const borderColor = isDarkMode ? 'rgba(71, 85, 105, 0.6)' : 'rgba(226, 232, 240, 0.6)';
  titleDiv.style.cssText = `display: flex; align-items: center; gap: 8px; padding: 12px 16px 10px; margin: 0; border-bottom: 1px solid ${borderColor};`;
  
  // Apply dark mode background for title
  if (isDarkMode) {
    titleDiv.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)';
  } else {
    titleDiv.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.05) 100%)';
  }
  
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
  bodyText.textContent = `Time spent ${sanitizedBodyText}`; // Safe text content
  
  bodyContent.appendChild(bodyText);
  bodyDiv.appendChild(bodyContent);
  
  // Assemble tooltip
  tooltipEl.appendChild(titleDiv);
  tooltipEl.appendChild(bodyDiv);

  // Calculate position relative to chart canvas
  const canvasRect = chart.canvas.getBoundingClientRect();
  const tooltipX = canvasRect.left + tooltip.caretX;
  const tooltipY = canvasRect.top + tooltip.caretY;
  
  // Temporarily show tooltip to get dimensions
  tooltipEl.style.visibility = 'hidden';
  tooltipEl.style.opacity = '1';
  tooltipEl.style.position = 'fixed';
  tooltipEl.style.zIndex = '9999';
  document.body.appendChild(tooltipEl);
  const tooltipRect = tooltipEl.getBoundingClientRect();
  
  // More aggressive popup constraints - typical popup is ~400px wide
  const popupWidth = Math.min(window.innerWidth, 420);
  const popupHeight = Math.min(window.innerHeight, 600);
  const margin = 8;
  
  // Calculate tooltip dimensions and constraints
  const tooltipWidth = Math.min(tooltipRect.width, popupWidth - margin * 2);
  const tooltipHeight = tooltipRect.height;
  
  // Force tooltip to stay within popup bounds
  let finalX = Math.max(margin, Math.min(tooltipX - tooltipWidth / 2, popupWidth - tooltipWidth - margin));
  let finalY = tooltipY - tooltipHeight - 15; // Default: above the point
  
  // If tooltip would go above popup, show it below instead
  if (finalY < margin) {
    finalY = tooltipY + 15; // Below the point
  }
  
  // Final boundary enforcement
  finalY = Math.max(margin, Math.min(finalY, popupHeight - tooltipHeight - margin));
  
  // Set max width to prevent overflow
  tooltipEl.style.maxWidth = `${tooltipWidth}px`;
  tooltipEl.style.wordWrap = 'break-word';
  
  tooltipEl.style.visibility = 'visible';
  tooltipEl.style.left = `${finalX}px`;
  tooltipEl.style.top = `${finalY}px`;
  tooltipEl.style.transform = 'scale(1)';
  tooltipEl.style.filter = 'blur(0px)';
};

interface SummaryRow {
	key: string;
	seconds: number;
}

interface Props {
	data: SummaryRow[];
	onRowClick?: (key: string) => void;
	/** Whether the data represents categories (true) or domains/sites (false) */
	isCategory?: boolean;
}

// Generate theme-aware colors
function generateCleanColors(theme: any, isDarkMode: boolean) {
	const baseColors = [
		theme.palette.primary.main,
		theme.palette.secondary.main,
		theme.palette.success.main,
		theme.palette.warning.main,
		theme.palette.error.main,
		theme.palette.info.main,
		// Additional theme-aware colors for variety
		isDarkMode ? '#FF8A80' : '#FF6B6B', // Soft red
		isDarkMode ? '#80CBC4' : '#4ECDC4', // Soft teal
		isDarkMode ? '#A5D6A7' : '#96CEB4', // Soft green
		isDarkMode ? '#F8BBD9' : '#FF9FF3', // Soft pink
		isDarkMode ? '#9575CD' : '#5F27CD', // Soft purple
		isDarkMode ? '#FFB74D' : '#FF9F43'  // Soft orange
	];
	
	// Adjust opacity for dark mode
	return baseColors.map(color => {
		if (isDarkMode) {
			// Make colors more vibrant in dark mode
			return color;
		} else {
			// Slightly muted in light mode
			return color;
		}
	});
}

export default function CleanPieChart({ data, onRowClick, isCategory = false }: Props): React.ReactElement {
	const { theme, isDarkMode } = useTheme();
	
	// Validate and filter data
	if (!Array.isArray(data)) {
		console.warn('[CleanPieChart] Invalid data received:', data);
		return <Box>No data available</Box>;
	}
	
	// Filter out any invalid entries
	const validData = data.filter(item => 
		item && 
		typeof item === 'object' && 
		typeof item.key === 'string' && 
		item.key.trim() !== '' && // Ensure key is not empty or just whitespace
		typeof item.seconds === 'number' && 
		item.seconds > 0
	);
	
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
		
		gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.95)`);
		gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.8)`);
		gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.65)`);
		
		return gradient;
	};
	
	if (validData.length === 0) {
		return (
			<Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
				<Typography variant="body2">No usage data available for today</Typography>
				<Typography variant="caption" sx={{ mt: 1, display: 'block' }}>Start browsing to see your activity!</Typography>
			</Box>
		);
	}
	
	const total = validData.reduce((sum, item) => sum + item.seconds, 0) || 1;
	const sorted = [...validData].sort((a, b) => b.seconds - a.seconds);
	const cleanColors = generateCleanColors(theme, isDarkMode);

	// Limit to top 10 items for better display and performance
	const topItems = sorted.slice(0, 10);
	
	// Enhanced debug logging for data issues
	console.log('[CleanPieChart] === DATA FLOW DEBUG ===');
	console.log('[CleanPieChart] Raw input data:', data);
	console.log('[CleanPieChart] Valid data after filtering:', validData);
	console.log('[CleanPieChart] Sorted data:', sorted);
	console.log('[CleanPieChart] Top items (should be max 10):', topItems);
	
	if (data.length !== validData.length) {
		console.warn('[CleanPieChart] Some data was filtered out. Original:', data.length, 'Valid:', validData.length);
		const filteredOut = data.filter(item => !validData.includes(item));
		console.log('[CleanPieChart] Items filtered out:', filteredOut);
	}
	
	// Check for any items with empty/invalid keys
	const invalidKeys = topItems.filter(item => !item.key || item.key.trim() === '');
	if (invalidKeys.length > 0) {
		console.error('[CleanPieChart] Found items with invalid/empty keys:', invalidKeys);
	}

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
				data: topItems.map(item => item.seconds), // Use raw seconds for accurate proportions
				backgroundColor: (context: any) => {
					const chart = context.chart;
					const { ctx, chartArea } = chart;
					
					if (!chartArea) {
						// Fallback for initial render
						return cleanColors[context.dataIndex % cleanColors.length];
					}
					
					const baseColor = cleanColors[context.dataIndex % cleanColors.length];
					return createRadialGradient(ctx, chartArea, baseColor);
				},
				borderColor: theme.palette.background.paper,
				borderWidth: 2,
				hoverBorderWidth: 3,
				hoverBackgroundColor: (context: any) => {
					const chart = context.chart;
					const { ctx, chartArea } = chart;
					
					if (!chartArea) {
						// Fallback for initial render
						return cleanColors[context.dataIndex % cleanColors.length];
					}
					
					const baseColor = cleanColors[context.dataIndex % cleanColors.length];
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
					gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.75)`);
					
					return gradient;
				},
			}
		]
	};

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		cutout: '70%',
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
						if (idx === undefined || idx === null || !topItems[idx]) return '';
						const value = topItems[idx].seconds;
						const percentage = Math.round((value / total) * 100);
						return `${percentage}% ${formatDurationSeconds(value)}`;
					},
					title: (context: any) => {
						if (!context || !context[0] || !context[0].label) return '';
						return context[0].label.length > 30 
							? context[0].label.substring(0, 30) + '...' 
							: context[0].label;
					}
				}
			}
		},
		animation: {
			animateRotate: true,
			animateScale: true,
			duration: 1000,
			easing: 'easeOutCubic',
			delay: (context: any) => context.dataIndex * 50
		},
		transitions: {
			active: {
				animation: {
					duration: 400,
					easing: 'easeOutQuart'
				}
			},
			resize: {
				animation: {
					duration: 600,
					easing: 'easeInOutCubic'
				}
			}
		},
		interaction: {
			intersect: true,
			mode: 'nearest' as const
		}
	} as const;

	return (
		<Box>
			{/* Chart */}
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
					<Typography variant="h6" fontWeight={600} color="text.primary">
						{formatDurationSeconds(total)}
					</Typography>
					<Typography variant="caption" color="text.secondary" fontWeight={500}>
						Total time
					</Typography>
				</Box>
			</Box>
			
			{/* Clean list */}
			<Stack spacing={0}>
				{topItems.map((item, index) => {
					const percentage = Math.round((item.seconds / total) * 100);
					const color = cleanColors[index % cleanColors.length];
					const displayName = item.key.length > 25 ? `${item.key.substring(0, 22)}...` : item.key;
					
					return (
						<Box
							key={item.key}
							data-testid={`chart-item-${item.key}`}
							tabIndex={onRowClick ? 0 : -1}
							role={onRowClick ? 'button' : 'listitem'}
							aria-label={`${item.key}: ${formatDurationSeconds(item.seconds)}, ${percentage}%`}
							sx={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								py: 1,
								px: 0.5,
								borderBottom: index < topItems.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
					cursor: onRowClick ? 'pointer' : 'default',
						transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
					'&:hover': {
						backgroundColor: theme.palette.action.hover,
						transform: onRowClick ? 'translateX(4px)' : 'none',
						boxShadow: onRowClick ? `0 2px 8px ${theme.palette.primary.main}20` : 'none',
						borderRadius: 1
					},
					'&:active': {
						transform: onRowClick ? 'translateX(2px) scale(0.98)' : 'none'
					}
							}}
							onClick={() => onRowClick?.(item.key)}
				onKeyDown={(e) => {
					if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
						e.preventDefault();
						onRowClick(item.key);
					}
				}}
						>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
								<Box
									sx={{
										width: 8,
										height: 8,
										borderRadius: '50%',
										backgroundColor: color,
										flexShrink: 0
									}}
								/>
								<FaviconAvatar
									name={item.key}
									isCategory={isCategory}
									size={20}
									showTooltip={false}
									animated={false}
									variant="rounded"
								/>
								<Typography 
									variant="body2" 
									sx={{ 
										fontSize: '0.85rem',
										fontWeight: 500,
										color: theme.palette.text.primary,
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap'
									}}
								>
									{displayName}
								</Typography>
							</Box>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
								<Typography 
									variant="caption" 
									sx={{ 
										fontWeight: 600,
										color: color,
										minWidth: '32px',
										textAlign: 'center'
									}}
								>
									{percentage}%
								</Typography>
								<Typography 
									variant="caption" 
									color="text.secondary"
									sx={{ 
										fontWeight: 500,
										minWidth: '45px',
										textAlign: 'right'
									}}
								>
									{formatDurationSeconds(item.seconds)}
								</Typography>
							</Box>
						</Box>
					);
				})}
			</Stack>
		</Box>
	);
}


