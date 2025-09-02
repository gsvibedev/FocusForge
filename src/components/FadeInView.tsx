import React from 'react';
import { motion } from 'framer-motion';
import { Box, BoxProps } from '@mui/material';

interface FadeInViewProps extends BoxProps {
	children: React.ReactNode;
	delay?: number;
	duration?: number;
	y?: number;
}

export default function FadeInView({ 
	children, 
	delay = 0, 
	duration = 0.4,
	y = 20,
	...boxProps 
}: FadeInViewProps): JSX.Element {
	return (
		<Box
			component={motion.div}
			initial={{ opacity: 0, y }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration, delay }}
			{...boxProps}
		>
			{children}
		</Box>
	);
}






















