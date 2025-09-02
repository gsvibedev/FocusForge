import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import {
	Dialog,
	DialogContent,
	Box,
	Typography,
	IconButton,
	Avatar,
	keyframes,
	Checkbox,
	FormControlLabel,
	Fade,
	Zoom,
	Slide
} from '@mui/material';
import {
	Flame as FireIcon,
	Sparkles as SparkleIcon,
	Trophy as TrophyIcon,
	X as CloseIcon,
	Star as StarIcon,
	Rocket as RocketIcon,
	Heart as HeartIcon,
	Zap as ZapIcon,
	EyeOff as EyeOffIcon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

// Modern compact animations
const gentleFloat = keyframes`
	0%, 100% { transform: translateY(0px); }
	50% { transform: translateY(-4px); }
`;

const sparkleRotate = keyframes`
	0% { transform: rotate(0deg) scale(0.8); opacity: 0.6; }
	50% { transform: rotate(180deg) scale(1.2); opacity: 1; }
	100% { transform: rotate(360deg) scale(0.8); opacity: 0.6; }
`;

const pulseGlow = keyframes`
	0%, 100% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.1); }
	50% { box-shadow: 0 0 30px rgba(255, 255, 255, 0.3); }
`;

const slideInScale = keyframes`
	0% { 
		opacity: 0; 
		transform: scale(0.8) translateY(20px);
	}
	100% { 
		opacity: 1; 
		transform: scale(1) translateY(0);
	}
`;

// (reserved) shimmer keyframes available if needed for future accents

interface GamificationModalProps {
	open: boolean;
	onClose: () => void;
	points: number;
	streakDays: number;
	messages: string[];
	recommendedLimits: Array<{
		id?: string;
		displayName: string;
		currentMinutes: number;
		newMinutes: number;
	}>;
	onApplyRecommended: (limits: Array<{ id: string; newMinutes: number }>) => void;
	onManualSettings: () => void;
	modalType?: 'welcome' | 'daily' | 'levelup' | 'achievement';
	levelInfo?: {
		oldLevel: number;
		newLevel: number;
		experience: number;
		nextLevelExp: number;
		experienceGained?: number;
	};
	achievements?: Array<{
		id: string;
		title: string;
		description: string;
		icon?: string;
		reward?: number;
	}> | any[] | undefined;
	onDisablePopups?: () => void;
}

// Improved modal theme configurations with better contrast and visibility
const modalThemes = {
	welcome: {
		gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
		icon: HeartIcon,
		title: 'Welcome to FocusForge',
		subtitle: 'Ready to take control of your time?',
		accentColor: '#667eea',
		glowColor: 'rgba(102, 126, 234, 0.4)'
	},
	daily: {
		gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
		icon: SparkleIcon,
		title: 'Daily Check-in',
		subtitle: 'Keep up the momentum!',
		accentColor: '#4facfe',
		glowColor: 'rgba(79, 172, 254, 0.4)'
	},
	levelup: {
		gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
		icon: RocketIcon,
		title: 'Level Up!',
		subtitle: 'Focus mastery achieved',
		accentColor: '#fa709a',
		glowColor: 'rgba(250, 112, 154, 0.4)'
	},
	achievement: {
		gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
		icon: TrophyIcon,
		title: 'Achievement Unlocked!',
		subtitle: 'Excellence recognized',
		accentColor: '#a8edea',
		glowColor: 'rgba(168, 237, 234, 0.4)'
	},
	streak: {
		gradient: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
		icon: FireIcon,
		title: 'Streak Milestone!',
		subtitle: 'Consistency is power',
		accentColor: '#ff6b6b',
		glowColor: 'rgba(255, 107, 107, 0.4)'
	}
};

export function GamificationModalNew({
	open,
	onClose,
	points,
	streakDays,
	messages,
	modalType = 'daily',
	levelInfo,
	achievements = [],
	onDisablePopups
}: GamificationModalProps) {
	const [showContent, setShowContent] = useState(false);
	const [showConfetti, setShowConfetti] = useState(false);
	const [dontShowAgain, setDontShowAgain] = useState(false);
	const [currentModalType, setCurrentModalType] = useState(modalType);
	const { } = useTheme();
	
	// Lock the theme during modal lifetime to prevent color changes during animations
	const theme = modalThemes[currentModalType];

	useEffect(() => {
		if (open) {
			// Update the current modal type only when opening to lock the theme
			setCurrentModalType(modalType);
			setShowContent(true);
			if (modalType === 'levelup' || modalType === 'achievement') {
				setShowConfetti(true);
				setTimeout(() => setShowConfetti(false), 3000);
			}
		} else {
			setShowContent(false);
			setShowConfetti(false);
			setDontShowAgain(false);
			// Don't change currentModalType during close animation
		}
	}, [open, modalType]);

	// Reserved: no primary/apply buttons in compact design

	const handleClose = () => {
		if (dontShowAgain && onDisablePopups) {
			onDisablePopups();
		}
		onClose();
	};

	return (
		<>
			{showConfetti && (
				<Confetti
					width={window.innerWidth}
					height={window.innerHeight}
					numberOfPieces={100}
					recycle={false}
					gravity={0.2}
					colors={[theme.accentColor, '#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1']}
				/>
			)}

			<Dialog
				open={open}
				onClose={handleClose}
				maxWidth={false}
				TransitionComponent={Slide as any}
				TransitionProps={{ timeout: 300 }}
				disableScrollLock
				BackdropProps={{
					style: {
						backgroundColor: 'rgba(0, 0, 0, 0.8)',
						backdropFilter: 'blur(12px)'
					}
				}}
				PaperProps={{
					sx: {
						width: '320px',
						maxWidth: '90vw',
						borderRadius: '24px',
						background: theme.gradient,
						position: 'relative',
						overflow: 'hidden',
						boxShadow: `
							0 24px 48px rgba(0, 0, 0, 0.3),
							0 0 0 1px rgba(255, 255, 255, 0.1),
							inset 0 1px 0 rgba(255, 255, 255, 0.2)
						`,
						animation: `${slideInScale} 0.3s ease-out`,
						border: 'none',
						backdropFilter: 'blur(20px)',
						'&::before': {
							content: '""',
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							background: `
								radial-gradient(circle at 20% 80%, ${theme.glowColor} 0%, transparent 50%),
								radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)
							`,
							pointerEvents: 'none'
						},
						'&::after': {
							content: '""',
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							height: '1px',
							background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
							pointerEvents: 'none'
						}
					}
				}}
			>
				<DialogContent sx={{ p: 0, overflow: 'hidden', position: 'relative' }}>
					{/* Header with close and disable buttons */}
					<Box sx={{ 
							position: 'absolute',
							top: 12,
							right: 12,
							zIndex: 10,
						display: 'flex',
						gap: 1
					}}>
						{/* Disable popups button */}
						<IconButton
							onClick={() => {
								if (onDisablePopups) onDisablePopups();
								handleClose();
							}}
							size="small"
							sx={{
								color: 'rgba(255, 255, 255, 0.8)',
								backgroundColor: 'rgba(255, 255, 255, 0.1)',
							backdropFilter: 'blur(10px)',
								transition: 'all 0.2s ease',
							'&:hover': {
									backgroundColor: 'rgba(255, 255, 255, 0.2)',
									color: 'white'
							}
						}}
					>
							<EyeOffIcon size={16} />
					</IconButton>

						{/* Close button */}
						<IconButton
							onClick={handleClose}
							size="small"
							sx={{ 
								color: 'rgba(255, 255, 255, 0.8)',
								backgroundColor: 'rgba(255, 255, 255, 0.1)',
								backdropFilter: 'blur(10px)',
								transition: 'all 0.2s ease',
								'&:hover': {
									backgroundColor: 'rgba(255, 255, 255, 0.2)',
								color: 'white',
									transform: 'rotate(90deg)'
								}
							}}
						>
							<CloseIcon size={16} />
						</IconButton>
					</Box>

					{/* Compact main content */}
					<Box sx={{ p: 3, textAlign: 'center' }}>
						{/* Icon and title section */}
						<Fade in={showContent} timeout={300}>
							<Box sx={{ mb: 3 }}>
								{/* Animated icon */}
									<Box sx={{
									position: 'relative', 
									display: 'inline-block', 
									mb: 2,
									animation: `${gentleFloat} 3s ease-in-out infinite`
								}}>
									<Avatar sx={{
										width: 56,
										height: 56,
										background: `linear-gradient(135deg, ${theme.accentColor}, rgba(255,255,255,0.2))`,
										boxShadow: `0 8px 32px ${theme.glowColor}`,
										animation: `${pulseGlow} 2s ease-in-out infinite`,
										border: '2px solid rgba(255,255,255,0.3)'
									}}>
										<theme.icon size={28} style={{ color: 'white' }} />
									</Avatar>

									{/* Sparkle effects for special modals */}
									{(modalType === 'levelup' || modalType === 'achievement') && (
										<>
											<StarIcon 
												size={14} 
												style={{
													position: 'absolute',
													top: -4,
													right: -4,
													color: '#FFD700',
													animation: `${sparkleRotate} 2s ease-in-out infinite`
												}}
											/>
											<StarIcon 
												size={10} 
												style={{
													position: 'absolute',
													bottom: 2,
													left: -6,
													color: '#FFD700',
													animation: `${sparkleRotate} 2s ease-in-out infinite 0.7s`
												}}
											/>
										</>
									)}
								</Box>

								{/* Title */}
								<Typography 
									variant="h6" 
									sx={{ 
										fontWeight: 700,
										color: 'white',
										mb: 0.5,
										textShadow: '0 2px 8px rgba(0,0,0,0.4)',
										fontSize: '1.25rem'
									}}
								>
									{theme.title}
								</Typography>

								{/* Subtitle */}
								<Typography 
									variant="body2" 
									sx={{ 
										color: 'rgba(255,255,255,0.9)',
										fontWeight: 500,
										fontSize: '0.875rem'
									}}
								>
									{theme.subtitle}
								</Typography>
							</Box>
						</Fade>

						{/* Compact stats display */}
						<Zoom in={showContent} timeout={400}>
							<Box sx={{ 
								display: 'flex', 
								gap: 1.5, 
								mb: 3,
								justifyContent: 'center'
							}}>
								{/* Points */}
								<Box sx={{
									background: 'rgba(255,255,255,0.15)',
									backdropFilter: 'blur(10px)',
									borderRadius: '16px',
									p: 2,
									textAlign: 'center',
									border: '1px solid rgba(255,255,255,0.2)',
									minWidth: '80px',
									transition: 'all 0.2s ease',
									'&:hover': {
										transform: 'translateY(-2px)',
										background: 'rgba(255,255,255,0.2)'
									}
								}}>
									<ZapIcon size={16} style={{ 
										color: '#FFD700', 
										marginBottom: '4px',
										filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
									}} />
									<Typography variant="h6" sx={{ 
										color: 'white', 
										fontWeight: 800,
										fontSize: '1.5rem',
										lineHeight: 1,
										textShadow: '0 2px 8px rgba(0,0,0,0.4)'
									}}>
										{points}
									</Typography>
									<Typography variant="caption" sx={{ 
										color: 'rgba(255,255,255,0.8)',
										fontSize: '0.7rem',
										fontWeight: 600,
										letterSpacing: '0.5px'
									}}>
										POINTS
									</Typography>
								</Box>

								{/* Streak (always show on welcome; otherwise if available) */}
								{(streakDays > 0 || modalType === 'welcome') && (
									<Box sx={{
										background: 'rgba(255,255,255,0.15)',
										backdropFilter: 'blur(10px)',
										borderRadius: '16px',
										p: 2,
										textAlign: 'center',
										border: '1px solid rgba(255,255,255,0.2)',
										minWidth: '80px',
										transition: 'all 0.2s ease',
										'&:hover': {
											transform: 'translateY(-2px)',
											background: 'rgba(255,255,255,0.2)'
										}
									}}>
										<FireIcon size={16} style={{ 
											color: '#FF6B6B', 
											marginBottom: '4px',
											filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
										}} />
										<Typography variant="h6" sx={{ 
											color: 'white', 
											fontWeight: 800,
											fontSize: '1.5rem',
											lineHeight: 1,
											textShadow: '0 2px 8px rgba(0,0,0,0.4)'
										}}>
											{streakDays}
										</Typography>
										<Typography variant="caption" sx={{ 
											color: 'rgba(255,255,255,0.8)',
											fontSize: '0.7rem',
											fontWeight: 600,
											letterSpacing: '0.5px'
										}}>
											STREAK
										</Typography>
									</Box>
								)}

								{/* Level (if levelup modal) */}
						{modalType === 'levelup' && levelInfo && (
									<Box sx={{
												background: 'rgba(255,255,255,0.15)',
												backdropFilter: 'blur(10px)',
												borderRadius: '16px',
												p: 2,
										textAlign: 'center',
												border: '1px solid rgba(255,255,255,0.2)',
										minWidth: '80px',
										transition: 'all 0.2s ease',
										'&:hover': {
											transform: 'translateY(-2px)',
											background: 'rgba(255,255,255,0.2)'
										}
									}}>
										<RocketIcon size={16} style={{ 
											color: '#4ECDC4', 
											marginBottom: '4px',
											filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
										}} />
										<Typography variant="h6" sx={{ 
													color: 'white',
											fontWeight: 800,
											fontSize: '1.5rem',
											lineHeight: 1,
											textShadow: '0 2px 8px rgba(0,0,0,0.4)'
										}}>
											{levelInfo.newLevel}
										</Typography>
										<Typography variant="caption" sx={{ 
											color: 'rgba(255,255,255,0.8)',
											fontSize: '0.7rem',
											fontWeight: 600,
											letterSpacing: '0.5px'
										}}>
											LEVEL
												</Typography>
											</Box>
											)}
										</Box>
						</Zoom>

						{/* Congratulatory message */}
						<Fade in={showContent} timeout={500}>
							<Box sx={{ mb: 3 }}>
								{/* Single most relevant message */}
						{messages.length > 0 && modalType === 'daily' && (
								<Box sx={{ 
												background: 'rgba(255,255,255,0.1)',
												backdropFilter: 'blur(10px)',
												borderRadius: '12px',
										p: 2,
												border: '1px solid rgba(255,255,255,0.15)',
												display: 'flex',
												alignItems: 'center',
										gap: 1.5,
										mb: 2
									}}>
											<HeartIcon size={16} style={{ color: '#FF6B6B', flexShrink: 0 }} />
											<Typography variant="body2" sx={{ 
												color: 'rgba(255,255,255,0.95)',
												fontSize: '0.875rem',
											lineHeight: 1.4,
											textAlign: 'left'
											}}>
											{messages[0]}
											</Typography>
										</Box>
								)}

								{/* Level info for levelup */}
								{modalType === 'levelup' && levelInfo?.experienceGained && (
									<Typography 
										variant="body2" 
									sx={{
											color: '#FFD700',
											fontWeight: 600,
											textAlign: 'center',
											fontSize: '0.875rem',
											textShadow: '0 2px 4px rgba(0,0,0,0.3)'
										}}
									>
										+{levelInfo.experienceGained} XP Earned!
									</Typography>
								)}

								{/* Achievement info */}
								{modalType === 'achievement' && achievements.length > 0 && (
									<Box sx={{
										background: 'rgba(255,255,255,0.1)',
										backdropFilter: 'blur(10px)',
										borderRadius: '12px',
										p: 2,
										border: '1px solid rgba(255,255,255,0.15)',
										textAlign: 'center'
									}}>
										<Typography variant="subtitle2" sx={{ 
											color: 'white',
											fontWeight: 700,
											mb: 0.5
										}}>
											{achievements[0].title}
										</Typography>
										<Typography variant="caption" sx={{ 
											color: 'rgba(255,255,255,0.8)',
											fontSize: '0.75rem'
										}}>
											{achievements[0].description}
										</Typography>
									</Box>
								)}
							</Box>
						</Fade>

						{/* Don't show again option - compact */}
						<Fade in={showContent} timeout={600}>
								<FormControlLabel
									control={
										<Checkbox
											checked={dontShowAgain}
											onChange={(e) => setDontShowAgain(e.target.checked)}
											size="small"
											sx={{
											color: 'rgba(255,255,255,0.6)',
												'&.Mui-checked': {
												color: 'rgba(255,255,255,0.9)'
												}
											}}
										/>
									}
									label={
										<Typography variant="caption" sx={{ 
											color: 'rgba(255,255,255,0.8)',
											fontSize: '0.75rem'
										}}>
											Don't show this popup again
										</Typography>
									}
									sx={{ 
										margin: '0 auto',
									display: 'flex',
									justifyContent: 'center',
										'& .MuiFormControlLabel-label': {
											ml: 0.5
										}
									}}
								/>
						</Fade>
					</Box>
				</DialogContent>
			</Dialog>
		</>
	);
}

export default GamificationModalNew;
