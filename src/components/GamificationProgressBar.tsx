import { Box, Typography, LinearProgress, keyframes, Tooltip } from '@mui/material';
import { 
	TrendingUp as TrendingUpIcon,
	Zap as ZapIcon,
	Trophy as TrophyIcon,
	Star as StarIcon
} from 'lucide-react';

const shimmer = keyframes`
	0% { transform: translateX(-100%); }
	100% { transform: translateX(100%); }
`;

const pulse = keyframes`
	0%, 100% { opacity: 0.5; }
	50% { opacity: 1; }
`;

interface GamificationProgressBarProps {
	level: number;
	experience: number;
	nextLevelExp: number;
	points: number;
	compact?: boolean;
}

export function GamificationProgressBar({
	level,
	experience,
	nextLevelExp,
	points,
	compact = false
}: GamificationProgressBarProps) {
	const progress = (experience / nextLevelExp) * 100;
	const expToNext = nextLevelExp - experience;

	if (compact) {
		return (
			<Box sx={{ 
				background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
				borderRadius: '12px',
				p: 1.5,
				position: 'relative',
				overflow: 'hidden'
			}}>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
					{/* Level Badge */}
					<Tooltip title={`Level ${level}`}>
						<Box sx={{
							background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
							borderRadius: '8px',
							width: 32,
							height: 32,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0,
							boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
							cursor: 'pointer'
						}}>
							<Typography sx={{ 
								color: 'white', 
								fontWeight: 800,
								fontSize: '0.875rem'
							}}>
								{level}
							</Typography>
						</Box>
					</Tooltip>

					{/* Progress Bar */}
					<Box sx={{ flex: 1 }}>
						<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
							<Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
								{experience} / {nextLevelExp} XP
							</Typography>
							<Typography variant="caption" sx={{ fontWeight: 600, color: '#667eea' }}>
								{expToNext} to next
							</Typography>
						</Box>
						<LinearProgress 
							variant="determinate" 
							value={progress}
							sx={{
								height: 6,
								borderRadius: 3,
								backgroundColor: 'rgba(102, 126, 234, 0.1)',
								'& .MuiLinearProgress-bar': {
									borderRadius: 3,
									background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
									position: 'relative',
									overflow: 'hidden',
									'&::after': {
										content: '""',
										position: 'absolute',
										top: 0,
										left: 0,
										bottom: 0,
										right: 0,
										background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
										animation: `${shimmer} 2s infinite`
									}
								}
							}}
						/>
					</Box>

					{/* Points Display */}
					<Tooltip title="Total Points">
						<Box sx={{
							display: 'flex',
							alignItems: 'center',
							gap: 0.5,
							background: 'rgba(250, 112, 154, 0.1)',
							borderRadius: '8px',
							px: 1,
							py: 0.5
						}}>
							<ZapIcon size={14} style={{ color: '#fa709a' }} />
							<Typography variant="caption" sx={{ fontWeight: 700, color: '#fa709a' }}>
								{points.toLocaleString()}
							</Typography>
						</Box>
					</Tooltip>
				</Box>
			</Box>
		);
	}

	return (
		<Box sx={{
			background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
			borderRadius: '16px',
			p: 2.5,
			position: 'relative',
			overflow: 'hidden',
			border: '1px solid',
			borderColor: 'divider'
		}}>
			{/* Background decoration */}
			<Box sx={{
				position: 'absolute',
				top: -20,
				right: -20,
				width: 100,
				height: 100,
				background: 'radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%)',
				animation: `${pulse} 3s ease-in-out infinite`
			}} />

			{/* Header */}
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
					{/* Level Badge */}
					<Box sx={{
						background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
						borderRadius: '12px',
						width: 48,
						height: 48,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
						position: 'relative'
					}}>
						<StarIcon 
							size={16} 
							style={{ 
								position: 'absolute', 
								top: -4, 
								right: -4, 
								color: '#FFD700',
								filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
							}} 
						/>
						<Typography sx={{ 
							color: 'white', 
							fontWeight: 800,
							fontSize: '1.25rem'
						}}>
							{level}
						</Typography>
					</Box>

					<Box>
						<Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
							Level {level}
						</Typography>
						<Typography variant="caption" sx={{ color: 'text.secondary' }}>
							{expToNext} XP to Level {level + 1}
						</Typography>
					</Box>
				</Box>

				{/* Stats */}
				<Box sx={{ display: 'flex', gap: 2 }}>
					<Box sx={{ textAlign: 'center' }}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
							<ZapIcon size={16} style={{ color: '#fa709a' }} />
							<Typography variant="h6" sx={{ fontWeight: 800, color: '#fa709a' }}>
								{points.toLocaleString()}
							</Typography>
						</Box>
						<Typography variant="caption" sx={{ color: 'text.secondary' }}>
							Total Points
						</Typography>
					</Box>

					<Box sx={{ textAlign: 'center' }}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
							<TrophyIcon size={16} style={{ color: '#FFD700' }} />
							<Typography variant="h6" sx={{ fontWeight: 800, color: '#FFD700' }}>
								{Math.floor(progress)}%
							</Typography>
						</Box>
						<Typography variant="caption" sx={{ color: 'text.secondary' }}>
							Progress
						</Typography>
					</Box>
				</Box>
			</Box>

			{/* Progress Bar */}
			<Box>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
					<Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
						Experience Progress
					</Typography>
					<Typography variant="body2" sx={{ fontWeight: 600, color: '#667eea' }}>
						{experience} / {nextLevelExp} XP
					</Typography>
				</Box>
				<LinearProgress 
					variant="determinate" 
					value={progress}
					sx={{
						height: 10,
						borderRadius: 5,
						backgroundColor: 'rgba(102, 126, 234, 0.1)',
						'& .MuiLinearProgress-bar': {
							borderRadius: 5,
							background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
							position: 'relative',
							overflow: 'hidden',
							'&::after': {
								content: '""',
								position: 'absolute',
								top: 0,
								left: 0,
								bottom: 0,
								right: 0,
								background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
								animation: `${shimmer} 2s infinite`
							}
						}
					}}
				/>
			</Box>

			{/* Motivational Text */}
			<Typography 
				variant="caption" 
				sx={{ 
					display: 'block',
					textAlign: 'center',
					mt: 2,
					color: 'text.secondary',
					fontStyle: 'italic'
				}}
			>
				{progress < 25 && "Just getting started! Keep going! 🚀"}
				{progress >= 25 && progress < 50 && "Making great progress! 💪"}
				{progress >= 50 && progress < 75 && "Halfway there! You've got this! 🔥"}
				{progress >= 75 && "Almost at the next level! 🎯"}
			</Typography>
		</Box>
	);
}

export default GamificationProgressBar;
