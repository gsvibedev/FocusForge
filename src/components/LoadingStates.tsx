import React from 'react';
import { 
    Box, 
    Skeleton, 
    Card, 
    CardContent, 
    Typography,
    CircularProgress,
    LinearProgress,
    Fade,
    Zoom,
    useMediaQuery
} from '@mui/material';
import { keyframes } from '@mui/system';
import { useTheme } from '../contexts/ThemeContext';

// Beautiful pulse animation for loading states
const pulseGlow = keyframes`
    0% {
        box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.4);
        transform: scale(1);
    }
    50% {
        box-shadow: 0 0 0 10px rgba(25, 118, 210, 0);
        transform: scale(1.02);
    }
    100% {
        box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
        transform: scale(1);
    }
`;

const shimmer = keyframes`
    0% {
        background-position: -468px 0;
    }
    100% {
        background-position: 468px 0;
    }
`;

interface LoadingSkeletonProps {
    lines?: number;
    height?: number;
    animated?: boolean;
}

export function LoadingSkeleton({ lines = 3, height = 24, animated = true }: LoadingSkeletonProps) {
    const { theme } = useTheme();
    const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    
    return (
        <Box sx={{ width: '100%' }}>
            {Array.from({ length: lines }, (_, index) => (
                <Skeleton
                    key={index}
                    variant="rectangular"
                    height={height}
                    sx={{
                        mb: 1.5,
                        borderRadius: 1,
                        ...((animated && !reduceMotion) && {
                            '&::after': {
                                animation: `${shimmer} 2s infinite linear`,
                                background: `linear-gradient(90deg, transparent, ${theme.palette.action.hover}, transparent)`
                            }
                        })
                    }}
                />
            ))}
        </Box>
    );
}

interface LoadingCardProps {
    title?: string;
    subtitle?: string;
    height?: number;
    children?: React.ReactNode;
}

export function LoadingCard({ title, subtitle, height = 200, children }: LoadingCardProps) {
    const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    return (
        <Card 
            sx={{ 
                height,
                animation: reduceMotion ? 'none' : `${pulseGlow} 2s infinite`,
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {title && (
                    <Skeleton variant="text" width="60%" sx={{ fontSize: '1.5rem', mb: 1 }} />
                )}
                {subtitle && (
                    <Skeleton variant="text" width="40%" sx={{ fontSize: '1rem', mb: 2 }} />
                )}
                {children || <LoadingSkeleton lines={4} />}
            </CardContent>
        </Card>
    );
}

interface SpinnerProps {
    size?: number;
    message?: string;
    overlay?: boolean;
    color?: 'primary' | 'secondary' | 'inherit';
}

export function Spinner({ size = 40, message, overlay = false, color = 'primary' }: SpinnerProps) {
    const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    const content = (
        <Box 
            sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                p: 3,
                ...(overlay && {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(2px)',
                    zIndex: 1000
                })
            }}
        >
            {reduceMotion ? (
                <CircularProgress 
                    size={size} 
                    color={color}
                    sx={{
                        mb: message ? 2 : 0
                    }}
                />
            ) : (
                <Zoom in>
                    <CircularProgress 
                        size={size} 
                        color={color}
                        sx={{
                            animation: `${pulseGlow} 2s infinite`,
                            mb: message ? 2 : 0
                        }}
                    />
                </Zoom>
            )}
            {message && (
                reduceMotion ? (
                    <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                            fontWeight: 500,
                            textAlign: 'center'
                        }}
                    >
                        {message}
                    </Typography>
                ) : (
                    <Fade in style={{ transitionDelay: '200ms' }}>
                        <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ 
                                fontWeight: 500,
                                textAlign: 'center'
                            }}
                        >
                            {message}
                        </Typography>
                    </Fade>
                )
            )}
        </Box>
    );

    return overlay ? content : (
        <Box sx={{ minHeight: 200, position: 'relative' }}>
            {content}
        </Box>
    );
}

interface ProgressBarProps {
    progress: number;
    message?: string;
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    animated?: boolean;
}

export function ProgressBar({ progress, message, color = 'primary', animated = true }: ProgressBarProps) {
    const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    return (
        <Box sx={{ width: '100%', p: 2 }}>
            {message && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {message}
                </Typography>
            )}
            <LinearProgress 
                variant="determinate" 
                value={progress} 
                color={color}
                sx={{
                    height: 8,
                    borderRadius: 4,
                    ...((animated && !reduceMotion) && {
                        '& .MuiLinearProgress-bar': {
                            animation: `${shimmer} 2s infinite linear`
                        }
                    })
                }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'right' }}>
                {Math.round(progress)}%
            </Typography>
        </Box>
    );
}

// Chart loading skeleton
export function ChartLoadingSkeleton() {
    const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    return (
        <Card sx={{ height: 400, p: 3 }}>
            <CardContent>
                <Skeleton variant="text" width="30%" sx={{ fontSize: '1.5rem', mb: 2 }} />
                <Box sx={{ display: 'flex', alignItems: 'end', height: 250, gap: 1 }}>
                    {Array.from({ length: 8 }, (_, index) => (
                        <Skeleton
                            key={index}
                            variant="rectangular"
                            width="12%"
                            height={Math.random() * 200 + 50}
                            sx={{ 
                                borderRadius: '4px 4px 0 0',
                                ...(!reduceMotion && {
                                    animation: `${shimmer} 2s infinite linear`,
                                    animationDelay: `${index * 0.1}s`
                                })
                            }}
                        />
                    ))}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    {Array.from({ length: 8 }, (_, index) => (
                        <Skeleton key={index} variant="text" width="10%" />
                    ))}
                </Box>
            </CardContent>
        </Card>
    );
}

// Table loading skeleton
export function TableLoadingSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
    const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    return (
        <Box sx={{ width: '100%' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                {Array.from({ length: columns }, (_, index) => (
                    <Skeleton key={index} variant="text" width={`${100/columns}%`} height={32} />
                ))}
            </Box>
            {/* Rows */}
            {Array.from({ length: rows }, (_, rowIndex) => (
                <Box key={rowIndex} sx={{ display: 'flex', gap: 2, mb: 1.5, p: 2 }}>
                    {Array.from({ length: columns }, (_, colIndex) => (
                        <Skeleton 
                            key={colIndex} 
                            variant="text" 
                            width={`${100/columns}%`} 
                            height={24}
                            sx={{
                                ...(!reduceMotion && {
                                    animationDelay: `${(rowIndex * columns + colIndex) * 0.05}s`
                                })
                            }}
                        />
                    ))}
                </Box>
            ))}
        </Box>
    );
}

export default {
    LoadingSkeleton,
    LoadingCard,
    Spinner,
    ProgressBar,
    ChartLoadingSkeleton,
    TableLoadingSkeleton,
};
