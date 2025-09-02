/**
 * Beautiful favicon avatar component for FocusForge extension
 * Displays website favicons with elegant fallbacks and loading states
 */

import React from 'react';
import { Avatar, Skeleton, Tooltip, Box, SxProps, Theme } from '@mui/material';
import { useSmartFavicon } from '../hooks/useFavicon';
import { stringToColor } from '../utils/colors';
import CategoryIcon from '@mui/icons-material/Category';

export interface FaviconAvatarProps {
	/** Domain name or category name */
	name: string;
	/** Whether this is a category (true) or domain (false) */
	isCategory?: boolean;
	/** Size of the avatar in pixels */
	size?: number;
	/** Additional sx props for styling */
	sx?: SxProps<Theme>;
	/** Whether to show a tooltip with the name */
	showTooltip?: boolean;
	/** Custom tooltip text (defaults to name) */
	tooltipText?: string;
	/** Loading skeleton variant */
	variant?: 'circular' | 'rounded' | 'square';
	/** Elevation/shadow for the avatar */
	elevation?: number;
	/** Whether to animate on hover */
	animated?: boolean;
}

const FaviconAvatar: React.FC<FaviconAvatarProps> = ({
	name,
	isCategory = false,
	size = 32,
	sx = {},
	showTooltip = true,
	tooltipText,
	variant = 'circular',
	elevation = 0,
	animated = true
}) => {
	const { faviconUrl, isLoading, error } = useSmartFavicon(name, isCategory);
	const fallbackColor = stringToColor(name);
	const displayName = name.length > 25 ? `${name.substring(0, 22)}...` : name;
	const firstLetter = name.charAt(0).toUpperCase();

	// Create the avatar component
	const createAvatar = () => {
		// Loading state
		if (isLoading) {
			return (
				<Skeleton 
					variant={variant}
					width={size} 
					height={size}
					animation="wave"
					sx={{
						...sx,
						// Maintain rounded corners for skeleton
						borderRadius: variant === 'circular' ? '50%' : variant === 'rounded' ? 1 : 0
					}}
				/>
			);
		}

		// Error state or no favicon - show fallback
		if (error || !faviconUrl) {
			return (
				<Avatar
					sx={{
						bgcolor: fallbackColor,
						width: size,
						height: size,
						fontSize: size * 0.45,
						fontWeight: 700,
						boxShadow: elevation > 0 ? `0 ${elevation}px ${elevation * 2}px rgba(0,0,0,0.1)` : 'none',
						transition: animated ? 'all 0.2s ease-in-out' : 'none',
						...(animated && {
							'&:hover': {
								transform: 'scale(1.05)',
								boxShadow: `0 ${elevation + 2}px ${(elevation + 2) * 2}px rgba(0,0,0,0.15)`
							}
						}),
						borderRadius: variant === 'circular' ? '50%' : variant === 'rounded' ? 1 : 0,
						...sx
					}}
				>
					{isCategory ? (
						<CategoryIcon sx={{ fontSize: size * 0.5 }} />
					) : (
						firstLetter
					)}
				</Avatar>
			);
		}

		// Success state - show favicon
		return (
			<Box
				sx={{
					position: 'relative',
					display: 'inline-block',
					...sx
				}}
			>
				<Avatar
					src={faviconUrl}
					sx={{
						width: size,
						height: size,
						bgcolor: 'transparent',
						boxShadow: elevation > 0 ? `0 ${elevation}px ${elevation * 2}px rgba(0,0,0,0.1)` : 'none',
						transition: animated ? 'all 0.2s ease-in-out' : 'none',
						...(animated && {
							'&:hover': {
								transform: 'scale(1.05)',
								boxShadow: `0 ${elevation + 2}px ${(elevation + 2) * 2}px rgba(0,0,0,0.15)`
							}
						}),
						borderRadius: variant === 'circular' ? '50%' : variant === 'rounded' ? 1 : 0,
						// Ensure favicon fills the avatar properly
						'& img': {
							width: '100%',
							height: '100%',
							objectFit: 'contain'
						}
					}}
				>
					{/* Fallback if favicon fails to load */}
					{isCategory ? (
						<CategoryIcon sx={{ fontSize: size * 0.5, color: fallbackColor }} />
					) : (
						<Box
							sx={{
								fontSize: size * 0.45,
								fontWeight: 700,
								color: 'white',
								backgroundColor: fallbackColor,
								width: '100%',
								height: '100%',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center'
							}}
						>
							{firstLetter}
						</Box>
					)}
				</Avatar>
			</Box>
		);
	};

	const avatar = createAvatar();

	// Wrap with tooltip if requested
	if (showTooltip) {
		return (
			<Tooltip 
				title={tooltipText || displayName}
				placement="top"
				arrow
				enterDelay={500}
			>
				<Box sx={{ display: 'inline-block', cursor: 'pointer' }}>
					{avatar}
				</Box>
			</Tooltip>
		);
	}

	return avatar;
};

export default FaviconAvatar;


