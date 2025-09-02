import React from 'react';
import { 
    Box, Card, Typography, Button, Chip, Fade, Slide, Zoom, useMediaQuery
} from '@mui/material';
import { keyframes } from '@mui/system';
import { useTheme } from '../contexts/ThemeContext';

// Keyframe animations
const float = keyframes`
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
`;

const shimmer = keyframes`
    0% { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
`;

const pulseAnimation = keyframes`
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
`;

const slideInUp = keyframes`
    from { 
        opacity: 0; 
        transform: translateY(30px); 
    }
    to { 
        opacity: 1; 
        transform: translateY(0); 
    }
`;

const gradientShift = keyframes`
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
`;

// Enhanced Card with hover effects and animations
interface EnhancedCardProps {
    children: React.ReactNode;
    elevation?: number;
    hover?: boolean;
    glow?: boolean;
    delay?: number;
    onClick?: () => void;
    sx?: any;
}

export function EnhancedCard({ children, elevation = 0, hover = true, glow = false, delay = 0, onClick, sx = {} }: EnhancedCardProps) {
    const { theme } = useTheme();
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    
    return (
        <Fade in timeout={prefersReducedMotion ? 0 : 600} style={{ transitionDelay: prefersReducedMotion ? '0ms' : `${delay}ms` }}>
            <Card
                elevation={elevation}
                onClick={onClick}
                sx={{
                    borderRadius: 4,
                    border: `1px solid ${theme.palette.divider}`,
                    background: theme.palette.background.paper,
                    transition: prefersReducedMotion ? 'none' : 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    ...(hover && {
                        '&:hover': {
                            transform: prefersReducedMotion ? 'none' : 'translateY(-4px)',
                            boxShadow: `0 12px 40px ${theme.palette.primary.main}20`,
                            borderColor: theme.palette.primary.main,
                            '&::before': {
                                opacity: glow ? 1 : 0,
                            }
                        }
                    }),
                    ...(glow && {
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`,
                            opacity: 0,
                            transition: 'opacity 0.4s ease',
                            zIndex: 0,
                        },
                        '& > *': {
                            position: 'relative',
                            zIndex: 1,
                        }
                    }),
                    ...sx
                }}
            >
                {children}
            </Card>
        </Fade>
    );
}

// Animated header with gradient background
interface AnimatedHeaderProps {
    icon: React.ReactElement;
    title: string;
    subtitle: string;
    delay?: number;
}

export function AnimatedHeader({ icon, title, subtitle, delay = 0 }: AnimatedHeaderProps) {
    const { theme } = useTheme();
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    
    return (
        <Slide direction="down" in timeout={prefersReducedMotion ? 0 : 800} style={{ transitionDelay: prefersReducedMotion ? '0ms' : `${delay}ms` }}>
            <Box sx={{ 
                textAlign: 'center', 
                mb: 4,
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.secondary.main} 100%)`,
                backgroundSize: '200% 200%',
                animation: prefersReducedMotion ? 'none' : `${gradientShift} 6s ease infinite`,
                color: 'white',
                py: 4,
                borderRadius: 4,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: `0 8px 32px ${theme.palette.primary.main}40`,
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
                    backgroundSize: '200% 200%',
                    animation: prefersReducedMotion ? 'none' : `${shimmer} 3s ease-in-out infinite`,
                },
                '& > *': {
                    position: 'relative',
                    zIndex: 1,
                }
            }}>
                <Box sx={{ 
                    animation: prefersReducedMotion ? 'none' : `${float} 3s ease-in-out infinite`,
                    mb: 1.5
                }}>
                    <Box sx={{ fontSize: 48, mb: 0.5, opacity: 0.95, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>
                        {icon}
                    </Box>
                </Box>
                <Typography variant="h4" component="h1" sx={{ 
                    fontWeight: 700, 
                    mb: 1,
                    fontSize: '2rem',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    background: 'linear-gradient(45deg, #fff 30%, rgba(255,255,255,0.8) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: prefersReducedMotion ? 'none' : `${slideInUp} 1s ease-out`
                }}>
                    {title}
                </Typography>
                <Typography variant="subtitle1" sx={{ 
                    opacity: 0.9,
                    maxWidth: 600,
                    mx: 'auto',
                    lineHeight: 1.5,
                    fontSize: '1.1rem',
                    textShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    animation: prefersReducedMotion ? 'none' : `${slideInUp} 1s ease-out 0.2s both`
                }}>
                    {subtitle}
                </Typography>
            </Box>
        </Slide>
    );
}

// Enhanced button with micro-interactions
interface EnhancedButtonProps {
    children: React.ReactNode;
    variant?: 'contained' | 'outlined' | 'text';
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    startIcon?: React.ReactElement;
    endIcon?: React.ReactElement;
    glow?: boolean;
    pulse?: boolean;
    size?: 'small' | 'medium' | 'large';
    onClick?: () => void;
    disabled?: boolean;
    sx?: any;
}

export function EnhancedButton({ 
    children, 
    variant = 'contained', 
    color = 'primary', 
    startIcon, 
    endIcon, 
    glow = false, 
    pulse = false,
    size = 'medium',
    onClick,
    disabled = false,
    sx = {}
}: EnhancedButtonProps) {
    const { theme } = useTheme();
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    
    return (
        <Button
            variant={variant}
            color={color}
            startIcon={startIcon}
            endIcon={endIcon}
            onClick={onClick}
            disabled={disabled}
            size={size}
            sx={{
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1.5,
                position: 'relative',
                overflow: 'hidden',
                transition: prefersReducedMotion ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                ...(variant === 'contained' && {
                    background: `linear-gradient(135deg, ${theme.palette[color].main} 0%, ${theme.palette[color].light} 100%)`,
                    boxShadow: `0 4px 16px ${theme.palette[color].main}40`,
                    '&:hover': {
                        background: `linear-gradient(135deg, ${theme.palette[color].dark} 0%, ${theme.palette[color].main} 100%)`,
                        boxShadow: `0 6px 24px ${theme.palette[color].main}50`,
                        transform: prefersReducedMotion ? 'none' : 'translateY(-2px)',
                    }
                }),
                ...(glow && {
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                        transition: 'left 0.5s',
                    },
                    '&:hover::before': {
                        left: '100%',
                    }
                }),
                ...(pulse && {
                    animation: prefersReducedMotion ? 'none' : `${pulseAnimation} 2s ease-in-out infinite`,
                }),
                '&:disabled': {
                    background: theme.palette.action.disabledBackground,
                    color: theme.palette.action.disabled,
                    boxShadow: 'none',
                    transform: 'none',
                },
                ...sx
            }}
        >
            {children}
        </Button>
    );
}

// Enhanced chip with animations
interface EnhancedChipProps {
    label: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
    variant?: 'filled' | 'outlined';
    size?: 'small' | 'medium';
    animated?: boolean;
    glow?: boolean;
    clickable?: boolean;
    onDelete?: (event: any) => void;
    onClick?: () => void;
    sx?: any;
}

export function EnhancedChip({ 
    label, 
    color = 'primary', 
    variant = 'outlined', 
    size = 'small',
    animated = false,
    glow = false,
    clickable = false,
    onDelete,
    onClick,
    sx = {}
}: EnhancedChipProps) {
    const { theme } = useTheme();
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    
    return (
        <Chip
            label={label}
            color={color}
            variant={variant}
            size={size}
            clickable={clickable}
            {...(onDelete && { onDelete })}
            onClick={onClick}
            sx={{
                borderRadius: 2.5,
                fontWeight: 600,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                ...(animated && {
                    animation: prefersReducedMotion ? 'none' : `${slideInUp} 0.6s ease-out`,
                }),
                ...(glow && {
                    boxShadow: `0 2px 8px ${theme.palette[color].main}30`,
                }),
                ...(clickable && {
                    '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: `0 4px 12px ${theme.palette[color].main}40`,
                    }
                }),
                ...sx
            }}
        />
    );
}

// Staggered animation container
interface StaggeredContainerProps {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
}

export function StaggeredContainer({ children, delay = 100, duration = 600 }: StaggeredContainerProps) {
    const childArray = React.Children.toArray(children);
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    
    return (
        <>
            {childArray.map((child, index) => (
                <Fade 
                    key={index} 
                    in 
                    timeout={prefersReducedMotion ? 0 : duration} 
                    style={{ transitionDelay: prefersReducedMotion ? '0ms' : `${index * delay}ms` }}
                >
                    <Box>{child}</Box>
                </Fade>
            ))}
        </>
    );
}

// Loading shimmer component
export function LoadingShimmer() {
    const { theme } = useTheme();
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    
    return (
        <Box
            sx={{
                height: 20,
                background: `linear-gradient(90deg, ${theme.palette.action.hover} 25%, ${theme.palette.action.selected} 50%, ${theme.palette.action.hover} 75%)`,
                backgroundSize: '200% 100%',
                animation: prefersReducedMotion ? 'none' : `${shimmer} 1.5s ease-in-out infinite`,
                borderRadius: 1,
            }}
        />
    );
}

// Floating action container
interface FloatingActionProps {
    children: React.ReactNode;
    delay?: number;
}

export function FloatingAction({ children, delay = 0 }: FloatingActionProps) {
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    
    return (
        <Zoom in timeout={prefersReducedMotion ? 0 : 800} style={{ transitionDelay: prefersReducedMotion ? '0ms' : `${delay}ms` }}>
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 1000,
                    animation: prefersReducedMotion ? 'none' : `${float} 4s ease-in-out infinite`,
                }}
            >
                {children}
            </Box>
        </Zoom>
    );
}