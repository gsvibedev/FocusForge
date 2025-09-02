import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, Theme } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('focusforge-dark-mode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('focusforge-dark-mode', JSON.stringify(isDarkMode));
    
    // Apply dark class to document body for CSS selectors
    if (isDarkMode) {
      document.body.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const lightTheme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#6366f1',
        light: '#818cf8',
        dark: '#4f46e5',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#8b5cf6',
        light: '#a78bfa',
        dark: '#7c3aed',
        contrastText: '#ffffff',
      },
      background: {
        default: '#f8fafc',
        paper: '#ffffff',
      },
      text: {
        primary: '#1e293b',
        secondary: '#64748b',
      },
      divider: '#e2e8f0',
      success: {
        main: '#10b981',
        light: '#34d399',
        dark: '#059669',
        contrastText: '#ffffff',
      },
      warning: {
        main: '#f59e0b',
        light: '#fbbf24',
        dark: '#d97706',
        contrastText: '#ffffff',
      },
      error: {
        main: '#ef4444',
        light: '#f87171',
        dark: '#dc2626',
        contrastText: '#ffffff',
      },
      info: {
        main: '#3b82f6',
        light: '#60a5fa',
        dark: '#2563eb',
        contrastText: '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
        fontSize: '2.5rem',
      },
      h2: {
        fontWeight: 700,
        fontSize: '2rem',
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.75rem',
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.5rem',
      },
      h5: {
        fontWeight: 600,
        fontSize: '1.25rem',
      },
      h6: {
        fontWeight: 600,
        fontSize: '1.125rem',
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiDialog: {
        defaultProps: {
          disableScrollLock: true,
          disablePortal: true,
          disableEnforceFocus: true,
          disableAutoFocus: true,
          disableRestoreFocus: true,
        },
      },
      MuiDrawer: {
        defaultProps: {
          disablePortal: true,
        },
      },
      MuiModal: {
        defaultProps: {
          disableScrollLock: true,
          disablePortal: true,
          disableEnforceFocus: true,
          disableAutoFocus: true,
          disableRestoreFocus: true,
        },
      },
      MuiPopover: {
        defaultProps: {
          disableScrollLock: true,
          disablePortal: true,
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 12,
            padding: '10px 24px',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)'
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
            },
          },
        },
      },
    },
  });

  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#818cf8',
        light: '#a5b4fc',
        dark: '#6366f1',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#a78bfa',
        light: '#c4b5fd',
        dark: '#8b5cf6',
        contrastText: '#ffffff',
      },
      background: {
        default: '#0f172a',
        paper: '#1e293b',
      },
      text: {
        primary: '#f1f5f9',
        secondary: '#94a3b8',
      },
      divider: '#334155',
      success: {
        main: '#34d399',
        light: '#6ee7b7',
        dark: '#10b981',
        contrastText: '#ffffff',
      },
      warning: {
        main: '#fbbf24',
        light: '#fcd34d',
        dark: '#f59e0b',
        contrastText: '#000000',
      },
      error: {
        main: '#f87171',
        light: '#fca5a5',
        dark: '#ef4444',
        contrastText: '#ffffff',
      },
      info: {
        main: '#60a5fa',
        light: '#93c5fd',
        dark: '#3b82f6',
        contrastText: '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
        fontSize: '2.5rem',
      },
      h2: {
        fontWeight: 700,
        fontSize: '2rem',
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.75rem',
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.5rem',
      },
      h5: {
        fontWeight: 600,
        fontSize: '1.25rem',
      },
      h6: {
        fontWeight: 600,
        fontSize: '1.125rem',
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiDialog: {
        defaultProps: {
          disableScrollLock: true,
          disablePortal: true,
          disableEnforceFocus: true,
          disableAutoFocus: true,
          disableRestoreFocus: true,
        },
      },
      MuiDrawer: {
        defaultProps: {
          disablePortal: true,
        },
      },
      MuiModal: {
        defaultProps: {
          disableScrollLock: true,
          disablePortal: true,
          disableEnforceFocus: true,
          disableAutoFocus: true,
          disableRestoreFocus: true,
        },
      },
      MuiPopover: {
        defaultProps: {
          disableScrollLock: true,
          disablePortal: true,
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 12,
            padding: '10px 24px',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundColor: '#1e293b',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3), 0 1px 3px rgba(0, 0, 0, 0.2)',
            border: '1px solid #334155',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              backgroundColor: '#334155',
              '& fieldset': {
                borderColor: '#475569',
              },
              '&:hover fieldset': {
                borderColor: '#64748b',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#818cf8',
              },
            },
            '& .MuiInputLabel-root': {
              color: '#94a3b8',
            },
            '& .MuiOutlinedInput-input': {
              color: '#f1f5f9',
            },
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
    },
  });

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, theme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles styles={{
          '::-webkit-scrollbar': {
            width: '8px',
            height: '8px'
          },
          '::-webkit-scrollbar-track': {
            backgroundColor: theme.palette.mode === 'dark' ? '#0f172a' : '#f1f5f9'
          },
          '::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.mode === 'dark' ? '#334155' : '#cbd5e1',
            borderRadius: '8px',
            border: `2px solid ${theme.palette.mode === 'dark' ? '#0f172a' : '#f1f5f9'}`
          },
          '::-webkit-scrollbar-thumb:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? '#475569' : '#94a3b8'
          }
        }} />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;