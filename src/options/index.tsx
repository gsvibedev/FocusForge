import React from 'react';
import { createRoot } from 'react-dom/client';
import {
	ThemeProvider as MuiThemeProvider,
	CssBaseline,
	Box,
	Drawer,
	List,
	ListItemButton,
	ListItemText,
	Container,
	AppBar,
	Toolbar,
	Typography,
	ListItemIcon
} from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import CategoryIcon from '@mui/icons-material/Category';
import SecurityIcon from '@mui/icons-material/Security';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SettingsIcon from '@mui/icons-material/Settings';
import LimitsPanel from './panels/LimitsPanel';
import CategoriesPanel from './panels/CategoriesPanel';
import PrivacyPanel from './panels/PrivacyPanel';
import AdvancedAnalyticsPanel from './panels/AdvancedAnalyticsPanel';
import PreferencesPanel from './panels/PreferencesPanel';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import DarkModeToggle from '../components/DarkModeToggle';
import ErrorBoundary from '../components/ErrorBoundary';



function AppContent(): JSX.Element {
	const { theme } = useTheme();
	const [tab, setTab] = React.useState<'limits' | 'analytics' | 'categories' | 'preferences' | 'privacy'>('limits');
	return (
			<MuiThemeProvider theme={theme}>
				<CssBaseline />
				<Box sx={{
					minHeight: '100vh',
					backgroundColor: 'background.default'
				}}>
				<AppBar position="static" elevation={0} sx={{
					backgroundColor: 'background.paper',
					borderBottom: 1,
					borderColor: 'divider'
				}}>
					<Toolbar sx={{ justifyContent: 'space-between', py: 2 }}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
							<Box sx={{
								width: 40,
								height: 40,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center'
							}}>
								<img 
									src="/icons/logo.png" 
									alt="FocusForge Logo" 
									style={{ 
										width: '100%', 
										height: '100%', 
										objectFit: 'contain'
									}} 
								/>
							</Box>
							<Typography variant="h4" sx={{ 
								color: 'text.primary',
								fontWeight: 900,
								letterSpacing: '-0.03em'
							}}>
								FocusForge
							</Typography>
						</Box>
						<DarkModeToggle />
					</Toolbar>
				</AppBar>
			<Box sx={{ 
				display: 'flex', 
				minHeight: 'calc(100vh - 80px)', 
				height: '100%',
				backgroundColor: 'background.default' 
			}}>
				<Drawer
					variant="permanent"
					anchor="left"
					disablePortal
					sx={{
						width: 280,
						flexShrink: 0,
						'& .MuiDrawer-paper': {
							width: 280,
							boxSizing: 'border-box',
							position: 'relative',
							borderRight: 1,
							borderColor: 'divider',
							backgroundColor: 'background.paper'
						}
					}}>
					<Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
							<Typography variant="overline" fontWeight={800} color="primary.main" sx={{ px: 1, letterSpacing: '0.1em' }}>
								Navigation
							</Typography>
						</Box>
					<List sx={{ p: 2 }}>
						<ListItemButton selected={tab==='limits'} onClick={() => setTab('limits')} sx={{ mb: 1 }}>
							<ListItemIcon sx={{ minWidth: 48 }}>
								<Box sx={{
									width: 36,
									height: 36,
									borderRadius: '10px',
									backgroundColor: tab==='limits' ? 'primary.light' : 'action.hover',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									transition: 'all 0.2s ease'
								}}>
									<TimerIcon color={tab==='limits' ? 'primary' : 'inherit'} />
								</Box>
							</ListItemIcon>
							<ListItemText
								primary="Limits & Blocking"
								secondary="Set time limits and block sites"
								primaryTypographyProps={{ fontWeight: 700, fontSize: '1rem' }}
								secondaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary' }}
							/>
						</ListItemButton>
						<ListItemButton selected={tab==='analytics'} onClick={() => setTab('analytics')} sx={{ mb: 1 }}>
							<ListItemIcon sx={{ minWidth: 48 }}>
								<Box sx={{
									width: 36,
									height: 36,
									borderRadius: '10px',
									backgroundColor: tab==='analytics' ? 'primary.light' : 'action.hover',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									transition: 'all 0.2s ease'
								}}>
									<AnalyticsIcon color={tab==='analytics' ? 'primary' : 'inherit'} />
								</Box>
							</ListItemIcon>
							<ListItemText
								primary="Advanced Analytics"
								secondary="Reports and insights"
								primaryTypographyProps={{ fontWeight: 700, fontSize: '1rem' }}
								secondaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary' }}
							/>
						</ListItemButton>
						<ListItemButton selected={tab==='categories'} onClick={() => setTab('categories')} sx={{ mb: 1 }}>
							<ListItemIcon sx={{ minWidth: 48 }}>
								<Box sx={{
									width: 36,
									height: 36,
									borderRadius: '10px',
									backgroundColor: tab==='categories' ? 'primary.light' : 'action.hover',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									transition: 'all 0.2s ease'
								}}>
									<CategoryIcon color={tab==='categories' ? 'primary' : 'inherit'} />
								</Box>
							</ListItemIcon>
							<ListItemText
								primary="Categories"
								secondary="Organize and group websites"
								primaryTypographyProps={{ fontWeight: 700, fontSize: '1rem' }}
								secondaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary' }}
							/>
						</ListItemButton>
						<ListItemButton selected={tab==='preferences'} onClick={() => setTab('preferences')} sx={{ mb: 1 }}>
							<ListItemIcon sx={{ minWidth: 48 }}>
								<Box sx={{
									width: 36,
									height: 36,
									borderRadius: '10px',
									backgroundColor: tab==='preferences' ? 'primary.light' : 'action.hover',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									transition: 'all 0.2s ease'
								}}>
									<SettingsIcon color={tab==='preferences' ? 'primary' : 'inherit'} />
								</Box>
							</ListItemIcon>
							<ListItemText
								primary="Preferences"
								secondary="Interface and notification settings"
								primaryTypographyProps={{ fontWeight: 700, fontSize: '1rem' }}
								secondaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary' }}
							/>
						</ListItemButton>
						<ListItemButton selected={tab==='privacy'} onClick={() => setTab('privacy')} sx={{ mb: 1 }}>
							<ListItemIcon sx={{ minWidth: 48 }}>
								<Box sx={{
									width: 36,
									height: 36,
									borderRadius: '10px',
									backgroundColor: tab==='privacy' ? 'primary.light' : 'action.hover',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									transition: 'all 0.2s ease'
								}}>
									<SecurityIcon color={tab==='privacy' ? 'primary' : 'inherit'} />
								</Box>
							</ListItemIcon>
							<ListItemText
								primary="Privacy & Data"
								secondary="Manage your data and privacy"
								primaryTypographyProps={{ fontWeight: 700, fontSize: '1rem' }}
								secondaryTypographyProps={{ fontSize: '0.8rem', color: 'text.secondary' }}
							/>
						</ListItemButton>
					</List>
				</Drawer>
				<Container maxWidth="lg" sx={{ py: 4, px: 4, backgroundColor: 'background.paper', minHeight: '100%' }}>
					{tab === 'limits' && (
						<ErrorBoundary>
							<LimitsPanel />
						</ErrorBoundary>
					)}
					{tab === 'analytics' && (
						<ErrorBoundary>
							<AdvancedAnalyticsPanel />
						</ErrorBoundary>
					)}
					{tab === 'categories' && (
						<ErrorBoundary>
							<CategoriesPanel />
						</ErrorBoundary>
					)}
					{tab === 'preferences' && (
						<ErrorBoundary>
							<PreferencesPanel />
						</ErrorBoundary>
					)}
					{tab === 'privacy' && (
						<ErrorBoundary>
							<PrivacyPanel />
						</ErrorBoundary>
					)}
				</Container>
			</Box>
			</Box>
		</MuiThemeProvider>
	);
}

function App(): JSX.Element {
	return (
		<ErrorBoundary>
			<ThemeProvider>
				<AppContent />
			</ThemeProvider>
		</ErrorBoundary>
	);
}

createRoot(document.getElementById('root')!).render(<App />);