import React from 'react';
import { Box, Typography, Chip, Stack, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { useTheme } from '../contexts/ThemeContext';

interface KeyboardShortcutsProps {
	open: boolean;
	onClose: () => void;
}

const shortcuts = [
	{ key: 'Tab + Arrow Keys', description: 'Navigate between tabs and elements' },
	{ key: 'Enter / Space', description: 'Activate buttons and controls' },
	{ key: 'Escape', description: 'Close dialogs and modals' },
	{ key: 'Ctrl + ,', description: 'Open settings (when available)' },
	{ key: 'Alt + 1-3', description: 'Switch between Today/Stats/Options tabs' }
];

export default function KeyboardShortcuts({ open, onClose }: KeyboardShortcutsProps): JSX.Element {
	const { theme, isDarkMode } = useTheme();
	return (
		<Dialog 
			open={open} 
			onClose={onClose} 
			maxWidth="sm" 
			fullWidth
			disableScrollLock
			disablePortal
			disableEnforceFocus
			disableAutoFocus
			disableRestoreFocus
			BackdropProps={{
				style: { position: 'fixed' }
			}}
			PaperProps={{
				style: { 
					position: 'fixed',
					top: '10vh',
					margin: 0,
					maxHeight: '80vh',
					overflow: 'auto'
				}
			}}
		>
			<DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<KeyboardIcon color="primary" />
					<Typography variant="h6" fontWeight={700}>
						Keyboard Shortcuts
					</Typography>
				</Box>
				<IconButton onClick={onClose} size="small">
					<CloseIcon />
				</IconButton>
			</DialogTitle>
			<DialogContent>
				<Stack spacing={2}>
					{shortcuts.map((shortcut, index) => (
						<Box 
							key={index}
						sx={{ 
							display: 'flex', 
							justifyContent: 'space-between', 
							alignItems: 'center',
							p: 1.5,
							borderRadius: 1,
							backgroundColor: theme.palette.background.paper
						}}
						>
							<Typography variant="body2" sx={{ flex: 1 }}>
								{shortcut.description}
							</Typography>
							<Chip 
								label={shortcut.key}
								size="small"
								variant="outlined"
								sx={{ 
									fontFamily: 'monospace',
									fontWeight: 600,
									fontSize: '0.75rem'
								}}
							/>
						</Box>
					))}
				</Stack>
			</DialogContent>
		</Dialog>
	);
}





