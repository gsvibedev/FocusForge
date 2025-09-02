import { Box, Typography, Grid, Card, Chip, keyframes, Tooltip, LinearProgress } from '@mui/material';
import { 
	Trophy as TrophyIcon,
	Star as StarIcon,
	Target as TargetIcon,
	Zap as ZapIcon,
	Award as AwardIcon,
	Medal as MedalIcon,
	Crown as CrownIcon,
	Flame as FlameIcon,
	Shield as ShieldIcon,
	Heart as HeartIcon,
	Lock as LockIcon,
	CheckCircle as CheckCircleIcon
} from 'lucide-react';
import { useMemo } from 'react';

const float = keyframes`
	0%, 100% { transform: translateY(0px); }
	50% { transform: translateY(-5px); }
`;

const shimmer = keyframes`
	0% { background-position: -200% center; }
	100% { background-position: 200% center; }
`;

const unlock = keyframes`
	0% { transform: scale(0) rotate(0deg); opacity: 0; }
	50% { transform: scale(1.2) rotate(10deg); }
	100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

interface Achievement {
	id: string;
	title: string;
	description: string;
	icon?: string;
	unlocked: boolean;
	unlockedAt?: Date;
	progress?: number;
	maxProgress?: number;
	reward?: number;
	rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

interface GamificationAchievementShowcaseProps {
	achievements: Achievement[];
	compact?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
	trophy: TrophyIcon,
	star: StarIcon,
	target: TargetIcon,
	zap: ZapIcon,
	award: AwardIcon,
	medal: MedalIcon,
	crown: CrownIcon,
	flame: FlameIcon,
	shield: ShieldIcon,
	heart: HeartIcon
};

const rarityConfig = {
	common: {
		gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
		glow: 'rgba(102, 126, 234, 0.3)',
		label: 'Common'
	},
	rare: {
		gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
		glow: 'rgba(79, 172, 254, 0.3)',
		label: 'Rare'
	},
	epic: {
		gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
		glow: 'rgba(240, 147, 251, 0.3)',
		label: 'Epic'
	},
	legendary: {
		gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
		glow: 'rgba(255, 215, 0, 0.4)',
		label: 'Legendary'
	}
};

export function GamificationAchievementShowcase({ 
	achievements, 
	compact = false 
}: GamificationAchievementShowcaseProps) {
	const stats = useMemo(() => {
		const unlocked = achievements.filter(a => a.unlocked).length;
		const total = achievements.length;
		const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;
		const totalRewards = achievements
			.filter(a => a.unlocked && a.reward)
			.reduce((sum, a) => sum + (a.reward || 0), 0);

		return { unlocked, total, percentage, totalRewards };
	}, [achievements]);

	if (compact) {
		return (
			<Box sx={{
				background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
				borderRadius: '12px',
				p: 2,
				border: '1px solid',
				borderColor: 'divider'
			}}>
				{/* Compact Header */}
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
						<TrophyIcon size={20} style={{ color: '#FFD700' }} />
						<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
							Achievements
						</Typography>
					</Box>
					<Chip 
						label={`${stats.unlocked}/${stats.total}`}
						size="small"
						sx={{
							background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
							color: 'white',
							fontWeight: 700
						}}
					/>
				</Box>

				{/* Compact Grid */}
				<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
					{achievements.slice(0, 8).map((achievement) => {
						const Icon = iconMap[achievement.icon || 'trophy'] || TrophyIcon;
						const rarity = achievement.rarity || 'common';
						const config = rarityConfig[rarity];

						return (
							<Tooltip 
								key={achievement.id}
								title={
									<Box>
										<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
											{achievement.title}
										</Typography>
										<Typography variant="caption">
											{achievement.description}
										</Typography>
									</Box>
								}
							>
								<Box
									sx={{
										width: 40,
										height: 40,
										borderRadius: '10px',
										background: achievement.unlocked ? config.gradient : 'rgba(0,0,0,0.1)',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										position: 'relative',
										cursor: 'pointer',
										opacity: achievement.unlocked ? 1 : 0.3,
										transition: 'all 0.3s ease',
										'&:hover': {
											transform: 'scale(1.1)',
											boxShadow: achievement.unlocked 
												? `0 4px 12px ${config.glow}`
												: 'none'
										}
									}}
								>
									{achievement.unlocked ? (
										<Icon size={20} style={{ color: 'white' }} />
									) : (
										<LockIcon size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
									)}
								</Box>
							</Tooltip>
						);
					})}
				</Box>
			</Box>
		);
	}

	return (
		<Box sx={{
			background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(118, 75, 162, 0.02) 100%)',
			borderRadius: '16px',
			p: 3,
			position: 'relative',
			overflow: 'hidden'
		}}>
			{/* Header */}
			<Box sx={{ mb: 3 }}>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
					<Box>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
							<Box sx={{
								width: 48,
								height: 48,
								borderRadius: '12px',
								background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)'
							}}>
								<TrophyIcon size={24} style={{ color: 'white' }} />
							</Box>
							<Box>
								<Typography variant="h6" sx={{ fontWeight: 800 }}>
									Achievement Showcase
								</Typography>
								<Typography variant="caption" sx={{ color: 'text.secondary' }}>
									Your journey of accomplishments
								</Typography>
							</Box>
						</Box>
					</Box>

					{/* Stats */}
					<Box sx={{ display: 'flex', gap: 2 }}>
						<Box sx={{ textAlign: 'center' }}>
							<Typography variant="h5" sx={{ fontWeight: 800, color: '#667eea' }}>
								{stats.percentage}%
							</Typography>
							<Typography variant="caption" sx={{ color: 'text.secondary' }}>
								Completed
							</Typography>
						</Box>
						<Box sx={{ textAlign: 'center' }}>
							<Typography variant="h5" sx={{ fontWeight: 800, color: '#fa709a' }}>
								{stats.totalRewards}
							</Typography>
							<Typography variant="caption" sx={{ color: 'text.secondary' }}>
								Points Earned
							</Typography>
						</Box>
					</Box>
				</Box>

				{/* Progress Bar */}
				<LinearProgress 
					variant="determinate" 
					value={stats.percentage}
					sx={{
						height: 8,
						borderRadius: 4,
						backgroundColor: 'rgba(102, 126, 234, 0.1)',
						'& .MuiLinearProgress-bar': {
							borderRadius: 4,
							background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
						}
					}}
				/>
			</Box>

			{/* Achievement Grid */}
			<Grid container spacing={2}>
				{achievements.map((achievement) => {
					const Icon = iconMap[achievement.icon || 'trophy'] || TrophyIcon;
					const rarity = achievement.rarity || 'common';
					const config = rarityConfig[rarity];
					const progress = achievement.progress || 0;
					const maxProgress = achievement.maxProgress || 1;
					const progressPercentage = (progress / maxProgress) * 100;

					return (
						<Grid item xs={12} sm={6} md={4} key={achievement.id}>
							<Card
								sx={{
									background: achievement.unlocked 
										? `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(250,250,250,0.95) 100%)`
										: 'rgba(255,255,255,0.5)',
									borderRadius: '12px',
									p: 2,
									height: '100%',
									position: 'relative',
									overflow: 'hidden',
									opacity: achievement.unlocked ? 1 : 0.6,
									transition: 'all 0.3s ease',
									cursor: 'pointer',
									border: achievement.unlocked ? '2px solid' : '1px solid',
									borderColor: achievement.unlocked ? config.glow : 'divider',
									'&:hover': {
										transform: achievement.unlocked ? 'translateY(-4px)' : 'none',
										boxShadow: achievement.unlocked 
											? `0 8px 24px ${config.glow}`
											: 'none'
									},
									'&::before': achievement.unlocked ? {
										content: '""',
										position: 'absolute',
										top: 0,
										left: 0,
										right: 0,
										height: '4px',
										background: config.gradient
									} : {}
								}}
							>
								{/* Rarity Badge */}
								{achievement.unlocked && achievement.rarity && achievement.rarity !== 'common' && (
									<Chip
										label={config.label}
										size="small"
										sx={{
											position: 'absolute',
											top: 8,
											right: 8,
											background: config.gradient,
											color: 'white',
											fontWeight: 700,
											fontSize: '0.65rem',
											height: 20,
											animation: `${shimmer} 3s ease-in-out infinite`,
											backgroundSize: '200% 100%'
										}}
									/>
								)}

								{/* Icon */}
								<Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
									<Box
										sx={{
											width: 48,
											height: 48,
											borderRadius: '12px',
											background: achievement.unlocked 
												? config.gradient
												: 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.2) 100%)',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											flexShrink: 0,
											animation: achievement.unlocked ? `${float} 3s ease-in-out infinite` : 'none',
											position: 'relative'
										}}
									>
										{achievement.unlocked ? (
											<>
												<Icon size={24} style={{ color: 'white', zIndex: 1 }} />
												<CheckCircleIcon 
													size={16} 
													style={{ 
														position: 'absolute',
														bottom: -4,
														right: -4,
														color: '#4CAF50',
														backgroundColor: 'white',
														borderRadius: '50%'
													}}
												/>
											</>
										) : (
											<LockIcon size={20} style={{ color: 'rgba(0,0,0,0.3)' }} />
										)}
									</Box>

									<Box sx={{ flex: 1 }}>
										<Typography 
											variant="subtitle2" 
											sx={{ 
												fontWeight: 700,
												color: achievement.unlocked ? 'text.primary' : 'text.disabled',
												mb: 0.5
											}}
										>
											{achievement.title}
										</Typography>
										<Typography 
											variant="caption" 
											sx={{ 
												color: achievement.unlocked ? 'text.secondary' : 'text.disabled',
												display: 'block',
												lineHeight: 1.4
											}}
										>
											{achievement.description}
										</Typography>

										{/* Progress Bar for Locked Achievements */}
										{!achievement.unlocked && achievement.maxProgress && (
											<Box sx={{ mt: 1 }}>
												<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
													<Typography variant="caption" sx={{ fontWeight: 600 }}>
														Progress
													</Typography>
													<Typography variant="caption" sx={{ fontWeight: 600 }}>
														{progress}/{maxProgress}
													</Typography>
												</Box>
												<LinearProgress 
													variant="determinate" 
													value={progressPercentage}
													sx={{
														height: 4,
														borderRadius: 2,
														backgroundColor: 'rgba(0,0,0,0.1)',
														'& .MuiLinearProgress-bar': {
															borderRadius: 2,
															background: config.gradient
														}
													}}
												/>
											</Box>
										)}

										{/* Reward */}
										{achievement.unlocked && achievement.reward && (
											<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
												<ZapIcon size={14} style={{ color: '#fa709a' }} />
												<Typography 
													variant="caption" 
													sx={{ 
														fontWeight: 700,
														color: '#fa709a'
													}}
												>
													+{achievement.reward} points
												</Typography>
											</Box>
										)}

										{/* Unlock Date */}
										{achievement.unlocked && achievement.unlockedAt && (
											<Typography 
												variant="caption" 
												sx={{ 
													color: 'text.disabled',
													display: 'block',
													mt: 0.5,
													fontSize: '0.7rem'
												}}
											>
												Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
											</Typography>
										)}
									</Box>
								</Box>
							</Card>
						</Grid>
					);
				})}
			</Grid>
		</Box>
	);
}

export default GamificationAchievementShowcase;
