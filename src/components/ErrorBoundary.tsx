import React from 'react';
import { Box, Typography, Button, Card, CardContent, Alert, Collapse } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useTheme } from '../contexts/ThemeContext';

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: React.ErrorInfo | null;
	showDetails: boolean;
}

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
			showDetails: false
		};
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return {
			hasError: true,
			error
		};
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		this.setState({
			error,
			errorInfo
		});

		// Log error for debugging
		console.error('ErrorBoundary caught an error:', error, errorInfo);
		
		// Call optional error handler
		if (this.props.onError) {
			this.props.onError(error, errorInfo);
		}
	}

	resetError = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
			showDetails: false
		});
	};

	toggleDetails = () => {
		this.setState(prev => ({ showDetails: !prev.showDetails }));
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				const FallbackComponent = this.props.fallback;
				return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
			}

			return <ErrorFallback 
				error={this.state.error!} 
				errorInfo={this.state.errorInfo}
				showDetails={this.state.showDetails}
				onToggleDetails={this.toggleDetails}
				onReset={this.resetError} 
			/>;
		}

		return this.props.children;
	}
}

interface ErrorFallbackProps {
	error: Error;
	errorInfo: React.ErrorInfo | null;
	showDetails: boolean;
	onToggleDetails: () => void;
	onReset: () => void;
}

function ErrorFallback({ error, errorInfo, showDetails, onToggleDetails, onReset }: ErrorFallbackProps) {
	const { theme } = useTheme();

	return (
		<Box 
			sx={{ 
				display: 'flex', 
				justifyContent: 'center', 
				alignItems: 'center', 
				minHeight: '400px',
				p: 3 
			}}
		>
			<Card 
				sx={{ 
					maxWidth: 600, 
					width: '100%',
					border: `2px solid ${theme.palette.error.main}`,
					boxShadow: theme.shadows[8]
				}}
			>
				<CardContent sx={{ p: 4 }}>
					<Box sx={{ textAlign: 'center', mb: 3 }}>
						<ErrorOutlineIcon 
							sx={{ 
								fontSize: 64, 
								color: 'error.main', 
								mb: 2,
								filter: `drop-shadow(0 4px 8px ${theme.palette.error.main}40)`
							}} 
						/>
						<Typography variant="h5" gutterBottom fontWeight={700}>
							Something went wrong
						</Typography>
						<Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
							We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
						</Typography>
					</Box>

					<Alert severity="error" sx={{ mb: 3 }}>
						<Typography variant="body2" fontWeight={600}>
							{error.name}: {error.message}
						</Typography>
					</Alert>

					<Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
						<Button 
							variant="contained" 
							startIcon={<RefreshIcon />}
							onClick={onReset}
							sx={{ 
								minWidth: 120,
								fontWeight: 600,
								textTransform: 'none'
							}}
						>
							Try Again
						</Button>
						<Button 
							variant="outlined" 
							startIcon={<BugReportIcon />}
							onClick={onToggleDetails}
							sx={{ 
								minWidth: 120,
								fontWeight: 600,
								textTransform: 'none'
							}}
						>
							{showDetails ? 'Hide' : 'Show'} Details
						</Button>
					</Box>

					<Collapse in={showDetails}>
						<Card variant="outlined" sx={{ backgroundColor: 'grey.50' }}>
							<CardContent>
								<Typography variant="subtitle2" gutterBottom fontWeight={600}>
									Error Stack:
								</Typography>
								<Typography 
									variant="body2" 
									component="pre" 
									sx={{ 
										fontSize: '0.75rem',
										fontFamily: 'monospace',
										whiteSpace: 'pre-wrap',
										maxHeight: 200,
										overflow: 'auto',
										backgroundColor: 'grey.900',
										color: 'common.white',
										p: 2,
										borderRadius: 1,
										mb: 2
									}}
								>
									{error.stack}
								</Typography>
								
								{errorInfo && (
									<>
										<Typography variant="subtitle2" gutterBottom fontWeight={600}>
											Component Stack:
										</Typography>
										<Typography 
											variant="body2" 
											component="pre" 
											sx={{ 
												fontSize: '0.75rem',
												fontFamily: 'monospace',
												whiteSpace: 'pre-wrap',
												maxHeight: 150,
												overflow: 'auto',
												backgroundColor: 'grey.900',
												color: 'common.white',
												p: 2,
												borderRadius: 1
											}}
										>
											{errorInfo.componentStack}
										</Typography>
									</>
								)}
							</CardContent>
						</Card>
					</Collapse>
				</CardContent>
			</Card>
		</Box>
	);
}

// Hook for error boundary in functional components
export function useErrorHandler() {
	return React.useCallback((error: Error, errorInfo?: any) => {
		console.error('Handled error:', error, errorInfo);
		// Could integrate with error reporting service here
	}, []);
}

export default ErrorBoundary;
