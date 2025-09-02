import React from 'react';
import { Box, IconButton, Tooltip, Fab, Zoom, Stack, useTheme } from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import BlockIcon from '@mui/icons-material/Block';
import CategoryIcon from '@mui/icons-material/Category';
import SettingsIcon from '@mui/icons-material/Settings';
import { motion } from 'framer-motion';

interface QuickActionsProps {
	onQuickLimit: (domain: string) => void;
	onQuickBlock: (domain: string) => void;
	onOpenCategories: () => void;
	onOpenSettings: () => void;
	currentDomain?: string;
}

export default function QuickActions({
	onQuickLimit,
	onQuickBlock,
	onOpenCategories,
	onOpenSettings,
	currentDomain
}: QuickActionsProps): JSX.Element {
	const { theme, isDarkMode } = useTheme();
	const [expanded, setExpanded] = React.useState(false);

	const actions = [
		{
			icon: <TimerIcon />,
			label: `Set limit for ${currentDomain || 'current site'}`,
			onClick: () => currentDomain && onQuickLimit(currentDomain),
			disabled: !currentDomain,
			color: theme.palette.warning.main
		},
		{
			icon: <BlockIcon />,
			label: `Block ${currentDomain || 'current site'}`,
			onClick: () => currentDomain && onQuickBlock(currentDomain),
			disabled: !currentDomain,
			color: theme.palette.error.main
		},
		{
			icon: <CategoryIcon />,
			label: 'Manage categories',
			onClick: onOpenCategories,
			disabled: false,
			color: theme.palette.info.main
		},
		{
			icon: <SettingsIcon />,
			label: 'Open settings',
			onClick: onOpenSettings,
			disabled: false,
			color: theme.palette.success.main
		}
	];

	return (
		<Box
			sx={{
				position: 'fixed',
				bottom: 16,
				right: 16,
				zIndex: 1000
			}}
		>
			<Stack spacing={1} alignItems="center">
				{/* Action buttons */}
				{actions.map((action, index) => (
					<Zoom
						key={index}
						in={expanded}
						timeout={{ enter: 200 + index * 50, exit: 200 }}
						style={{ transitionDelay: expanded ? `${index * 50}ms` : '0ms' }}
					>
						<Tooltip title={action.label} placement="left">
							<span>
								<Fab
									size="small"
									onClick={action.onClick}
									disabled={action.disabled}
									sx={{
											backgroundColor: action.color,
											color: theme.palette.getContrastText(action.color),
											'&:hover': {
												backgroundColor: action.color,
												filter: 'brightness(0.9)'
											},
											'&.Mui-disabled': {
												backgroundColor: theme.palette.action.disabled
											}
										}}
								>
									{action.icon}
								</Fab>
							</span>
						</Tooltip>
					</Zoom>
				))}

				{/* Main FAB */}
				<Fab
					color="primary"
				component={motion.button}
				whileHover={{ scale: 1.1 }}
				whileTap={{ scale: 0.9 }}
				onClick={() => setExpanded(!expanded)}
				sx={{
					background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
					'&:hover': {
						background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
					}
				}}
				>
					<motion.div
						animate={{ rotate: expanded ? 45 : 0 }}
						transition={{ duration: 0.2 }}
					>
						<SettingsIcon />
					</motion.div>
				</Fab>
			</Stack>
		</Box>
	);
}





