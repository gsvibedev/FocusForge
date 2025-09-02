import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import {
	Dialog,
	DialogContent,
	Box,
	Typography,
	Button,
	Stack,
	Chip,
	Slide,
	Grow,
	Fade,
	Zoom,
	Grid,
	Card,
	CardContent,
	Switch,
	FormControlLabel,
	IconButton,
	Divider,
	LinearProgress,
	Avatar,
	keyframes
} from '@mui/material';
import {
	TrendingUp as TrendingUpIcon,
	Flame as FireIcon,
	CheckCircle as CheckCircleIcon,
	Lightbulb as LightbulbIcon,
	Sparkles as SparkleIcon,
	Trophy as TrophyIcon,
	Settings as SettingsIcon,
	EyeOff as EyeOffIcon,
	X as CloseIcon,
	Star as StarIcon,
	Zap as ZapIcon,
	Target as TargetIcon,
	Award as AwardIcon,
	Rocket as RocketIcon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ParticleEffect } from './ParticleEffect';
import AchievementCard from './AchievementCard';
import OnboardingExperience from './OnboardingExperience';

// Premium animations
const pulseGlow = keyframes`
	0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
	50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
	100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
`;

const floatAnimation = keyframes`
	0%, 100% { transform: translateY(0px); }
	50% { transform: translateY(-8px); }
`;

const shimmer = keyframes`
	0% { background-position: -200% 0; }
	100% { background-position: 200% 0; }
`;

const sparkle = keyframes`
	0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
	50% { opacity: 1; transform: scale(1) rotate(180deg); }
`;

interface GamificationModalProps {
	open: boolean;
	onClose: () => void;
	points: number;
	streakDays: number;
	messages: string[];
	recommendedLimits: Array<{
		displayName: string;
		currentMinutes: number;
		newMinutes: number;
	}>;
	onApplyRecommended: () => void;
	onManualSettings: () => void;
	modalType?: 'welcome' | 'daily' | 'levelup' | 'achievement';
	levelInfo?: {
		oldLevel: number;
		newLevel: number;
		experience: number;
		nextLevelExp: number;
	};
	achievements?: Array<{
		id: string;
		title: string;
		description: string;
		icon: string;
		reward: number;
	}>;
	onDisablePopups?: () => void;
}

export function GamificationModal({
	open,
	onClose,
	points,
	streakDays,
	messages,
	recommendedLimits,
	onApplyRecommended,
	onManualSettings,
	modalType = 'daily',
	levelInfo,
	achievements = [],
	onDisablePopups
}: GamificationModalProps) {
	const [showContent, setShowContent] = useState(false);
	const [showConfetti, setShowConfetti] = useState(false);
	const [showDisableOption, setShowDisableOption] = useState(false);
	const { theme, isDarkMode } = useTheme();

	// Premium modal configurations with sophisticated color palettes
	const getModalConfig = () => {
		switch (modalType) {
			case 'welcome':
				return {
					title: 'Welcome to FocusForge',
					subtitle: 'Begin your digital wellness journey',
					icon: TargetIcon,
					gradient: isDarkMode
						? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
						: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #5a67d8 100%)',
					color: '#ffffff',
					accent: '#667eea',
					secondary: '#764ba2',
					glow: 'rgba(102, 126, 234, 0.4)'
				};
			case 'levelup':
				return {
					title: `Level ${levelInfo?.newLevel || 1} Unlocked`,
					subtitle: 'Your focus mastery grows stronger',
					icon: RocketIcon,
					gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 50%, #ff9ff3 100%)',
					color: '#ffffff',
					accent: '#ff6b6b',
					secondary: '#feca57',
					glow: 'rgba(255, 107, 107, 0.5)'
				};
			case 'achievement':
				return {
					title: 'Achievement Unlocked',
					subtitle: 'Excellence recognized',
					icon: AwardIcon,
					gradient: 'linear-gradient(135deg, #48cae4 0%, #023e8a 50%, #7209b7 100%)',
					color: '#ffffff',
					accent: '#48cae4',
					secondary: '#023e8a',
					glow: 'rgba(72, 202, 228, 0.5)'
				};
			default:
				return {
					title: 'Daily Check-in',
					subtitle: 'Great work today! Here\'s your progress',
					icon: SparkleIcon,
					gradient: isDarkMode 
						? 'linear-gradient(135deg, #2d3748 0%, #4a5568 50%, #2b6cb0 100%)'
						: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #5a67d8 100%)',
					color: '#ffffff',
					accent: isDarkMode ? '#4a5568' : '#667eea',
					secondary: isDarkMode ? '#2b6cb0' : '#764ba2',
					glow: isDarkMode ? 'rgba(74, 85, 104, 0.4)' : 'rgba(102, 126, 234, 0.4)'
				};
		}
	};

	const modalConfig = getModalConfig();

	useEffect(() => {
		if (open) {
			setShowContent(true);
			// Trigger confetti for special modals
			if (modalType === 'levelup' || modalType === 'achievement') {
				setShowConfetti(true);
				// Stop confetti after 3 seconds
				setTimeout(() => setShowConfetti(false), 3000);
			}
		} else {
			setShowContent(false);
			setShowConfetti(false);
		}
	}, [open, modalType]);

	return (
		<>
			{/* Confetti Effect */}
			{showConfetti && (
				<Confetti
					width={window.innerWidth}
					height={window.innerHeight}
					numberOfPieces={modalType === 'levelup' ? 200 : 100}
					recycle={false}
					gravity={0.3}
					colors={modalType === 'levelup' 
						? ['#FFD700', '#FFA500', '#FF6347', '#FF1493', '#9370DB']
						: ['#32CD32', '#00FF00', '#ADFF2F', '#7FFF00', '#98FB98']
					}
				/>
			)}
			
			<Dialog
				open={open}
				onClose={onClose}
				maxWidth={false}
				disableScrollLock
				disablePortal
				disableEnforceFocus
				disableAutoFocus
				disableRestoreFocus
				BackdropProps={{
					style: { 
						position: 'fixed',
						backgroundColor: 'rgba(0, 0, 0, 0.6)',
						backdropFilter: 'blur(16px) brightness(0.8)'
					}
				}}
				PaperProps={{
					style: {
						position: 'fixed',
						top: '50%',
						left: '50%',
						transform: 'translate(-50%, -50%)',
						margin: 0,
						width: '380px',
						height: '480px',
						maxHeight: '480px',
						overflow: 'hidden'
					},
					sx: {
						background: `${modalConfig.gradient}, radial-gradient(circle at 20% 80%, ${modalConfig.glow} 0%, transparent 50%)`,
						borderRadius: 6,
						boxShadow: `
							0 32px 64px rgba(0, 0, 0, 0.4),
							0 16px 32px rgba(0, 0, 0, 0.2),
							0 0 0 1px rgba(255, 255, 255, 0.15),
							inset 0 1px 0 rgba(255, 255, 255, 0.2)
						`,
						border: '1px solid rgba(255, 255, 255, 0.25)',
						backdropFilter: 'blur(20px) saturate(180%)',
						overflow: 'hidden',
						position: 'relative',
						transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
						'&::before': {
							content: '""',
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							height: '1px',
							background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
							pointerEvents: 'none'
						},
						'&::after': {
							content: '""',
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.05) 50%, transparent 70%)',
							animation: `${shimmer} 3s ease-in-out infinite`,
							pointerEvents: 'none'
						}
					}
				}}
			>
			<DialogContent sx={{ 
				p: 0, 
				position: 'relative', 
				overflow: 'hidden', 
				height: '100%',
				display: 'flex',
				flexDirection: 'column'
			}}>
				{/* Premium Close Button */}
				<Zoom in={showContent} timeout={600}>
					<IconButton
						onClick={onClose}
						size="small"
						sx={{
							position: 'absolute',
							top: 12,
							right: 12,
							zIndex: 1000,
							color: 'rgba(255, 255, 255, 0.9)',
							backgroundColor: 'rgba(255, 255, 255, 0.15)',
							backdropFilter: 'blur(10px)',
							border: '1px solid rgba(255, 255, 255, 0.2)',
							borderRadius: '50%',
							width: 36,
							height: 36,
							transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
							'&:hover': {
								backgroundColor: 'rgba(255, 255, 255, 0.25)',
								color: 'rgba(255, 255, 255, 1)',
								transform: 'scale(1.1) rotate(90deg)',
								boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
							}
						}}
					>
						<CloseIcon size={18} />
					</IconButton>
				</Zoom>

				{/* Premium Header */}
				<Box sx={{ 
					position: 'relative',
					padding: '24px 20px 16px',
					textAlign: 'center',
					color: 'white',
					minHeight: '140px',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					animation: 'fadeInDown 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0s both',
					'@keyframes fadeInDown': {
						'0%': {
							opacity: 0,
							transform: 'translateY(-20px) scale(0.9)'
						},
						'100%': {
							opacity: 1,
							transform: 'translateY(0) scale(1)'
						}
					}
				}}>
					{modalType === 'levelup' && (
						<Confetti
							active={showConfetti}
							config={{
								angle: 90,
								spread: 360,
								startVelocity: 45,
								elementCount: 80,
								dragFriction: 0.12,
								duration: 3500,
								stagger: 3,
								width: '12px',
								height: '12px',
								perspective: '500px',
								colors: ['#a864fd', '#29cdff', '#78ff44', '#ff718d', '#fdff6a', '#ff9500']
							}}
						/>
					)}
					
					{/* Animated Icon */}
					<Zoom in={showContent} timeout={800} style={{ transitionDelay: '200ms' }}>
						<Box sx={{ 
							mb: 1.5,
							display: 'flex',
							justifyContent: 'center',
							alignItems: 'center',
							position: 'relative'
						}}>
							{/* Glow Effect Background */}
							<Box sx={{
								position: 'absolute',
								width: 80,
								height: 80,
								borderRadius: '50%',
								background: `radial-gradient(circle, ${modalConfig.glow} 0%, transparent 70%)`,
								animation: `${pulseGlow} 3s ease-in-out infinite`,
								filter: 'blur(8px)',
								opacity: 0.8
							}} />
							<Avatar sx={{
								width: 64,
								height: 64,
								background: `linear-gradient(135deg, ${modalConfig.accent}40, ${modalConfig.secondary}60, ${modalConfig.accent}80)`,
								border: `2px solid rgba(255, 255, 255, 0.3)`,
								boxShadow: `
									0 16px 48px ${modalConfig.glow},
									0 8px 24px rgba(0, 0, 0, 0.3),
									inset 0 1px 0 rgba(255, 255, 255, 0.4)
								`,
								backdropFilter: 'blur(12px)',
								transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
								animation: modalType === 'levelup' 
									? `${floatAnimation} 3s ease-in-out infinite, ${sparkle} 2s ease-in-out infinite` 
									: `${floatAnimation} 4s ease-in-out infinite`,
								position: 'relative',
								zIndex: 1,
								'&:hover': {
									transform: 'scale(1.15) rotate(5deg)',
									boxShadow: `
										0 20px 60px ${modalConfig.glow},
										0 12px 32px rgba(0, 0, 0, 0.4)
									`
								}
							}}>
								<modalConfig.icon 
									size={28} 
									style={{ 
										color: 'rgba(255, 255, 255, 0.95)',
										filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))'
									}} 
								/>
							</Avatar>
						</Box>
					</Zoom>
					
					{/* Premium Title */}
					<Zoom in={showContent} timeout={800} style={{ transitionDelay: '400ms' }}>
						<Typography 
							variant="h5" 
							component="h2" 
							sx={{ 
								fontWeight: 800,
								mb: 1,
								color: 'rgba(255, 255, 255, 0.98)',
								textShadow: `
									0 2px 16px rgba(0, 0, 0, 0.4),
									0 0 24px ${modalConfig.glow}
								`,
								letterSpacing: '-0.03em',
								lineHeight: 1.1,
								fontSize: '1.5rem',
								background: `linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.85) 100%)`,
								backgroundClip: 'text',
								WebkitBackgroundClip: 'text',
								WebkitTextFillColor: 'transparent',
								position: 'relative',
								'&::after': {
									content: '""',
									position: 'absolute',
									bottom: -2,
									left: '50%',
									transform: 'translateX(-50%)',
									width: '60%',
									height: '2px',
									background: `linear-gradient(90deg, transparent, ${modalConfig.accent}80, transparent)`,
									borderRadius: '1px',
									boxShadow: `0 0 8px ${modalConfig.glow}`
								}
							}}
						>
							{modalConfig.title}
						</Typography>
					</Zoom>
					
					{/* Premium Subtitle */}
					<Zoom in={showContent} timeout={800} style={{ transitionDelay: '600ms' }}>
						<Typography 
							variant="body1" 
							sx={{ 
								color: 'rgba(255, 255, 255, 0.85)',
								fontWeight: 500,
								textShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
								letterSpacing: '0.02em',
								lineHeight: 1.3,
								fontSize: '0.95rem',
								maxWidth: '280px',
								margin: '0 auto',
								position: 'relative'
							}}
						>
							{modalConfig.subtitle}
						</Typography>
					</Zoom>
				</Box>

				{/* Premium Content Card */}
				<Zoom in={showContent} timeout={800} style={{ transitionDelay: '800ms' }}>
					<Box sx={{ 
						background: `
							linear-gradient(135deg, 
								rgba(255, 255, 255, 0.12) 0%, 
								rgba(255, 255, 255, 0.08) 50%, 
								rgba(255, 255, 255, 0.05) 100%
							),
							radial-gradient(circle at 80% 20%, ${modalConfig.glow} 0%, transparent 50%)
						`,
						backdropFilter: 'blur(20px)',
						mx: 1.5, 
						mb: 1.5, 
						borderRadius: 4,
						boxShadow: `
							0 16px 40px rgba(0, 0, 0, 0.3),
							0 8px 16px rgba(0, 0, 0, 0.2),
							inset 0 1px 0 rgba(255, 255, 255, 0.2),
							inset 0 -1px 0 rgba(0, 0, 0, 0.1)
						`,
						border: `1px solid rgba(255, 255, 255, 0.2)`,
						transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
						flex: 1,
						display: 'flex',
						flexDirection: 'column',
						position: 'relative',
						overflow: 'hidden',
						animation: 'slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both',
						'@keyframes slideInUp': {
							'0%': {
								opacity: 0,
								transform: 'translateY(30px) scale(0.95)'
							},
							'100%': {
								opacity: 1,
								transform: 'translateY(0) scale(1)'
							}
						},
						'&::before': {
							content: '""',
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							height: '1px',
							background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)'
						},
						'&:hover': {
							background: `
								linear-gradient(135deg, 
									rgba(255, 255, 255, 0.18) 0%, 
									rgba(255, 255, 255, 0.12) 50%, 
									rgba(255, 255, 255, 0.08) 100%
								),
								radial-gradient(circle at 80% 20%, ${modalConfig.glow} 0%, transparent 50%)
							`,
							transform: 'translateY(-3px) scale(1.02)',
							boxShadow: `
								0 20px 48px rgba(0, 0, 0, 0.35),
								0 12px 24px rgba(0, 0, 0, 0.25),
								0 0 0 1px rgba(255, 255, 255, 0.25)
							`
						}
					}}>
					{/* Level Progress Section for Level-Up Modal */}
					{modalType === 'levelup' && levelInfo && (
						<Box sx={{ p: 2.5, textAlign: 'center' }}>
							<Grow in={showContent} timeout={800} mountOnEnter unmountOnExit>
								<Box sx={{ mb: 2 }}>
									<Typography variant="h4" sx={{ 
										fontWeight: 'bold',
										color: 'rgba(255, 255, 255, 0.95)',
										mb: 1,
										textAlign: 'center',
										textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
									}}>
										Level {levelInfo.oldLevel} → {levelInfo.newLevel}
									</Typography>
									
									{/* Experience gained display */}
									{(levelInfo as any).experienceGained && (
										<Typography variant="h6" sx={{ 
											textAlign: 'center', 
											color: 'rgba(255, 255, 255, 0.9)', 
											fontWeight: 'bold',
											mb: 2,
											textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)'
										}}>
											+{(levelInfo as any).experienceGained} XP Earned!
										</Typography>
									)}
									
									{/* Premium Progress Bar */}
									<Box sx={{ position: 'relative', mb: 1 }}>
										{/* Progress Background Glow */}
										<Box sx={{
											position: 'absolute',
											top: -2,
											left: -2,
											right: -2,
											bottom: -2,
											background: `linear-gradient(90deg, ${modalConfig.glow} 0%, ${modalConfig.accent}40 50%, ${modalConfig.glow} 100%)`,
											borderRadius: 8,
											filter: 'blur(4px)',
											opacity: 0.6,
											animation: `${pulseGlow} 2s ease-in-out infinite`
										}} />
										<Box sx={{ 
											width: '100%', 
											height: 12, 
											background: 'rgba(255, 255, 255, 0.12)',
											borderRadius: 6,
											overflow: 'hidden',
											boxShadow: `
												inset 0 2px 6px rgba(0, 0, 0, 0.3),
												0 1px 0 rgba(255, 255, 255, 0.2)
											`,
											border: '1px solid rgba(255, 255, 255, 0.15)',
											position: 'relative'
										}}>
											<Box sx={{
												height: '100%',
												width: `${Math.min((levelInfo.experience / levelInfo.nextLevelExp) * 100, 100)}%`,
												background: `linear-gradient(90deg, ${modalConfig.accent} 0%, ${modalConfig.secondary} 50%, ${modalConfig.accent} 100%)`,
												transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
												borderRadius: 6,
												boxShadow: `
													0 0 12px ${modalConfig.glow},
													inset 0 1px 0 rgba(255, 255, 255, 0.3)
												`,
												position: 'relative',
												'&::after': {
													content: '""',
													position: 'absolute',
													top: 0,
													left: 0,
													right: 0,
													bottom: 0,
													background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.2) 50%, transparent 70%)',
													animation: `${shimmer} 2s ease-in-out infinite`
												}
											}} />
										</Box>
									</Box>
									<Typography variant="caption" sx={{ 
										color: 'rgba(255, 255, 255, 0.8)',
										fontWeight: 600,
										fontSize: '0.75rem'
									}}>
										{levelInfo.experience} / {levelInfo.nextLevelExp} XP
									</Typography>
								</Box>
							</Grow>
						</Box>
					)}

					{/* Achievement Section for Achievement Modal */}
					{modalType === 'achievement' && achievements.length > 0 && (
						<Box sx={{ p: 2.5, textAlign: 'center', position: 'relative' }}>
							{/* Premium Particle Effect */}
							<Box sx={{
								position: 'relative',
								mb: 2.5,
								display: 'flex',
								justifyContent: 'center',
								alignItems: 'center'
							}}>
								{/* Multiple Glow Layers */}
								<Box sx={{
									position: 'absolute',
									width: 100,
									height: 100,
									borderRadius: '50%',
									background: `radial-gradient(circle, ${modalConfig.glow} 0%, transparent 70%)`,
									animation: `${pulseGlow} 2s ease-in-out infinite`,
									filter: 'blur(12px)',
									opacity: 0.9
								}} />
								<Box sx={{
									position: 'absolute',
									width: 80,
									height: 80,
									borderRadius: '50%',
									background: `radial-gradient(circle, ${modalConfig.accent}60 0%, transparent 60%)`,
									animation: `${sparkle} 3s ease-in-out infinite`,
									filter: 'blur(8px)'
								}} />
								<Avatar sx={{
									width: 64,
									height: 64,
									background: `linear-gradient(135deg, ${modalConfig.accent} 0%, ${modalConfig.secondary} 50%, #FFD700 100%)`,
									border: '3px solid rgba(255, 215, 0, 0.8)',
									boxShadow: `
										0 20px 60px ${modalConfig.glow},
										0 8px 32px rgba(255, 215, 0, 0.5),
										inset 0 2px 0 rgba(255, 255, 255, 0.4)
									`,
									animation: `${floatAnimation} 3s ease-in-out infinite, ${sparkle} 2s ease-in-out infinite`,
									position: 'relative',
									zIndex: 1,
									transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
									'&:hover': {
										transform: 'scale(1.2) rotate(10deg)',
										boxShadow: `
											0 25px 80px ${modalConfig.glow},
											0 12px 40px rgba(255, 215, 0, 0.7)
										`
									}
								}}>
									<AwardIcon 
										size={32} 
										style={{ 
											color: 'rgba(255, 255, 255, 0.95)',
											filter: 'drop-shadow(0 3px 12px rgba(0, 0, 0, 0.4))'
										}} 
									/>
								</Avatar>
							</Box>
							
							{achievements.slice(0, 1).map((achievement, index) => (
								<Box key={achievement.id}>
									<Typography variant="h6" sx={{ 
										fontWeight: 800,
										color: 'rgba(255, 255, 255, 0.98)',
										mb: 1.5,
										fontSize: '1.3rem',
										textShadow: `0 3px 16px rgba(0, 0, 0, 0.4), 0 0 20px ${modalConfig.glow}`,
										letterSpacing: '-0.02em',
										lineHeight: 1.2
									}}>
										{achievement.title}
									</Typography>
									
									<Typography variant="body2" sx={{ 
										color: 'rgba(255, 255, 255, 0.85)',
										mb: 2.5,
										lineHeight: 1.4,
										fontWeight: 500,
										textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
										maxWidth: '260px',
										margin: '0 auto 20px'
									}}>
										{achievement.description}
									</Typography>
									
									<Chip 
										label={`+${achievement.reward} points`}
										icon={<StarIcon size={16} style={{ color: '#FFD700' }} />}
										sx={{
											background: `linear-gradient(135deg, ${modalConfig.accent} 0%, ${modalConfig.secondary} 100%)`,
											color: 'rgba(255, 255, 255, 0.95)',
											fontWeight: 700,
											fontSize: '0.9rem',
											border: '2px solid rgba(255, 255, 255, 0.3)',
											boxShadow: `
												0 8px 24px ${modalConfig.glow},
												0 4px 12px rgba(0, 0, 0, 0.3),
												inset 0 1px 0 rgba(255, 255, 255, 0.2)
											`,
											padding: '8px 16px',
											height: 'auto',
											transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
											'&:hover': {
												transform: 'scale(1.05)',
												boxShadow: `
													0 12px 32px ${modalConfig.glow},
													0 6px 16px rgba(0, 0, 0, 0.4)
												`
											}
										}}
									/>
								</Box>
							))}
						</Box>
					)}

					{/* Welcome Section for Welcome Modal */}
					{modalType === 'welcome' && (
						<Box sx={{ p: 1.5, position: 'relative' }}>
							<OnboardingExperience 
								onComplete={onManualSettings}
								onSkip={onClose}
							/>
						</Box>
					)}

					{/* Stats Section for Daily Modal */}
					{modalType === 'daily' && (
						<Box sx={{ p: 2, textAlign: 'center' }}>
							{/* Stats Cards */}
							<Grid container spacing={2.5} justifyContent="center" sx={{ mb: 2 }}>
								<Grid item xs={6}>
									<Box sx={{
										background: `linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)`,
										borderRadius: 3,
										p: 2.5,
										color: 'white',
										textAlign: 'center',
										boxShadow: `
											0 8px 32px rgba(0, 0, 0, 0.2),
											0 4px 16px ${modalConfig.glow}30,
											inset 0 1px 0 rgba(255, 255, 255, 0.1)
										`,
										backdropFilter: 'blur(12px) saturate(120%)',
										border: '1px solid rgba(255, 255, 255, 0.15)',
										position: 'relative',
										transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
										animation: 'slideInLeft 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both',
										'@keyframes slideInLeft': {
											'0%': {
												opacity: 0,
												transform: 'translateX(-30px) scale(0.9)'
											},
											'100%': {
												opacity: 1,
												transform: 'translateX(0) scale(1)'
											}
										},
										'&:hover': {
											transform: 'translateY(-4px) scale(1.02)',
											boxShadow: `
												0 12px 40px rgba(0, 0, 0, 0.3),
												0 6px 20px ${modalConfig.glow}50
											`
										},
										'&::before': {
											content: '""',
											position: 'absolute',
											top: 0,
											left: 0,
											right: 0,
											height: '1px',
											background: `linear-gradient(90deg, transparent, ${modalConfig.accent}60, transparent)`,
											borderRadius: '12px 12px 0 0'
										}
									}}>
										{/* Points Icon */}
										<Box sx={{ 
											display: 'flex', 
											justifyContent: 'center', 
											mb: 1.5,
											position: 'relative'
										}}>
											<Box sx={{
												position: 'absolute',
												width: 40,
												height: 40,
												borderRadius: '50%',
												background: `radial-gradient(circle, ${modalConfig.accent}40 0%, transparent 70%)`,
												animation: `${pulseGlow} 2s ease-in-out infinite`,
												filter: 'blur(8px)'
											}} />
											<StarIcon 
												size={24} 
												style={{ 
													color: modalConfig.accent,
													filter: `drop-shadow(0 3px 12px ${modalConfig.glow})`,
													zIndex: 1,
													position: 'relative'
												}} 
											/>
										</Box>
										<Typography variant="h4" sx={{ 
											color: modalConfig.accent, 
											fontWeight: 800,
											mb: 0.5,
											textShadow: `0 3px 16px ${modalConfig.glow}, 0 0 20px ${modalConfig.glow}`,
											fontSize: '2rem',
											letterSpacing: '-0.02em',
											lineHeight: 1
										}}>
											{points}
										</Typography>
										<Typography variant="body2" sx={{ 
											color: 'rgba(255, 255, 255, 0.8)',
											fontWeight: 600,
											fontSize: '0.8rem',
											textTransform: 'uppercase',
											letterSpacing: '0.5px',
											textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
										}}>
											Points
										</Typography>
									</Box>
								</Grid>
								{streakDays > 0 && (
									<Grid item xs={6}>
										<Box sx={{
											background: `linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)`,
											borderRadius: 3,
											p: 2.5,
											color: 'white',
											textAlign: 'center',
											boxShadow: `
												0 8px 32px rgba(0, 0, 0, 0.2),
												0 4px 16px rgba(255, 107, 53, 0.3),
												inset 0 1px 0 rgba(255, 255, 255, 0.1)
											`,
											backdropFilter: 'blur(12px) saturate(120%)',
											border: '1px solid rgba(255, 255, 255, 0.15)',
											position: 'relative',
											transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
											animation: 'slideInRight 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.4s both',
											'@keyframes slideInRight': {
												'0%': {
													opacity: 0,
													transform: 'translateX(30px) scale(0.9)'
												},
												'100%': {
													opacity: 1,
													transform: 'translateX(0) scale(1)'
												}
											},
											'&:hover': {
												transform: 'translateY(-4px) scale(1.02)',
												boxShadow: `
													0 12px 40px rgba(0, 0, 0, 0.3),
													0 6px 20px rgba(255, 107, 53, 0.5)
												`
											},
											'&::before': {
												content: '""',
												position: 'absolute',
												top: 0,
												left: 0,
												right: 0,
												height: '1px',
												background: `linear-gradient(90deg, transparent, #ff6b3560, transparent)`,
												borderRadius: '12px 12px 0 0'
											}
										}}>
											{/* Streak Icon with Animation */}
											<Box sx={{ 
												display: 'flex', 
												justifyContent: 'center', 
												mb: 1.5,
												position: 'relative'
											}}>
												<Box sx={{
													position: 'absolute',
													width: 40,
													height: 40,
													borderRadius: '50%',
													background: `radial-gradient(circle, #ff6b3540 0%, transparent 70%)`,
													animation: `${pulseGlow} 1.5s ease-in-out infinite`,
													filter: 'blur(8px)'
												}} />
												<FireIcon 
													size={24} 
													style={{ 
														color: '#ff6b35',
														filter: 'drop-shadow(0 3px 12px rgba(255, 107, 53, 0.6))',
														zIndex: 1,
														position: 'relative'
													}} 
												/>
											</Box>
											<Typography variant="h4" sx={{ 
												color: '#ff6b35', 
												fontWeight: 800,
												mb: 0.5,
												textShadow: '0 3px 16px rgba(255, 107, 53, 0.6), 0 0 20px rgba(255, 107, 53, 0.4)',
												fontSize: '2rem',
												letterSpacing: '-0.02em',
												lineHeight: 1
											}}>
												{streakDays}
											</Typography>
											<Typography variant="body2" sx={{ 
												color: 'rgba(255, 255, 255, 0.8)',
												fontWeight: 600,
												fontSize: '0.8rem',
												textTransform: 'uppercase',
												letterSpacing: '0.5px',
												textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
											}}>
												Day Streak
											</Typography>
										</Box>
									</Grid>
								)}
							</Grid>

							{/* Messages */}
							{messages.length > 0 && (
								<Box sx={{ mb: 2 }}>
									{messages.slice(0, 2).map((message, index) => (
										<Box key={index} sx={{
											background: 'rgba(76, 175, 80, 0.1)',
											border: '1px solid rgba(76, 175, 80, 0.3)',
											borderRadius: 2,
											p: 1.5,
											display: 'flex',
											alignItems: 'center',
											gap: 1,
											mb: index < messages.length - 1 ? 1 : 0
										}}>
											<CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
											<Typography variant="body2" sx={{ 
												fontWeight: 500,
												color: 'text.primary',
												fontSize: '0.9rem'
											}}>
												{message}
											</Typography>
										</Box>
									))}
								</Box>
							)}
						</Box>
					)}

				{/* Smart Recommendations temporarily hidden - implementation preserved */}
					{false && modalType === 'daily' && recommendedLimits.length > 0 && (
						<Box sx={{ 
							px: 1.5, 
							pb: 1.2,
							animation: 'fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.5s both',
							'@keyframes fadeInUp': {
								'0%': {
									opacity: 0,
									transform: 'translateY(20px) scale(0.95)'
								},
								'100%': {
									opacity: 1,
									transform: 'translateY(0) scale(1)'
								}
							}
						}}>
							<Divider sx={{ 
								mb: 1.5, 
								background: isDarkMode
								? `linear-gradient(90deg, transparent 0%, ${theme.palette.divider} 50%, transparent 100%)`
								: `linear-gradient(90deg, transparent, ${theme.palette.divider}, transparent)`,
								height: 1,
								border: 'none'
							}} />
							
							<Fade in={showContent} timeout={1400} mountOnEnter unmountOnExit>
								<Box sx={{ 
									display: 'flex', 
									alignItems: 'center', 
									mb: 1.5,
									position: 'relative'
								}}>
									{/* Lightbulb Icon with Glow */}
									<Box sx={{ 
										position: 'relative',
										mr: 1.5
									}}>
										<Box sx={{
											position: 'absolute',
											width: 32,
											height: 32,
											borderRadius: '50%',
											background: 'radial-gradient(circle, #ffd60a40 0%, transparent 70%)',
											animation: `${pulseGlow} 2s ease-in-out infinite`,
											filter: 'blur(6px)',
											top: '50%',
											left: '50%',
											transform: 'translate(-50%, -50%)'
										}} />
										<LightbulbIcon 
											size={20} 
											style={{ 
												color: '#ffd60a',
												filter: 'drop-shadow(0 2px 8px rgba(255, 214, 10, 0.5))',
												position: 'relative',
												zIndex: 1
											}} 
										/>
									</Box>
									<Typography variant="subtitle2" fontWeight={700} sx={{ 
										color: 'rgba(255, 255, 255, 0.95)',
										fontSize: '1rem',
										textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
										letterSpacing: '-0.01em'
									}}>
										Smart Recommendations
									</Typography>
								</Box>
							</Fade>
							
							<Stack spacing={1.5}>
								{recommendedLimits.slice(0, 2).map((limit, index) => (
								<Slide key={index} direction="left" in={showContent} timeout={1600 + index * 200} mountOnEnter unmountOnExit>
										<Card sx={{
										background: `linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)`,
										color: 'rgba(255, 255, 255, 0.95)',
										borderRadius: 3,
										boxShadow: `
											0 6px 24px rgba(0, 0, 0, 0.15),
											0 2px 8px rgba(255, 214, 10, 0.1),
											inset 0 1px 0 rgba(255, 255, 255, 0.08)
										`,
										border: '1px solid rgba(255, 255, 255, 0.12)',
										backdropFilter: 'blur(10px) saturate(110%)',
										position: 'relative',
										overflow: 'hidden',
										transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
										'&:hover': {
											background: `linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)`,
											transform: 'translateY(-3px) scale(1.02)',
											boxShadow: `
												0 8px 32px rgba(0, 0, 0, 0.2),
												0 4px 12px rgba(255, 214, 10, 0.2)
											`
										},
										'&::before': {
											content: '""',
											position: 'absolute',
											top: 0,
											left: 0,
											right: 0,
											height: '1px',
											background: `linear-gradient(90deg, transparent, #ffd60a60, transparent)`,
											borderRadius: '12px 12px 0 0'
										}
									}}>
											<CardContent sx={{ p: 1.5 }}>
												<Typography variant="body2" sx={{ 
											color: theme.palette.common.white,
											mb: 0.75,
											fontWeight: 500,
											fontSize: '0.85rem',
											lineHeight: 1.3
										}}>
													📈 {limit.displayName}: {limit.currentMinutes}min → {limit.newMinutes}min
												</Typography>
												<Chip
													label="Recommended"
													size="small"
													sx={{
														background: `${theme.palette.warning.main}20`,
													color: theme.palette.warning.main,
													border: `1px solid ${theme.palette.warning.main}30`,
														fontSize: '0.7rem',
														height: 24
													}}
												/>
											</CardContent>
										</Card>
									</Slide>
								))}
							</Stack>

							{/* Action buttons */}
							<Slide direction="up" in={showContent} timeout={1600}>
								<Stack direction="row" spacing={1.2} sx={{ mt: 1.5 }}>
									<Button
										variant="contained"
										fullWidth
										onClick={onApplyRecommended}
										startIcon={<TrendingUpIcon />}
										sx={{
											background: `linear-gradient(135deg, ${modalConfig.accent} 0%, ${modalConfig.secondary} 100%)`,
											color: 'rgba(255, 255, 255, 0.95)',
											fontWeight: 700,
											fontSize: '0.8rem',
											borderRadius: 3,
											py: 1,
											border: '1px solid rgba(255, 255, 255, 0.2)',
											boxShadow: `
												0 8px 24px ${modalConfig.glow},
												0 4px 12px rgba(0, 0, 0, 0.3),
												inset 0 1px 0 rgba(255, 255, 255, 0.2)
											`,
											textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
											transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
											position: 'relative',
											overflow: 'hidden',
											textTransform: 'none',
											'&:hover': {
												background: `linear-gradient(135deg, ${modalConfig.secondary} 0%, ${modalConfig.accent} 100%)`,
												transform: 'translateY(-2px) scale(1.02)',
												boxShadow: `
													0 12px 32px ${modalConfig.glow},
													0 6px 16px rgba(0, 0, 0, 0.4)
												`
											},
											'&::before': {
												content: '""',
												position: 'absolute',
												top: 0,
												left: '-100%',
												width: '100%',
												height: '100%',
												background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
												transition: 'left 0.6s ease'
											},
											'&:hover::before': {
												left: '100%'
											}
										}}
									>
										🚀 Accept Challenge
									</Button>
									<Button
										variant="outlined"
										fullWidth
										onClick={onManualSettings}
										startIcon={<SettingsIcon />}
										sx={{
											border: '2px solid rgba(255, 255, 255, 0.25)',
											color: 'rgba(255, 255, 255, 0.9)',
											fontWeight: 600,
											fontSize: '0.8rem',
											borderRadius: 3,
											py: 1,
											background: 'rgba(255, 255, 255, 0.05)',
											backdropFilter: 'blur(8px)',
											boxShadow: `
												0 4px 16px rgba(0, 0, 0, 0.2),
												inset 0 1px 0 rgba(255, 255, 255, 0.1)
											`,
											textShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
											transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
											textTransform: 'none',
											'&:hover': {
												background: 'rgba(255, 255, 255, 0.12)',
												border: '2px solid rgba(255, 255, 255, 0.4)',
												transform: 'translateY(-2px) scale(1.02)',
												boxShadow: `
													0 6px 20px rgba(0, 0, 0, 0.3),
													0 2px 8px rgba(255, 255, 255, 0.1)
												`
											}
										}}
									>
										⚙️ Manual Settings
									</Button>
								</Stack>
							</Slide>
						</Box>
					)}
				</Box>
			</Zoom>

			{/* Don't Show Again Option */}
					<Divider sx={{ my: 2 }} />
					<Box sx={{ 
						display: 'flex', 
						alignItems: 'center',
						justifyContent: 'space-between',
						mb: 2,
						px: 1.5,
						animation: 'slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.4s both',
						'@keyframes slideInUp': {
							'0%': {
								opacity: 0,
								transform: 'translateY(20px) scale(0.95)'
							},
							'100%': {
								opacity: 1,
								transform: 'translateY(0) scale(1)'
							}
						}
					}}>
						<FormControlLabel
							control={
								<Switch
									checked={showDisableOption}
									onChange={(e) => setShowDisableOption(e.target.checked)}
									size="small"
									sx={{
										'& .MuiSwitch-switchBase.Mui-checked': {
											color: '#f44336'
										},
										'& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
											backgroundColor: '#f44336'
										}
									}}
								/>
							}
							label={
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
									<EyeOffIcon size={16} />
									<Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
										Don't show popups again
									</Typography>
								</Box>
							}
							sx={{ m: 0 }}
						/>
					</Box>

					{/* Action Buttons for Different Modal Types */}
					<Box sx={{ px: 1.5, pb: 1.5, textAlign: 'center' }}>
						<Slide direction="up" in={showContent} timeout={1600}>
							<Box sx={{ 
								display: 'flex', 
								gap: 1.5
							}}>
								{showDisableOption && (
									<Button
									variant="outlined"
									fullWidth
									size="medium"
									startIcon={<EyeOffIcon size={16} />}
									onClick={() => {
										onDisablePopups?.();
										onClose();
									}}
									sx={{
										borderColor: '#f44336',
										color: '#f44336',
										borderRadius: 2,
										py: 1.2,
										fontWeight: 500,
										textTransform: 'none',
										textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
										transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
										position: 'relative',
										overflow: 'hidden',
										'&:hover': {
											borderColor: '#f44336',
											background: 'rgba(244, 67, 54, 0.1)',
											backdropFilter: 'blur(8px)',
											boxShadow: `
												0 4px 16px rgba(0, 0, 0, 0.2),
												inset 0 1px 0 rgba(255, 255, 255, 0.1)
											`,
											transform: 'translateY(-1px) scale(1.05)'
										},
										'&::before': {
											content: '""',
											position: 'absolute',
											top: 0,
											left: '-100%',
											width: '100%',
											height: '100%',
											background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
											transition: 'left 0.5s ease'
										},
										'&:hover::before': {
											left: '100%'
										}
									}}
								>
									Disable
								</Button>
								)}
								<Box sx={{
										animation: 'slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.6s both',
										'@keyframes slideInUp': {
											'0%': {
												opacity: 0,
												transform: 'translateY(20px) scale(0.95)'
											},
											'100%': {
												opacity: 1,
												transform: 'translateY(0) scale(1)'
											}
										}
									}}>
									<Button
										variant="contained"
										fullWidth
										size="large"
										startIcon={
											modalType === 'levelup' ? <TrophyIcon size={18} /> :
											modalType === 'achievement' ? <TrophyIcon size={18} /> :
											<CheckCircleIcon sx={{ fontSize: 18 }} />
										}
										onClick={onClose}
										sx={{
										background: `linear-gradient(135deg, ${modalConfig.accent} 0%, ${modalConfig.secondary} 50%, ${modalConfig.accent} 100%)`,
										color: 'rgba(255, 255, 255, 0.95)',
										fontWeight: 800,
										fontSize: '1.1rem',
										borderRadius: 4,
										py: 2,
										border: '2px solid rgba(255, 255, 255, 0.3)',
										boxShadow: `
											0 12px 40px ${modalConfig.glow},
											0 8px 24px rgba(0, 0, 0, 0.4),
											inset 0 2px 0 rgba(255, 255, 255, 0.3),
											inset 0 -2px 0 rgba(0, 0, 0, 0.2)
										`,
										textShadow: '0 3px 12px rgba(0, 0, 0, 0.4)',
										letterSpacing: '0.5px',
										textTransform: 'none',
										transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
										position: 'relative',
										overflow: 'hidden',
										'&:hover': {
											background: `linear-gradient(135deg, ${modalConfig.secondary} 0%, ${modalConfig.accent} 50%, ${modalConfig.secondary} 100%)`,
											transform: 'translateY(-3px) scale(1.02)',
											boxShadow: `
												0 16px 48px ${modalConfig.glow},
												0 12px 32px rgba(0, 0, 0, 0.5),
												0 0 0 1px rgba(255, 255, 255, 0.4)
											`
										},
										'&:active': {
											transform: 'translateY(-1px) scale(0.98)'
										},
										'&::before': {
											content: '""',
											position: 'absolute',
											top: 0,
											left: '-100%',
											width: '100%',
											height: '100%',
											background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
											transition: 'left 0.8s ease'
										},
										'&:hover::before': {
											left: '100%'
										},
										'&::after': {
											content: '""',
											position: 'absolute',
											top: '50%',
											left: '50%',
											width: '0',
											height: '0',
											borderRadius: '50%',
											background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%)',
											transform: 'translate(-50%, -50%)',
											transition: 'all 0.6s ease',
											opacity: 0
										},
										'&:active::after': {
											width: '300px',
											height: '300px',
											opacity: 1,
											transition: 'all 0.1s ease'
										}
									}}
								>
									{modalType === 'levelup' ? 'Awesome! Continue' :
									 modalType === 'achievement' ? 'Claim Rewards!' :
									 'Keep Going!'}
								</Button>
							</Box>
						</Box>
					</Slide>
				</Box>
			</DialogContent>
		</Dialog>
	</>
);
}

export default GamificationModal;




