import React from 'react';
import {
	Box, Card, CardContent, Typography, Button, Grid, IconButton, Chip, Dialog,
	DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Stack, Alert,
	Tooltip, FormHelperText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PatternIcon from '@mui/icons-material/Pattern';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { URLPattern, RulesEngine } from '../storage/rulesEngine';

interface URLPatternsTabProps {
	urlPatterns: URLPattern[];
	onRefresh: () => void;
	theme: any;
}

const PATTERN_EXAMPLES = {
	regex: [
		{ pattern: '.*\\.facebook\\.com.*', description: 'Any Facebook page' },
		{ pattern: '.*\\.(youtube|twitch)\\.com.*', description: 'YouTube or Twitch' },
		{ pattern: '.*reddit\\.com/r/(gaming|funny).*', description: 'Specific subreddits' }
	],
	glob: [
		{ pattern: '*.facebook.com/*', description: 'Any Facebook page' },
		{ pattern: '*.{youtube,twitch}.com/*', description: 'YouTube or Twitch' },
		{ pattern: '*shopping*', description: 'Any site with "shopping"' }
	],
	exact: [
		{ pattern: 'facebook.com', description: 'Exactly facebook.com' },
		{ pattern: 'www.youtube.com', description: 'Exactly www.youtube.com' }
	],
	contains: [
		{ pattern: 'social', description: 'URLs containing "social"' },
		{ pattern: 'game', description: 'URLs containing "game"' }
	]
};

export default function URLPatternsTab({ urlPatterns, onRefresh, theme }: URLPatternsTabProps): React.ReactElement {
	const [showPatternDialog, setShowPatternDialog] = React.useState(false);
	const [editingPattern, setEditingPattern] = React.useState<URLPattern | null>(null);
	const [newPattern, setNewPattern] = React.useState<Partial<URLPattern>>({
		name: '',
		pattern: '',
		type: 'glob',
		enabled: true,
		action: 'block',
		description: ''
	});
	const [patternError, setPatternError] = React.useState('');

	const validatePattern = (pattern: string, type: string) => {
		if (!pattern) return 'Pattern is required';
		
		if (type === 'regex') {
			try {
				new RegExp(pattern);
			} catch (e) {
				return 'Invalid regular expression';
			}
		}
		
		return '';
	};

	const handleSavePattern = async () => {
		const error = validatePattern(newPattern.pattern || '', newPattern.type || 'glob');
		if (error) {
			setPatternError(error);
			return;
		}

		if (!newPattern.name || !newPattern.pattern) return;

		const pattern: URLPattern = {
			id: editingPattern?.id || `pattern_${Date.now()}`,
			name: newPattern.name,
			pattern: newPattern.pattern,
			type: newPattern.type as any,
			enabled: newPattern.enabled ?? true,
			action: newPattern.action as any,
			...(newPattern.action === 'limit' ? { limitMinutes: newPattern.limitMinutes || 30 } : {}),
			description: newPattern.description,
			createdAt: editingPattern?.createdAt || new Date()
		};

		await RulesEngine.saveURLPattern(pattern);
		setShowPatternDialog(false);
		setEditingPattern(null);
		setNewPattern({
			name: '',
			pattern: '',
			type: 'glob',
			enabled: true,
			action: 'block',
			description: ''
		});
		setPatternError('');
		onRefresh();
	};

	const handleDeletePattern = async (patternId: string) => {
		await RulesEngine.deleteURLPattern(patternId);
		onRefresh();
	};

	const handleEditPattern = (pattern: URLPattern) => {
		setEditingPattern(pattern);
		setNewPattern(pattern);
		setShowPatternDialog(true);
	};

	const handlePatternChange = (value: string) => {
		setNewPattern({ ...newPattern, pattern: value });
		const error = validatePattern(value, newPattern.type || 'glob');
		setPatternError(error);
	};

	return (
		<Box>
			{/* Subtle Header */}
			<Card sx={{ 
				mb: 3, 
				borderRadius: 3,
				border: `1px solid ${theme.palette.divider}`,
				background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
				boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
			}}>
				<CardContent sx={{ p: 4 }}>
					<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
							<Box sx={{
								width: 48,
								height: 48,
								borderRadius: '12px',
								background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.light} 100%)`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								boxShadow: `0 4px 12px ${theme.palette.secondary.main}25`
							}}>
								<PatternIcon sx={{ fontSize: 24, color: 'white' }} />
							</Box>
							<Box>
								<Typography variant="h5" fontWeight={700} sx={{ 
									mb: 0.5,
									background: `linear-gradient(45deg, ${theme.palette.text.primary} 60%, ${theme.palette.secondary.main} 100%)`,
									WebkitBackgroundClip: 'text',
									WebkitTextFillColor: 'transparent',
									backgroundClip: 'text'
								}}>
									URL Patterns ({urlPatterns.length})
								</Typography>
								<Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
									Advanced URL matching for precise control
								</Typography>
							</Box>
						</Box>
						<Button
							variant="contained"
							startIcon={<AddIcon />}
							onClick={() => setShowPatternDialog(true)}
							sx={{
								borderRadius: 2.5,
								textTransform: 'none',
								fontWeight: 600,
								px: 3,
								py: 1.5,
								background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.light} 100%)`,
								boxShadow: `0 4px 12px ${theme.palette.secondary.main}40`,
								'&:hover': {
									background: `linear-gradient(135deg, ${theme.palette.secondary.dark} 0%, ${theme.palette.secondary.main} 100%)`,
									boxShadow: `0 6px 16px ${theme.palette.secondary.main}50`,
									transform: 'translateY(-1px)'
								}
							}}
						>
							Add Pattern
						</Button>
					</Box>

					{/* Pattern Types Info */}
					<Alert severity="info" sx={{ 
						mt: 3,
						borderRadius: 2.5,
						border: `1px solid ${theme.palette.info.light}`,
						background: `linear-gradient(135deg, ${theme.palette.info.light}15 0%, ${theme.palette.info.light}05 100%)`
					}}>
						<Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
							Pattern Types:
						</Typography>
						<Typography variant="body2">
							• <strong>Glob:</strong> Simple wildcards (* and ?) • <strong>Regex:</strong> Full regular expressions
							• <strong>Exact:</strong> Perfect matches • <strong>Contains:</strong> Text anywhere in URL
						</Typography>
					</Alert>
				</CardContent>
			</Card>

			{/* Patterns List */}
			{urlPatterns.length === 0 ? (
				<Card sx={{ borderRadius: 3, textAlign: 'center', py: 4, border: `1px solid ${theme.palette.divider}` }}>
					<CardContent>
						<PatternIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
						<Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
							No URL patterns
						</Typography>
						<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
							Create advanced patterns to match specific URLs or URL parts
						</Typography>
						<Button
							variant="contained"
							startIcon={<AddIcon />}
							onClick={() => setShowPatternDialog(true)}
							sx={{ borderRadius: 2 }}
						>
							Create First Pattern
						</Button>
					</CardContent>
				</Card>
			) : (
				<Grid container spacing={2}>
					{urlPatterns.map((pattern) => (
						<Grid item xs={12} key={pattern.id}>
							<Card
								sx={{
									borderRadius: 2.5,
									border: `1px solid ${theme.palette.divider}`,
									opacity: pattern.enabled ? 1 : 0.6,
									transition: 'all 0.2s ease',
									'&:hover': {
										transform: 'translateY(-1px)',
										boxShadow: `0 4px 12px ${theme.palette.action.selected}`
									}
								}}
							>
								<CardContent sx={{ p: 3 }}>
									<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
										<Box sx={{ flex: 1 }}>
											<Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
												{pattern.name}
											</Typography>
											<Stack direction="row" spacing={1} sx={{ mb: 2 }}>
												<Chip
													label={pattern.type.toUpperCase()}
													size="small"
													color="primary"
													variant="outlined"
												/>
												<Chip
													label={pattern.action === 'block' ? 'Block' : `Limit ${pattern.limitMinutes}m`}
													size="small"
													color={pattern.action === 'block' ? 'error' : 'warning'}
													variant="outlined"
												/>
												<Chip
													label={pattern.enabled ? 'Active' : 'Disabled'}
													size="small"
													color={pattern.enabled ? 'success' : 'default'}
												/>
											</Stack>
											<Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1, p: 1, backgroundColor: theme.palette.action.hover, borderRadius: 1 }}>
												{pattern.pattern}
											</Typography>
											{pattern.description && (
												<Typography variant="body2" color="text.secondary">
													{pattern.description}
												</Typography>
											)}
										</Box>
										<Stack direction="row" spacing={1}>
											<Tooltip title="Edit">
												<IconButton
													onClick={() => handleEditPattern(pattern)}
													size="small"
													color="primary"
													aria-label="Edit pattern"
												>
													<EditIcon fontSize="small" />
												</IconButton>
											</Tooltip>
											<Tooltip title="Delete">
												<IconButton
													onClick={() => handleDeletePattern(pattern.id)}
													size="small"
													color="error"
													aria-label="Delete pattern"
												>
													<DeleteIcon fontSize="small" />
												</IconButton>
											</Tooltip>
										</Stack>
									</Box>
								</CardContent>
							</Card>
						</Grid>
					))}
				</Grid>
			)}

			{/* Add/Edit Pattern Dialog */}
			<Dialog 
				open={showPatternDialog} 
				onClose={() => setShowPatternDialog(false)} 
				maxWidth="md" 
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
				<DialogTitle>
					{editingPattern ? 'Edit URL Pattern' : 'Create URL Pattern'}
				</DialogTitle>
				<DialogContent>
					<Grid container spacing={3} sx={{ mt: 1 }}>
						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Pattern Name"
								value={newPattern.name || ''}
								onChange={(e) => setNewPattern({ ...newPattern, name: e.target.value })}
								placeholder="e.g., Block Social Media"
							/>
						</Grid>

						<Grid item xs={6}>
							<TextField
								select
								fullWidth
								label="Pattern Type"
								value={newPattern.type || 'glob'}
								onChange={(e) => {
									setNewPattern({ ...newPattern, type: e.target.value as any });
									setPatternError('');
								}}
							>
								<MenuItem value="glob">Glob Pattern</MenuItem>
								<MenuItem value="regex">Regular Expression</MenuItem>
								<MenuItem value="exact">Exact Match</MenuItem>
								<MenuItem value="contains">Contains Text</MenuItem>
							</TextField>
						</Grid>

						<Grid item xs={6}>
							<TextField
								select
								fullWidth
								label="Action"
								value={newPattern.action || 'block'}
								onChange={(e) => setNewPattern({ ...newPattern, action: e.target.value as any })}
							>
								<MenuItem value="block">Block Completely</MenuItem>
								<MenuItem value="limit">Time Limit</MenuItem>
							</TextField>
						</Grid>

						<Grid item xs={12}>
							<TextField
								fullWidth
								label="URL Pattern"
								value={newPattern.pattern || ''}
								onChange={(e) => handlePatternChange(e.target.value)}
								error={!!patternError}
								helperText={patternError}
								placeholder={`e.g., ${PATTERN_EXAMPLES[newPattern.type as keyof typeof PATTERN_EXAMPLES]?.[0]?.pattern || '*.example.com/*'}`}
								sx={{ fontFamily: 'monospace' }}
							/>
						</Grid>

						{newPattern.action === 'limit' && (
							<Grid item xs={12}>
								<TextField
									fullWidth
									label="Time Limit (minutes)"
									type="number"
									value={newPattern.limitMinutes || 30}
									onChange={(e) => setNewPattern({ ...newPattern, limitMinutes: parseInt(e.target.value) || 30 })}
									inputProps={{ min: 1, max: 480 }}
								/>
							</Grid>
						)}

						<Grid item xs={12}>
							<TextField
								fullWidth
								label="Description (optional)"
								value={newPattern.description || ''}
								onChange={(e) => setNewPattern({ ...newPattern, description: e.target.value })}
								placeholder="Describe what this pattern matches"
								multiline
								rows={2}
							/>
						</Grid>

						{/* Examples */}
						<Grid item xs={12}>
							<Typography variant="subtitle2" sx={{ mb: 1 }}>
								Examples for {newPattern.type || 'glob'} patterns:
							</Typography>
							<Stack spacing={1}>
								{(PATTERN_EXAMPLES[newPattern.type as keyof typeof PATTERN_EXAMPLES] || []).map((example, index) => (
									<Box
										key={index}
										sx={{
											p: 2,
											backgroundColor: theme.palette.action.hover,
											borderRadius: 1,
											cursor: 'pointer',
											transition: 'all 0.2s ease',
											'&:hover': { backgroundColor: theme.palette.action.selected }
										}}
										onClick={() => setNewPattern({ ...newPattern, pattern: example.pattern })}
									>
										<Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
											{example.pattern}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											{example.description}
										</Typography>
									</Box>
								))}
							</Stack>
						</Grid>
					</Grid>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowPatternDialog(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleSavePattern}
						variant="contained"
						disabled={!newPattern.name || !newPattern.pattern || !!patternError}
					>
						{editingPattern ? 'Update Pattern' : 'Create Pattern'}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
