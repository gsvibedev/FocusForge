import { useEffect, useState } from 'react';
import { Box, Typography, keyframes, IconButton } from '@mui/material';
import { 
	Zap as ZapIcon, 
	TrendingUp as TrendingUpIcon,
	Star as StarIcon,
	X as CloseIcon,
	Award as AwardIcon,
	Target as TargetIcon
} from 'lucide-react';

const slideIn = keyframes`
	0% { 
		transform: translateX(400px) scale(0.8);
		opacity: 0;
	}
	100% { 
		transform: translateX(0) scale(1);
		opacity: 1;
	}
`;

const slideOut = keyframes`
	0% { 
		transform: translateX(0) scale(1);
		opacity: 1;
	}
	100% { 
		transform: translateX(400px) scale(0.8);
		opacity: 0;
	}
`;

const shimmer = keyframes`
	0% { transform: translateX(-100%); }
	100% { transform: translateX(100%); }
`;

const pulse = keyframes`
	0%, 100% { transform: scale(1); }
	50% { transform: scale(1.05); }
`;

interface ToastMessage {
	id: string;
	type: 'points' | 'achievement' | 'streak' | 'level' | 'milestone';
	title: string;
	subtitle?: string;
	value?: number;
	icon?: React.ElementType;
	color?: string;
}

interface GamificationToastProps {
	message: ToastMessage | null;
	onClose?: () => void;
	duration?: number;
}

export function GamificationToast({ message, onClose, duration = 3000 }: GamificationToastProps) {
	const [isVisible, setIsVisible] = useState(false);
	const [isExiting, setIsExiting] = useState(false);

	useEffect(() => {
		if (message) {
			setIsVisible(true);
			setIsExiting(false);

			const timer = setTimeout(() => {
				setIsExiting(true);
				setTimeout(() => {
					setIsVisible(false);
					onClose?.();
				}, 300);
			}, duration);

			return () => clearTimeout(timer);
		}
	}, [message, duration, onClose]);

	if (!message || !isVisible) return null;

	const getIcon = () => {
		if (message.icon) return message.icon;
		switch (message.type) {
			case 'points': return ZapIcon;
			case 'achievement': return AwardIcon;
			case 'streak': return TrendingUpIcon;
			case 'level': return StarIcon;
			case 'milestone': return TargetIcon;
			default: return ZapIcon;
		}
	};

	const getGradient = () => {
		switch (message.type) {
			case 'points': return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
			case 'achievement': return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
			case 'streak': return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
			case 'level': return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
			case 'milestone': return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
			default: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
		}
	};

	const Icon = getIcon();

	return (
		<Box
			sx={{
				position: 'fixed',
				top: 20,
				right: 20,
				zIndex: 9999,
				animation: isExiting 
					? `${slideOut} 0.3s ease-out forwards`
					: `${slideIn} 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)`,
			}}
		>
			<Box
				sx={{
					background: getGradient(),
					borderRadius: '16px',
					padding: '16px 20px',
					minWidth: 280,
					maxWidth: 360,
					boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
					position: 'relative',
					overflow: 'hidden',
					animation: `${pulse} 2s ease-in-out infinite`,
					'&::before': {
						content: '""',
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.2) 0%, transparent 50%)',
						pointerEvents: 'none'
					},
					'&::after': {
						content: '""',
						position: 'absolute',
						top: '-50%',
						left: '-50%',
						width: '200%',
						height: '200%',
						background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
						animation: `${shimmer} 3s infinite`,
						pointerEvents: 'none'
					}
				}}
			>
				<IconButton
					onClick={() => {
						setIsExiting(true);
						setTimeout(() => {
							setIsVisible(false);
							onClose?.();
						}, 300);
					}}
					sx={{
						position: 'absolute',
						top: 8,
						right: 8,
						color: 'rgba(255,255,255,0.8)',
						padding: '4px',
						'&:hover': {
							backgroundColor: 'rgba(255,255,255,0.2)'
						}
					}}
				>
					<CloseIcon size={16} />
				</IconButton>

				<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
					<Box
						sx={{
							width: 40,
							height: 40,
							borderRadius: '12px',
							background: 'rgba(255,255,255,0.2)',
							backdropFilter: 'blur(10px)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0
						}}
					>
						<Icon size={24} style={{ color: 'white' }} />
					</Box>

					<Box sx={{ flex: 1 }}>
						<Typography
							variant="subtitle1"
							sx={{
								color: 'white',
								fontWeight: 700,
								lineHeight: 1.2,
								textShadow: '0 2px 8px rgba(0,0,0,0.2)'
							}}
						>
							{message.title}
						</Typography>
						{message.subtitle && (
							<Typography
								variant="caption"
								sx={{
									color: 'rgba(255,255,255,0.9)',
									display: 'block',
									mt: 0.5
								}}
							>
								{message.subtitle}
							</Typography>
						)}
					</Box>

					{message.value !== undefined && (
						<Box
							sx={{
								background: 'rgba(255,255,255,0.25)',
								borderRadius: '8px',
								padding: '4px 12px',
								minWidth: 50,
								textAlign: 'center'
							}}
						>
							<Typography
								variant="h6"
								sx={{
									color: 'white',
									fontWeight: 800,
									fontSize: '1.1rem'
								}}
							>
								+{message.value}
							</Typography>
						</Box>
					)}
				</Box>
			</Box>
		</Box>
	);
}

export default GamificationToast;
