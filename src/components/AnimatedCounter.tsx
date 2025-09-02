import React from 'react';
import { Typography, TypographyProps } from '@mui/material';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps extends Omit<TypographyProps, 'children'> {
	value: number;
	duration?: number;
	format?: (value: number) => string;
}

export default function AnimatedCounter({ 
	value, 
	duration = 1000, 
	format = (v) => v.toString(),
	...props 
}: AnimatedCounterProps): JSX.Element {
	const spring = useSpring(value, { duration });
	const display = useTransform(spring, (latest) => format(Math.round(latest)));

	return (
		<Typography {...props} component={motion.span}>
			{display}
		</Typography>
	);
}






















