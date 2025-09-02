import React from 'react';
import { 
	Box, 
	Stack, 
	TextField, 
	Button, 
	Typography, 
	Card, 
	CardContent, 
	Chip, 
	Accordion,
	AccordionSummary,
	AccordionDetails,
	List,
	ListItem,
	ListItemText,
	IconButton,
	Autocomplete,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions
} from '@mui/material';
import { useTheme } from '../../contexts/ThemeContext';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import WebIcon from '@mui/icons-material/Web';
import { refreshCategoryFavicon } from '../../utils/categoryFavicon';

export default function CategoriesPanel(): React.ReactElement {
	const { theme, isDarkMode } = useTheme();
	const [cats, setCats] = React.useState<{ name: string; color: string }[]>([]);
	const [form, setForm] = React.useState({ name: '', color: theme.palette.primary.main });
	const [domainCategories, setDomainCategories] = React.useState<Record<string, string>>({});
	const [addDomainDialog, setAddDomainDialog] = React.useState(false);
	const [newDomain, setNewDomain] = React.useState('');
	const [selectedCategory, setSelectedCategory] = React.useState('');

	const loadData = React.useCallback(async () => {
		const storage = await chrome.storage.local.get(['categories', 'domainCategories']);
		const existingCategories = (storage['categories'] ?? []) as { name: string; color: string }[];
		const domainCats = (storage['domainCategories'] ?? {}) as Record<string, string>;
		
		// Find AI-created categories that don't exist in the categories list
		const aiCategories = new Set(Object.values(domainCats));
		const existingCategoryNames = new Set(existingCategories.map(c => c.name));
		
		// Generate colors for AI categories
		const defaultColors = [
			theme.palette.primary.main,
			theme.palette.secondary.main,
			'#f44336', // red
			'#4caf50', // green
			'#ff9800', // orange
			'#9c27b0', // purple
			'#00bcd4', // cyan
			'#795548', // brown
		];
		
		// Auto-create category entries for AI categories
		const newCategories = [...existingCategories];
		let colorIndex = existingCategories.length;
		
		for (const aiCategory of aiCategories) {
			if (!existingCategoryNames.has(aiCategory)) {
				newCategories.push({
					name: aiCategory,
					color: defaultColors[colorIndex % defaultColors.length]
				});
				colorIndex++;
			}
		}
		
		// Save updated categories if we added any
		if (newCategories.length > existingCategories.length) {
			await chrome.storage.local.set({ categories: newCategories });
		}
		
		setCats(newCategories);
		setDomainCategories(domainCats);
	}, [theme.palette.primary.main, theme.palette.secondary.main]);

	React.useEffect(() => {
		loadData();
	}, [loadData]);

	async function addCategory(): Promise<void> {
		if (!form.name.trim()) return;
		const next = [...cats, { name: form.name.trim(), color: form.color }];
		await chrome.storage.local.set({ categories: next });
		setCats(next);
		setForm({ name: '', color: theme.palette.primary.main });
	}

	async function deleteCategory(categoryName: string): Promise<void> {
		const updatedCats = cats.filter(c => c.name !== categoryName);
		const updatedDomainCats = { ...domainCategories };
		
		// Remove category assignment from domains
		Object.keys(updatedDomainCats).forEach(domain => {
			if (updatedDomainCats[domain] === categoryName) {
				delete updatedDomainCats[domain];
			}
		});

		await chrome.storage.local.set({ 
			categories: updatedCats, 
			domainCategories: updatedDomainCats 
		});
		setCats(updatedCats);
		setDomainCategories(updatedDomainCats);
	}

	async function addDomainToCategory(): Promise<void> {
		if (!newDomain.trim() || !selectedCategory) return;
		
		const domain = newDomain.trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
		const updated = { ...domainCategories, [domain]: selectedCategory };
		
		await chrome.storage.local.set({ domainCategories: updated });
		setDomainCategories(updated);
		setNewDomain('');
		setSelectedCategory('');
		setAddDomainDialog(false);
		
		// Refresh category favicon since members changed
		try {
			await refreshCategoryFavicon(selectedCategory);
		} catch (error) {
			console.error('[CategoriesPanel] Failed to refresh category favicon:', error);
		}
	}

	async function removeDomainFromCategory(domain: string): Promise<void> {
		const categoryName = domainCategories[domain];
		const updated = { ...domainCategories };
		delete updated[domain];
		await chrome.storage.local.set({ domainCategories: updated });
		setDomainCategories(updated);
		
		// Refresh category favicon since members changed
		if (categoryName) {
			try {
				await refreshCategoryFavicon(categoryName);
			} catch (error) {
				console.error('[CategoriesPanel] Failed to refresh category favicon:', error);
			}
		}
	}

	const getCategoryDomains = (categoryName: string): string[] => {
		return Object.entries(domainCategories)
			.filter(([, cat]) => cat === categoryName)
			.map(([domain]) => domain);
	};

	return (
		<Box>
			<Typography variant="h4" fontWeight={900} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
				<ColorLensIcon color="primary" sx={{ fontSize: 32 }} />
				Categories
			</Typography>
			<Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
				Organize your websites into meaningful categories for better insights and limits.
			</Typography>
			
			{/* Add Category Form */}
			<Card elevation={2} sx={{ borderRadius: 3, mb: 4 }}>
				<CardContent sx={{ p: 3 }}>
					<Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
						<AddIcon color="primary" />
						Create New Category
					</Typography>
					<Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
						<TextField 
							label="Category Name" 
							placeholder="e.g., Social Media"
							value={form.name} 
							onChange={(e) => setForm({ ...form, name: e.target.value })}
							sx={{ minWidth: 200, flex: 1 }}
						/>
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
							<Typography variant="body2" fontWeight={600}>Color:</Typography>
							<input 
								type="color" 
								value={form.color} 
								onChange={(e) => setForm({ ...form, color: e.target.value })}
								style={{
									width: 50,
									height: 40,
									borderRadius: 8,
									border: `2px solid ${theme.palette.divider}`,
									cursor: 'pointer'
								}}
							/>
						</Box>
						<Button 
							variant="contained" 
							onClick={() => void addCategory()}
							disabled={!form.name.trim()}
							size="large"
							sx={{ borderRadius: 2, px: 3 }}
						>
							Create Category
						</Button>
					</Stack>
				</CardContent>
			</Card>

			{/* Categories List */}
			<Card elevation={1} sx={{ borderRadius: 3 }}>
				<CardContent sx={{ p: 3 }}>
					<Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
						<Typography variant="h6" fontWeight={700}>
							Your Categories ({cats.length})
						</Typography>
						<Button
							variant="outlined"
							startIcon={<WebIcon />}
							onClick={() => setAddDomainDialog(true)}
							sx={{ borderRadius: 2 }}
						>
							Add Website
						</Button>
					</Stack>
					
					{cats.length === 0 ? (
						<Box sx={{ 
						textAlign: 'center', 
						py: 6, 
						color: 'text.secondary',
						backgroundColor: theme.palette.background.paper,
						borderRadius: 2,
						border: `2px dashed ${theme.palette.divider}`
					}}>
							<Typography variant="body1" fontWeight={500}>
								No categories created yet
							</Typography>
							<Typography variant="body2">
								Create your first category above to get started
							</Typography>
						</Box>
					) : (
						<Stack spacing={1}>
							{cats.map((cat) => {
								const domains = getCategoryDomains(cat.name);
								return (
									<Accordion key={cat.name} sx={{ borderRadius: 2, '&:before': { display: 'none' } }}>
										<AccordionSummary expandIcon={<ExpandMoreIcon />}>
											<Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%', mr: 2 }}>
												<Stack direction="row" alignItems="center" gap={2}>
													<Box
														sx={{
															width: 20,
															height: 20,
															borderRadius: '50%',
															backgroundColor: cat.color,
															border: `2px solid ${theme.palette.background.paper}`,
															boxShadow: `0 0 0 1px ${theme.palette.action.selected}`
														}}
													/>
													<Typography fontWeight={700} sx={{ fontSize: '1.1rem' }}>
														{cat.name}
													</Typography>
													<Chip
														label={`${domains.length} sites`}
														size="small"
														sx={{
															backgroundColor: cat.color,
															color: theme.palette.getContrastText(cat.color),
															fontWeight: 600,
															fontSize: '0.75rem'
														}}
													/>
												</Stack>
												<IconButton
													size="small"
													onClick={(e) => {
														e.stopPropagation();
														deleteCategory(cat.name);
													}}
													sx={{ color: 'error.main' }}
												>
													<DeleteIcon fontSize="small" />
												</IconButton>
											</Stack>
										</AccordionSummary>
										<AccordionDetails>
											{domains.length === 0 ? (
												<Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
													No websites assigned to this category yet.
												</Typography>
											) : (
												<List dense>
													{domains.map((domain) => (
														<ListItem
															key={domain}
															secondaryAction={
																<IconButton
																	edge="end"
																	size="small"
																	onClick={() => removeDomainFromCategory(domain)}
																	sx={{ color: 'error.main' }}
																>
																	<DeleteIcon fontSize="small" />
																</IconButton>
															}
														>
															<ListItemText
																primary={domain}
																primaryTypographyProps={{ fontWeight: 500 }}
															/>
														</ListItem>
													))}
												</List>
											)}
										</AccordionDetails>
									</Accordion>
								);
							})}
						</Stack>
					)}
				</CardContent>
			</Card>

			{/* Add Domain Dialog */}
			<Dialog 
				open={addDomainDialog} 
				onClose={() => setAddDomainDialog(false)} 
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
				<DialogTitle>Add Website to Category</DialogTitle>
				<DialogContent>
					<Stack spacing={3} sx={{ mt: 1 }}>
						<TextField
							label="Website Domain"
							placeholder="facebook.com"
							value={newDomain}
							onChange={(e) => setNewDomain(e.target.value)}
							fullWidth
							helperText="Enter domain without http:// or www."
						/>
						<Autocomplete
							options={cats.map(c => c.name)}
							value={selectedCategory}
							onChange={(_, value) => setSelectedCategory(value || '')}
							renderInput={(params) => {
								const { InputLabelProps, InputProps, ...restParams } = params;
								return (
									<TextField
										{...restParams}
										label="Category"
										placeholder="Select a category"
										size="small"
										InputLabelProps={{
											...InputLabelProps,
											className: InputLabelProps?.className || ''
										}}
										InputProps={InputProps}
									/>
								);
							}}
							fullWidth
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setAddDomainDialog(false)}>Cancel</Button>
					<Button 
						onClick={() => void addDomainToCategory()} 
						variant="contained"
						disabled={!newDomain.trim() || !selectedCategory}
					>
						Add Website
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}