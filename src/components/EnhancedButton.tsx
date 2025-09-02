import React from 'react';
import { Button, ButtonProps, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';

interface EnhancedButtonProps extends ButtonProps {
	tooltip?: string;
	haptic?: boolean;
	loading?: boolean;
}

export default function EnhancedButton({ 
	tooltip, 
	haptic = false,
	loading = false,
	children, 
	onClick,
	disabled,
	...props 
}: EnhancedButtonProps): JSX.Element {
	const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		if (haptic && navigator.vibrate) {
			navigator.vibrate(10); // Subtle haptic feedback
		}
		onClick?.(e);
	};

	const button = (
		<Button
			component={motion.button}
			whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
			whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
			transition={{ type: 'spring', stiffness: 400, damping: 17 }}
			onClick={handleClick}
			disabled={disabled || loading}
			{...props}
		>
			{loading ? 'Loading...' : children}
		</Button>
	);

	return tooltip ? (
		<Tooltip title={tooltip} arrow placement="top">
			<span>{button}</span>
		</Tooltip>
	) : button;
}






















