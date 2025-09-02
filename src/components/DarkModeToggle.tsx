import React from 'react';
import { IconButton, Tooltip, Box } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useTheme as useMuiTheme } from '@mui/material/styles';

interface DarkModeToggleProps {
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
}

const DarkModeToggle: React.FC<DarkModeToggleProps> = ({ 
  size = 'medium', 
  showTooltip = true 
}) => {
  const { isDarkMode, toggleDarkMode, theme } = useTheme();

  const toggleButton = (
    <IconButton
      onClick={toggleDarkMode}
      size={size}
      sx={{
        borderRadius: 3,
        padding: size === 'small' ? 1 : size === 'large' ? 1.5 : 1.25,
        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
        border: `1px solid ${theme.palette.divider}`,
        color: theme.palette.warning.main,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          background: `linear-gradient(135deg, ${theme.palette.action.hover} 0%, ${theme.palette.action.selected} 100%)`,
          transform: 'scale(1.05)',
          boxShadow: `0 8px 25px ${theme.palette.action.selected}`,
        },
        '&:active': {
          transform: 'scale(0.95)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.3s ease',
          transform: isDarkMode ? 'rotate(0deg)' : 'rotate(180deg)',
        }}
      >
        {isDarkMode ? (
          <Brightness7 
            sx={{ 
              fontSize: size === 'small' ? 18 : size === 'large' ? 28 : 22,
              filter: `drop-shadow(0 2px 4px ${theme.palette.action.selected})`,
            }} 
          />
        ) : (
          <Brightness4 
            sx={{ 
              fontSize: size === 'small' ? 18 : size === 'large' ? 28 : 22,
              filter: `drop-shadow(0 2px 4px ${theme.palette.action.selected})`,
            }} 
          />
        )}
      </Box>
    </IconButton>
  );

  if (!showTooltip) {
    return toggleButton;
  }

  return (
    <Tooltip 
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      placement="bottom"
      arrow
      sx={{
        '& .MuiTooltip-tooltip': {
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          fontSize: '0.75rem',
          fontWeight: 500,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
        },
        '& .MuiTooltip-arrow': {
          color: theme.palette.background.paper,
        },
      }}
    >
      {toggleButton}
    </Tooltip>
  );
};

export default DarkModeToggle;