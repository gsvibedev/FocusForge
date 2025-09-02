import React from 'react';
import { 
	Box, 
	Typography, 
	Stack, 
	IconButton, 
	Card, 
	CardContent, 
	Chip, 
	TextField, 
	Button, 
	MenuItem, 
	LinearProgress, 
	Avatar,
	Tooltip,
	Fade,
	Zoom,
	Paper,
	Grid,
	GlobalStyles
} from '@mui/material';
import {
	ArrowBack as ArrowBackIcon,
	TrendingUp as TrendingUpIcon,
	Add as AddIcon,
	AccessTime as TimeIcon,
	Block as BlockIcon,
	Check as CheckIcon,
	Close as CloseIcon,
	// Download icon removed - export now in Quick Settings
	Category as CategoryIcon,
	Timeline as TimelineIcon,
	BarChart as BarChartIcon,
	PieChart as PieChartIcon,
	Settings as SettingsIcon,
	Visibility as VisibilityIcon,
	Web as WebIcon
} from '@mui/icons-material';
import CleanPieChart from '../../components/CleanPieChart';
import { formatDurationSeconds } from '../../utils/format';
import EnhancedBarChart from '../../components/EnhancedBarChart';
import { useTheme } from '../../contexts/ThemeContext';
import { stringToColor } from '../../utils/colors';
import { formatDateKey, normalizeDomain } from '../../utils/time';
import FaviconAvatar from '../../components/FaviconAvatar';
import { refreshCategoryFavicon } from '../../utils/categoryFavicon';

interface Props {
    domain: string;
    onBack: () => void;
    onSelectDomain?: (domain: string) => void;
}

type SummaryRow = { key: string; seconds: number };

type ViewMode = 'overview' | 'trends' | 'patterns' | 'limits' | 'category';

export default function SiteDetailView({ domain, onBack, onSelectDomain }: Props): React.ReactElement {
    const { theme } = useTheme();
    const [today, setToday] = React.useState<number>(0);
    const [week, setWeek] = React.useState<number>(0);
    const [month, setMonth] = React.useState<number>(0);
    const [allTime, setAllTime] = React.useState<number>(0);
    const [category, setCategory] = React.useState<string>('');
    const [limits, setLimits] = React.useState<any[]>([]);
    const [newLimitMinutes, setNewLimitMinutes] = React.useState<number>(30);
    const [categories, setCategories] = React.useState<Array<{ name: string; color: string }>>([]);
    const [trendData, setTrendData] = React.useState<Array<{ key: string; seconds: number }>>([]);
    const [dowDistribution, setDowDistribution] = React.useState<Record<string, number>>({});
    const [peerSummary, setPeerSummary] = React.useState<Array<{ key: string; seconds: number }>>([]);
    const [viewMode, setViewMode] = React.useState<ViewMode>('overview');
    const [loading, setLoading] = React.useState(true);
    const [categoryMembers, setCategoryMembers] = React.useState<string[]>([]);
    const [newDomainInput, setNewDomainInput] = React.useState('');
    const [isAddingDomain, setIsAddingDomain] = React.useState(false);

    // Normalized domain for consistent matching
    const normalizedDomain = React.useMemo(() => normalizeDomain(domain), [domain]);

    // Determine if this is a category or domain by checking if it exists in categories list
    const [isCategory, setIsCategory] = React.useState(false);
    const displayName = domain;
    const isBlocked = limits.some(l => l.isCurrentlyBlocked);

    // Function to load category members
    const loadCategoryMembers = React.useCallback(async () => {
        if (!isCategory) return;
        
        try {
            const storage = await chrome.storage.local.get('domainCategories');
            const domainCategories = storage.domainCategories || {};
            
            const members = Object.keys(domainCategories).filter(
                domainKey => domainCategories[domainKey] === domain
            );
            
            setCategoryMembers(members);
        } catch (error) {
            console.error('[SiteDetailView] Error loading category members:', error);
        }
    }, [isCategory, domain]);

    // Function to add domain to this category
    const addDomainToCategory = async () => {
        if (!newDomainInput.trim() || !isCategory) return;
        
        try {
            const cleanDomain = newDomainInput.trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
            const storage = await chrome.storage.local.get('domainCategories');
            const domainCategories = storage.domainCategories || {};
            
            domainCategories[cleanDomain] = domain;
            await chrome.storage.local.set({ domainCategories });
            
            // Refresh category favicon
            await refreshCategoryFavicon(domain);
            
            // Update local state
            setCategoryMembers(prev => [...prev, cleanDomain]);
            setNewDomainInput('');
            setIsAddingDomain(false);
        } catch (error) {
            console.error('[SiteDetailView] Error adding domain to category:', error);
        }
    };

    // Function to remove domain from this category
    const removeDomainFromCategory = async (domainToRemove: string) => {
        if (!isCategory) return;
        
        try {
            const storage = await chrome.storage.local.get('domainCategories');
            const domainCategories = storage.domainCategories || {};
            
            delete domainCategories[domainToRemove];
            await chrome.storage.local.set({ domainCategories });
            
            // Refresh category favicon
            await refreshCategoryFavicon(domain);
            
            // Update local state
            setCategoryMembers(prev => prev.filter(d => d !== domainToRemove));
        } catch (error) {
            console.error('[SiteDetailView] Error removing domain from category:', error);
        }
    };

    React.useEffect(() => {
        const load = async (): Promise<void> => {
            setLoading(true);
            // Flush any pending debounced usage so summaries include latest
            await new Promise<void>((resolve) => chrome.runtime.sendMessage({ type: 'force-immediate-commit' }, () => resolve()));
            
            // First check if this is a category
            const categoriesData = await chrome.storage.local.get('categories');
            const existingCategories = categoriesData['categories'] || [];
            const isCategoryItem = existingCategories.some((cat: any) => cat.name === domain);
            setIsCategory(isCategoryItem);
            
            // Fetch both domain and category summaries once
            const [todayByDomain, todayByCategory] = await Promise.all([
                new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'today', by: 'domain' } }, (r) => resolve(r))),
                new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'today', by: 'category' } }, (r) => resolve(r)))
            ]);
            const categoryHasKey = todayByCategory?.ok && (todayByCategory.data as SummaryRow[]).some((r) => r.key === domain);
            // Robust category detection: also check domainCategories mapping values
            const catsResEarly = await chrome.storage.local.get('domainCategories');
            const mappingValues: string[] = Object.values(catsResEarly['domainCategories'] || {});
            const isCategoryByMapping = mappingValues.includes(domain);
            let dataType: 'category' | 'domain' = (isCategoryItem || categoryHasKey || isCategoryByMapping) ? 'category' : 'domain';

            // Update isCategory state to match final dataType determination
            const finalIsCategory = dataType === 'category';
            setIsCategory(finalIsCategory);

            
            let [todayRes, weekRes, monthRes, allTimeRes, limitsRes, catsRes, catsList] = await Promise.all([
                Promise.resolve(dataType === 'domain' ? todayByDomain : todayByCategory),
                new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'week', by: dataType } }, (r) => resolve(r))),
                new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'month', by: dataType } }, (r) => resolve(r))),
                new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'all', by: dataType } }, (r) => resolve(r))),
                new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-limits' }, (r) => resolve(r))),
                chrome.storage.local.get('domainCategories'),
                chrome.storage.local.get('categories')
            ]);

            const pick = (res: any): number => {
                if (!res?.ok) {
                    return 0;
                }
                const rows = (res.data as SummaryRow[]);

                // For domains: aggregate using normalized base-domain matching (include subdomains and parent base)
                if (dataType === 'domain') {
                    let total = 0;
                    for (const r of rows) {
                        const keyNorm = normalizeDomain(r.key);
                        if (
                            keyNorm === normalizedDomain ||
                            keyNorm.endsWith(`.${normalizedDomain}`) ||
                            normalizedDomain.endsWith(`.${keyNorm}`)
                        ) {
                            total += r.seconds ?? 0;
                        }
                    }
                    return total;
                }

                // For categories: exact match on category key
                const row = rows.find((r) => r.key === domain);
                return row ? row.seconds : 0;
            };

            const todaySeconds = pick(todayRes);
            const weekSeconds = pick(weekRes);
            const monthSeconds = pick(monthRes);
            const allTimeSeconds = pick(allTimeRes);
            
            // Debug logs removed - tracking is now working
            
            setToday(todaySeconds);
            setWeek(weekSeconds);
            setMonth(monthSeconds);
            setAllTime(allTimeSeconds);
            if (finalIsCategory) {
                // For categories, filter limits by category
                setLimits((limitsRes?.ok ? limitsRes.data : []).filter((l: any) => l.targetType === 'category' && l.targetId === domain));
                setCategory(domain); // For categories, the domain parameter IS the category
                setCategories(catsList['categories'] ?? []);
                const catLimit = (limitsRes?.ok ? limitsRes.data : []).find((l: any) => l.targetType === 'category' && l.targetId === domain && l.timeframe === 'daily');
                if (catLimit) setCategoryLimitMinutes(catLimit.limitMinutes);
            } else {
                // For domains, use original logic
            setLimits((limitsRes?.ok ? limitsRes.data : []).filter((l: any) => {
                if (l.targetType === 'site') {
                    const targetBase = normalizeDomain(l.targetId);
                    return normalizedDomain === targetBase || normalizedDomain.endsWith(`.${targetBase}`);
                }
                if (l.targetType === 'category') {
                    return l.targetId === (catsRes['domainCategories']?.[domain] ?? '');
                }
                return false;
            }));
            const cat = catsRes['domainCategories']?.[domain] ?? '';
            setCategory(cat);
            setCategories(catsList['categories'] ?? []);
            if (cat) {
                const catLimit = (limitsRes?.ok ? limitsRes.data : []).find((l: any) => l.targetType === 'category' && l.targetId === cat && l.timeframe === 'daily');
                if (catLimit) setCategoryLimitMinutes(catLimit.limitMinutes);
                }
            }

            // Build daily trend using consistent UsageStore API calls
            // Generate daily data for last 14 days using the same API as overview
            const trendPromises = [];
            const now = new Date();
            
            for (let i = 13; i >= 0; i -= 1) {
                const targetDate = new Date(now);
                targetDate.setDate(now.getDate() - i);
                const promise = new Promise<{date: string, seconds: number}>((resolve) => {
                    // Use getSummaryForDate to get data for specific date with consistent category mapping
                    const requestedDateKey = formatDateKey(targetDate);
                    chrome.runtime.sendMessage({
                        type: 'get-usage-summary-for-date',
                        payload: { 
                            date: requestedDateKey,
                            by: dataType
                        }
                    }, (res) => {
                        const dateKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
                        let daySeconds = 0;
                        
                        if (res?.ok && Array.isArray(res.data)) {
                            // Aggregate by normalized domain matching for the day
                            let total = 0;
                            for (const r of res.data as SummaryRow[]) {
                                const keyNorm = normalizeDomain(r.key);
                                if (
                                    keyNorm === normalizedDomain ||
                                    keyNorm.endsWith(`.${normalizedDomain}`) ||
                                    normalizedDomain.endsWith(`.${keyNorm}`)
                                ) {
                                    total += r.seconds ?? 0;
                                }
                            }
                            daySeconds = total;
                        }
                        
                        resolve({ date: dateKey, seconds: daySeconds });
                    });
                });
                trendPromises.push(promise);
            }
            
            const trendResults = await Promise.all(trendPromises);
            let trendSeries = trendResults.map(r => ({ key: r.date, seconds: r.seconds }));
            
            // Trends data now loads correctly
            
            setTrendData(trendSeries);

            // Day of week patterns using consistent UsageStore API calls
            // Get daily data for last 30 days using the same API as trends
            const patternPromises = [];
            
            // Generate daily data for last 30 days using the same API as overview
            for (let i = 29; i >= 0; i -= 1) {
                const targetDate = new Date(now);
                targetDate.setDate(now.getDate() - i);
                const promise = new Promise<{date: Date, seconds: number}>((resolve) => {
                    const requestedDateKey = formatDateKey(targetDate);
                    chrome.runtime.sendMessage({
                        type: 'get-usage-summary-for-date',
                        payload: { 
                            date: requestedDateKey,
                            by: dataType
                        }
                    }, (res) => {
                        let daySeconds = 0;
                        
                        if (res?.ok && Array.isArray(res.data)) {
                            // Aggregate by normalized domain matching for the day
                            let total = 0;
                            for (const r of res.data as SummaryRow[]) {
                                const keyNorm = normalizeDomain(r.key);
                                if (
                                    keyNorm === normalizedDomain ||
                                    keyNorm.endsWith(`.${normalizedDomain}`) ||
                                    normalizedDomain.endsWith(`.${keyNorm}`)
                                ) {
                                    total += r.seconds ?? 0;
                                }
                            }
                            daySeconds = total;
                        }
                        
                        resolve({ date: targetDate, seconds: daySeconds });
                    });
                });
                patternPromises.push(promise);
            }
            
            const patternResults = await Promise.all(patternPromises);
            const dow: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
            
            // Map daily results to days of week
            for (const { date, seconds } of patternResults) {
                const dayIndex = date.getDay();
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const label = dayNames[dayIndex];
                if (label) {
                    dow[label] = (dow[label] ?? 0) + seconds;
                }
            }
            // Patterns data now loads correctly
            
            setDowDistribution(dow);

            // Category peers - only show for non-category items
            if (!isCategory) {
                const mapping = (await chrome.storage.local.get('domainCategories'))['domainCategories'] as Record<string, string> | undefined;
                const thisCat = mapping?.[domain] ?? '';
                if (thisCat) {
                    const weekDomainData = weekRes?.ok ? (weekRes.data as SummaryRow[]) : [];
                    const peers = weekDomainData.filter((r) => (mapping?.[r.key] ?? '') === thisCat);
                    setPeerSummary(peers.sort((a, b) => b.seconds - a.seconds).slice(0, 8));
                } else {
                    setPeerSummary([]);
                }
            } else {
                // For category view, show top domains in this category
                const allDomainsRes = await new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-usage-summary', payload: { range: 'week', by: 'domain' } }, (r) => resolve(r)));
                const allDomains = allDomainsRes?.ok ? (allDomainsRes.data as SummaryRow[]) : [];
                const domainCategories = catsRes['domainCategories'] || {};
                
                let domainsInCategory: SummaryRow[];
                if (domain === 'Other') {
                    // Special handling for 'Other' category: find domains NOT explicitly mapped
                    domainsInCategory = allDomains.filter((r) => !domainCategories[r.key]);
                } else {
                    // Regular categories: find domains explicitly mapped to this category
                    domainsInCategory = allDomains.filter((r) => (domainCategories[r.key] ?? '') === domain);
                }
                setPeerSummary(domainsInCategory.sort((a, b) => b.seconds - a.seconds).slice(0, 8));
            }

            setLoading(false);
        };
        void load();
    }, [domain]);

    // Load category members when isCategory state changes
    React.useEffect(() => {
        loadCategoryMembers();
    }, [loadCategoryMembers]);

    const timeLeftFor = (limit: any): number => {
        const used = limit.timeframe === 'daily' ? today : limit.timeframe === 'weekly' ? week : month;
        return Math.max(0, (limit.limitMinutes * 60) - used);
    };

    async function saveSiteLimit(): Promise<void> {
        const payload = {
            id: `site:${domain}:daily`,
            limitMinutes: newLimitMinutes,
            timeframe: 'daily' as const,
            targetType: 'site' as const,
            targetId: domain,
            displayName: domain
        };
        await new Promise((resolve) => chrome.runtime.sendMessage({ type: 'set-limit', payload }, () => resolve(undefined)));
        const limitsRes = await new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-limits' }, (r) => resolve(r)));
        setLimits(limitsRes?.ok ? limitsRes.data.filter((l: any) => {
            if (l.targetType === 'site') {
                const targetBase = normalizeDomain(l.targetId);
                return normalizedDomain === targetBase || normalizedDomain.endsWith(`.${targetBase}`);
            }
            if (l.targetType === 'category') {
                return l.targetId === category;
            }
            return false;
        }) : []);
        setIsEditingLimit(false);
    }

    async function changeCategory(next: string): Promise<void> {
        const mapping = (await chrome.storage.local.get('domainCategories'))['domainCategories'] as Record<string, string> | undefined;
        const updated = { ...(mapping ?? {}), [domain]: next };
        await chrome.storage.local.set({ domainCategories: updated });
        setCategory(next);
        const limitsRes = await new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: 'get-limits' }, (r) => resolve(r)));
        setLimits(limitsRes?.ok ? limitsRes.data.filter((l: any) => {
            if (l.targetType === 'site') {
                const targetBase = normalizeDomain(l.targetId);
                return normalizedDomain === targetBase || normalizedDomain.endsWith(`.${targetBase}`);
            }
            if (l.targetType === 'category') {
                return l.targetId === next;
            }
            return false;
        }) : []);
    }

    // Export functionality moved to Privacy & Data section for consistency

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <IconButton onClick={onBack} sx={{ mr: 1 }} aria-label="Go back">
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6">Loading...</Typography>
                </Box>
                <LinearProgress sx={{ borderRadius: 1 }} />
            </Box>
        );
    }

    return (
        <>
            <GlobalStyles styles={{
                '@keyframes shimmer': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' }
                }
            }} />
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Paper elevation={0} sx={{ 
                p: 2, 
                borderBottom: 1, 
                borderColor: 'divider',
                background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`
            }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <IconButton 
                        onClick={onBack} 
                        sx={{ 
                            backgroundColor: theme.palette.action.hover,
                            '&:hover': { backgroundColor: theme.palette.action.selected }
                        }}
                        aria-label="Go back"
                    >
                    <ArrowBackIcon />
                </IconButton>
                    
                    <FaviconAvatar
                        name={displayName}
                        isCategory={isCategory}
                        size={32}
                        elevation={1}
                        showTooltip={false}
                        animated={false}
                    />
                    
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem', mb: 0.5 }}>
                            {displayName}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                            {isCategory ? (
                                <Chip 
                                    icon={<CategoryIcon sx={{ fontSize: 14 }} />}
                                    label="Category" 
                                    size="small"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                            ) : (
                                category && (
                                    <Chip 
                                        icon={<CategoryIcon sx={{ fontSize: 14 }} />}
                                        label={category} 
                                        size="small"
                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                    />
                                )
                            )}
                            {isBlocked && (
                                <Chip 
                                    icon={<BlockIcon sx={{ fontSize: 14 }} />}
                                    label="Blocked" 
                                    size="small"
                                    color="error"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                            )}
                            <Chip 
                                label={`${formatDurationSeconds(today)} today`}
                                size="small"
                                sx={{ height: 20, fontSize: '0.7rem' }}
                            />
            </Stack>
                        </Box>

                    {/* Export functionality now available in Quick Settings */}
                </Stack>
            </Paper>

            {/* Navigation Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Stack direction="row" sx={{ px: 1 }}>
                    {[
                        { id: 'overview', label: 'Overview', icon: <VisibilityIcon sx={{ fontSize: 16 }} /> },
                        { id: 'trends', label: 'Trends', icon: <TimelineIcon sx={{ fontSize: 16 }} /> },
                        { id: 'patterns', label: 'Patterns', icon: <BarChartIcon sx={{ fontSize: 16 }} /> },
                        { id: 'limits', label: 'Limits', icon: <SettingsIcon sx={{ fontSize: 16 }} /> }
                    ].map((tab) => (
                        <Button
                            key={tab.id}
                            variant={viewMode === tab.id ? 'contained' : 'text'}
                            size="small"
                            startIcon={tab.icon}
                            onClick={() => setViewMode(tab.id as ViewMode)}
                            sx={{
                                minWidth: 'auto',
                                px: 1.5,
                                py: 1,
                                m: 0.5,
                                borderRadius: 2,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'none',
                                ...(viewMode === tab.id ? {
                                    backgroundColor: theme.palette.primary.main,
                                    color: theme.palette.primary.contrastText,
                                    '&:hover': {
                                        backgroundColor: theme.palette.primary.dark,
                                    }
                                } : {
                                    color: theme.palette.text.secondary,
                                    '&:hover': {
                                        backgroundColor: theme.palette.action.hover,
                                        color: theme.palette.text.primary
                                    }
                                })
                            }}
                        >
                            {tab.label}
                        </Button>
                    ))}
                </Stack>
                        </Box>

            {/* Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                <Fade in={true} key={viewMode}>
                        <Box>
                        {viewMode === 'overview' && (
                            <Stack spacing={3}>
                                {/* Stats Cards */}
                                <Box sx={{ 
                                    display: 'flex', 
                                    justifyContent: 'center',
                                    width: '100%' 
                                }}>
                                    <Grid container spacing={1.5} sx={{ 
                                        maxWidth: '100%',
                                        justifyContent: 'center',
                                        alignItems: 'stretch'
                                    }}>
                                        {[
                                            { label: 'Today', value: today, icon: <TimeIcon />, color: theme.palette.primary.main },
                                            { label: 'This Week', value: week, icon: <TrendingUpIcon />, color: theme.palette.success.main },
                                            { label: 'This Month', value: month, icon: <BarChartIcon />, color: theme.palette.warning.main },
                                            { label: 'All Time', value: allTime, icon: <PieChartIcon />, color: theme.palette.info.main }
                                        ].map((stat, index) => (
                                            <Grid item xs={6} key={stat.label} sx={{ 
                                                display: 'flex', 
                                                justifyContent: 'center',
                                                alignItems: 'stretch'
                                            }}>
                                                <Zoom in={true} style={{ transitionDelay: `${index * 100}ms` }}>
                                                    <Card elevation={0} sx={{ 
                                                        border: 1, 
                                                        borderColor: 'divider',
                                                        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${stat.color}10 100%)`,
                                                        width: '100%',
                                                        maxWidth: 140,
                                                        '&:hover': {
                                                            borderColor: stat.color,
                                                            transform: 'translateY(-2px)',
                                                            transition: 'all 0.2s ease'
                                                        }
                                                    }}>
                                                        <CardContent sx={{ p: 1.5 }}>
                                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                                <Avatar sx={{ 
                                                                    bgcolor: `${stat.color}20`, 
                                                                    color: stat.color,
                                                                    width: 28, 
                                                                    height: 28 
                                                                }}>
                                                                    {React.cloneElement(stat.icon, { sx: { fontSize: 14 } })}
                                                                </Avatar>
                                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                                    <Typography variant="caption" color="text.secondary" sx={{ 
                                                                        fontSize: '0.65rem',
                                                                        display: 'block',
                                                                        lineHeight: 1.2
                                                                    }}>
                                                                        {stat.label}
                                                                    </Typography>
                                                                    <Typography variant="h6" fontWeight={700} sx={{ 
                                                                        fontSize: '0.9rem', 
                                                                        lineHeight: 1.2,
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap'
                                                                    }}>
                                                                        {formatDurationSeconds(stat.value)}
                                                                    </Typography>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
                                                </Zoom>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>

                                {/* Category Members Management (only for categories) */}
                                {isCategory && (
                                    <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 3 }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                                                <Box>
                                                    <Typography variant="h6" fontWeight={700}>
                                                        Category Members
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Websites in this category ({categoryMembers.length})
                                                    </Typography>
                                                </Box>
                                                <Button
                                                    size="small"
                                                    startIcon={<AddIcon />}
                                                    onClick={() => setIsAddingDomain(true)}
                                                    sx={{ borderRadius: 2 }}
                                                >
                                                    Add Website
                                                </Button>
                                            </Stack>

                                            {/* Add domain form */}
                                            {isAddingDomain && (
                                                <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <TextField
                                                            size="small"
                                                            placeholder="e.g., example.com"
                                                            value={newDomainInput}
                                                            onChange={(e) => setNewDomainInput(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    addDomainToCategory();
                                                                } else if (e.key === 'Escape') {
                                                                    setIsAddingDomain(false);
                                                                    setNewDomainInput('');
                                                                }
                                                            }}
                                                            sx={{ flex: 1 }}
                                                            autoFocus
                                                        />
                                                        <IconButton
                                                            size="small"
                                                            onClick={addDomainToCategory}
                                                            disabled={!newDomainInput.trim()}
                                                            color="primary"
                                                        >
                                                            <CheckIcon />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => {
                                                                setIsAddingDomain(false);
                                                                setNewDomainInput('');
                                                            }}
                                                        >
                                                            <CloseIcon />
                                                        </IconButton>
                                                    </Stack>
                                                </Box>
                                            )}

                                            {/* Category members list */}
                                            {categoryMembers.length === 0 ? (
                                                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                                    <WebIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                                                    <Typography variant="body2">
                                                        No websites in this category yet
                                                    </Typography>
                                                    <Typography variant="caption">
                                                        Add websites to track them under this category
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Stack spacing={1}>
                                                    {categoryMembers.map((memberDomain) => (
                                                        <Box
                                                            key={memberDomain}
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                p: 1.5,
                                                                border: 1,
                                                                borderColor: 'divider',
                                                                borderRadius: 2,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease',
                                                                '&:hover': {
                                                                    bgcolor: 'action.hover',
                                                                    borderColor: 'primary.main',
                                                                    transform: 'translateX(4px)'
                                                                }
                                                            }}
                                                            onClick={() => {
                                                                // Navigate to the domain's individual page
                                                                if (onSelectDomain) {
                                                                    chrome.runtime.sendMessage({ type: 'force-immediate-commit' }, () => {
                                                                        onSelectDomain(memberDomain);
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                                                                <FaviconAvatar
                                                                    name={memberDomain}
                                                                    isCategory={false}
                                                                    size={24}
                                                                    showTooltip={false}
                                                                    animated={false}
                                                                />
                                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                    <Typography 
                                                                        variant="body2" 
                                                                        fontWeight={500}
                                                                        sx={{ 
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap'
                                                                        }}
                                                                    >
                                                                        {memberDomain}
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                            <Tooltip title={`Remove ${memberDomain} from category`}>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeDomainFromCategory(memberDomain);
                                                                    }}
                                                                    sx={{ 
                                                                        ml: 1,
                                                                        '&:hover': {
                                                                            color: 'error.main'
                                                                        }
                                                                    }}
                                                                >
                                                                    <CloseIcon sx={{ fontSize: 16 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    ))}
                                                </Stack>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                            </Stack>
                        )}

                        {viewMode === 'trends' && (
                            <Stack spacing={3}>
                                <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 3 }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                                            Daily Usage Trend
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>
                                            Last 14 days activity pattern
                                        </Typography>
                    {trendData.length === 0 ? (
                                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    No recent activity data available
                                                </Typography>
                                            </Box>
                    ) : (
                        <EnhancedBarChart data={trendData} title="" timeframe="week" />
                    )}
                </CardContent>
            </Card>
                            </Stack>
                        )}

                        {viewMode === 'patterns' && (
                            <Stack spacing={3}>
                                {/* Day of Week Patterns */}
                                <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                                            Weekly Usage Patterns
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>
                                            Usage distribution by day of week (last 30 days)
                                        </Typography>
                                        <Stack spacing={2}>
                        {Object.entries(dowDistribution).map(([label, secs]) => {
                            const total = Object.values(dowDistribution).reduce((s, v) => s + v, 0) || 1;
                            const pct = Math.round((secs / total) * 100);
                            return (
                                                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Typography variant="body2" fontWeight={600} sx={{ width: 40, fontSize: '0.8rem' }}>
                                                            {label}
                                                        </Typography>
                                    <Box sx={{ flex: 1 }}>
                                                            <LinearProgress 
                                                                variant="determinate" 
                                                                value={pct} 
                                                                sx={{ 
                                                                    height: 12, 
                                                                    borderRadius: 6,
                                                                    backgroundColor: theme.palette.action.hover,
                                                                    '& .MuiLinearProgress-bar': {
                                                                        borderRadius: 6,
                                                                        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`
                                                                    }
                                                                }} 
                                                            />
                                    </Box>
                                                        <Typography variant="caption" color="text.secondary" sx={{ width: 80, textAlign: 'right' }}>
                                                            {formatDurationSeconds(secs)}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ width: 35, textAlign: 'right' }}>
                                                            {pct}%
                                                        </Typography>
                                </Box>
                            );
                        })}
                    </Stack>
                </CardContent>
            </Card>

                                {/* Category/Domain Breakdown */}
                                {peerSummary.length > 0 && (
                                    <Card elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                                                {isCategory ? 'Top Domains in Category' : 'Category Comparison'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                                                {isCategory 
                                                    ? `Top domains contributing to ${category} usage this week`
                                                    : `Usage comparison with other sites in ${category}`
                                                }
                                            </Typography>
                        <CleanPieChart data={peerSummary} isCategory={false} />
                    </CardContent>
                </Card>
            )}
                            </Stack>
                        )}

                        {viewMode === 'limits' && (
                            <Stack spacing={2.5}>
                                {/* Hero Section */}
                                <Card elevation={0} sx={{
                                    borderRadius: 3,
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main}12 0%, ${theme.palette.secondary.main}08 50%, ${theme.palette.background.paper} 100%)`,
                                    border: `1px solid ${theme.palette.primary.main}20`,
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <Box sx={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        width: 80,
                                        height: 80,
                                        background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`,
                                        borderRadius: '0 0 0 100%',
                                        opacity: 0.6
                                    }} />
                                    <CardContent sx={{ p: 2.5, position: 'relative' }}>
                                        <Stack direction="row" alignItems="center" spacing={2}>
                                            <Avatar sx={{
                                                bgcolor: theme.palette.primary.main,
                                                width: 40,
                                                height: 40,
                                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                                boxShadow: `0 4px 12px ${theme.palette.primary.main}25`
                                            }}>
                                                <SettingsIcon sx={{ fontSize: 20 }} />
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.1rem', mb: 0.3 }}>
                                                    Focus Limits
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                                    Build better habits with smart time boundaries
                                                </Typography>
                                            </Box>
                                            {limits.length > 0 && (
                                                <Box sx={{ textAlign: 'right' }}>
                                                    <Typography variant="h5" fontWeight={800} color="primary.main">
                                                        {limits.length}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        active
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Stack>
                                    </CardContent>
                                </Card>

                                {/* Active Limits */}
                                {limits.length === 0 ? (
                                    <Card elevation={0} sx={{
                                        borderRadius: 3,
                                        border: `2px dashed ${theme.palette.divider}`,
                                        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`
                                    }}>
                                        <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                            <Box sx={{
                                                width: 64,
                                                height: 64,
                                                borderRadius: '50%',
                                                background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                mx: 'auto',
                                                mb: 2,
                                                border: `1px solid ${theme.palette.primary.main}20`
                                            }}>
                                                <Typography sx={{ fontSize: '1.8rem' }}>⏰</Typography>
                                            </Box>
                                            <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
                                                No Limits Set
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 240, mx: 'auto' }}>
                                                Create your first focus boundary to build healthier digital habits
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Stack spacing={2}>
                                        {limits.map((l, index) => {
                                            const usage = l.timeframe === 'daily' ? today : l.timeframe === 'weekly' ? week : month;
                                            const progressValue = Math.min((usage / (l.limitMinutes * 60)) * 100, 100);
                                            const remaining = timeLeftFor(l);
                                            const isNearLimit = progressValue > 80;
                                            const isOverLimit = l.isCurrentlyBlocked;
                                            
                                            const statusConfig = isOverLimit 
                                                ? { color: theme.palette.error.main, icon: '🚫', label: 'BLOCKED', bg: `${theme.palette.error.main}12` }
                                                : isNearLimit 
                                                ? { color: theme.palette.warning.main, icon: '⚠️', label: 'WARNING', bg: `${theme.palette.warning.main}12` }
                                                : { color: theme.palette.success.main, icon: '✓', label: 'ACTIVE', bg: `${theme.palette.success.main}08` };
                                            
                                            return (
                                                <Card key={l.id} elevation={0} sx={{
                                                    borderRadius: 3,
                                                    border: `2px solid ${statusConfig.color}25`,
                                                    background: `linear-gradient(135deg, ${statusConfig.bg} 0%, ${theme.palette.background.paper} 70%)`,
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    '&:hover': {
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: `0 8px 25px ${statusConfig.color}20`,
                                                        borderColor: `${statusConfig.color}40`
                                                    }
                                                }}>
                                                    {/* Status accent bar */}
                                                    <Box sx={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        right: 0,
                                                        height: 4,
                                                        background: `linear-gradient(90deg, ${statusConfig.color}, ${statusConfig.color}80)`,
                                                        borderRadius: '3px 3px 0 0'
                                                    }} />
                                                    
                                                    <CardContent sx={{ p: 2.5 }}>
                                                        <Stack spacing={2.5}>
                                                            {/* Header */}
                                                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                                                    <Box sx={{
                                                                        width: 36,
                                                                        height: 36,
                                                                        borderRadius: 2,
                                                                        background: `linear-gradient(135deg, ${statusConfig.color}20, ${statusConfig.color}10)`,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        border: `1px solid ${statusConfig.color}30`
                                                                    }}>
                                                                        <Typography sx={{ fontSize: '1.1rem' }}>{statusConfig.icon}</Typography>
                                                                    </Box>
                                                                    <Box>
                                                                        <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: '0.95rem' }}>
                                                                            {l.targetType === 'site' ? 'Website Limit' : 'Category Limit'}
                                                                        </Typography>
                                                                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                                                            {l.timeframe} • {Math.floor(l.limitMinutes / 60)}h {l.limitMinutes % 60}m
                                                                        </Typography>
                                                                    </Box>
                                                                </Stack>
                                                                <Chip 
                                                                    label={statusConfig.label}
                                                                    size="small"
                                                                    sx={{
                                                                        bgcolor: `${statusConfig.color}15`,
                                                                        color: statusConfig.color,
                                                                        border: `1px solid ${statusConfig.color}30`,
                                                                        fontWeight: 700,
                                                                        fontSize: '0.7rem',
                                                                        letterSpacing: 0.5,
                                                                        '& .MuiChip-label': { px: 1.5 }
                                                                    }}
                                                                />
                                                            </Stack>
                                                            
                                                            {/* Progress Section */}
                                                            <Box>
                                                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                                                        Usage Progress
                                                                    </Typography>
                                                                    <Stack direction="row" alignItems="center" spacing={2}>
                                                                        <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ fontSize: '0.8rem' }}>
                                                                            {formatDurationSeconds(usage)} / {Math.floor(l.limitMinutes / 60)}h {l.limitMinutes % 60}m
                                                                        </Typography>
                                                                        <Typography variant="caption" fontWeight={700} color={statusConfig.color}>
                                                                            {progressValue.toFixed(0)}%
                                                                        </Typography>
                                                                    </Stack>
                                                                </Stack>
                                                                
                                                                {/* Custom Progress Bar */}
                                                                <Box sx={{
                                                                    height: 10,
                                                                    borderRadius: 5,
                                                                    backgroundColor: `${statusConfig.color}15`,
                                                                    border: `1px solid ${statusConfig.color}25`,
                                                                    overflow: 'hidden',
                                                                    position: 'relative'
                                                                }}>
                                                                    <Box sx={{
                                                                        width: `${Math.min(progressValue, 100)}%`,
                                                                        height: '100%',
                                                                        background: `linear-gradient(90deg, ${statusConfig.color}, ${statusConfig.color}80)`,
                                                                        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                        position: 'relative',
                                                                        '&::after': progressValue > 5 ? {
                                                                            content: '""',
                                                                            position: 'absolute',
                                                                            top: 0,
                                                                            right: 0,
                                                                            width: '30%',
                                                                            height: '100%',
                                                                            background: `linear-gradient(90deg, transparent, ${theme.palette.background.paper}40)`,
                                                                            animation: 'shimmer 2s infinite'
                                                                        } : {}
                                                                    }} />
                                                                </Box>
                                                                
                                                                {/* Time Remaining */}
                                                                {remaining > 0 && (
                                                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                                                                        <Box sx={{
                                                                            width: 16,
                                                                            height: 16,
                                                                            borderRadius: '50%',
                                                                            background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.light})`,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center'
                                                                        }}>
                                                                            <Typography sx={{ fontSize: '0.6rem', color: 'white' }}>✓</Typography>
                                                                        </Box>
                                                                        <Typography variant="caption" color="success.main" fontWeight={600}>
                                                                            {formatDurationSeconds(remaining)} remaining today
                                                                        </Typography>
                                                                    </Stack>
                                                                )}
                                                            </Box>
                                                        </Stack>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </Stack>
                                )}

                                {/* Add New Limit */}
                                <Card elevation={0} sx={{
                                    borderRadius: 3,
                                    border: `2px dashed ${theme.palette.primary.main}30`,
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, ${theme.palette.secondary.main}05 50%, ${theme.palette.background.paper} 100%)`,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    '&:hover': {
                                        borderColor: `${theme.palette.primary.main}50`,
                                        transform: 'translateY(-1px)',
                                        boxShadow: `0 6px 20px ${theme.palette.primary.main}15`
                                    }
                                }}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Stack spacing={3}>
                                            {/* Header */}
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <Box sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 2.5,
                                                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: `0 4px 12px ${theme.palette.primary.main}25`,
                                                    position: 'relative',
                                                    '&::after': {
                                                        content: '""',
                                                        position: 'absolute',
                                                        inset: 0,
                                                        borderRadius: 2.5,
                                                        padding: 1,
                                                        background: `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.secondary.main})`,
                                                        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                                        maskComposite: 'exclude',
                                                        opacity: 0.7
                                                    }
                                                }}>
                                                    <AddIcon sx={{ fontSize: 18, color: 'white', position: 'relative', zIndex: 1 }} />
                                                </Box>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem', mb: 0.3 }}>
                                                        Create Focus Limit
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Set healthy boundaries for mindful usage
                                                    </Typography>
                                                </Box>
                                            </Stack>

                                            {/* Input Section */}
                                            <Box sx={{ 
                                                background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
                                                borderRadius: 2.5,
                                                p: 2.5,
                                                border: `1px solid ${theme.palette.divider}`
                                            }}>
                                                <Stack spacing={2.5}>
                                                    <Stack direction="row" alignItems="center" spacing={2}>
                                                        <Box sx={{
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: '50%',
                                                            background: `linear-gradient(135deg, ${theme.palette.info.main}20, ${theme.palette.info.main}10)`,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            border: `1px solid ${theme.palette.info.main}30`
                                                        }}>
                                                            <Typography sx={{ fontSize: '0.9rem' }}>⏱️</Typography>
                                                        </Box>
                                                        <Typography variant="body2" fontWeight={600} color="text.primary">
                                                            Daily Time Allowance
                                                        </Typography>
                                                    </Stack>
                                                    
                                                    <TextField
                                                        type="number"
                                                        label="Minutes per day"
                                                        value={newLimitMinutes}
                                                        onChange={(e) => setNewLimitMinutes(Number(e.target.value))}
                                                        size="small"
                                                        fullWidth
                                                        placeholder="e.g., 60 for 1 hour"
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': {
                                                                borderRadius: 2,
                                                                backgroundColor: theme.palette.background.paper,
                                                                transition: 'all 0.2s ease',
                                                                '&:hover': {
                                                                    '& .MuiOutlinedInput-notchedOutline': {
                                                                        borderColor: theme.palette.primary.main
                                                                    }
                                                                },
                                                                '&.Mui-focused': {
                                                                    '& .MuiOutlinedInput-notchedOutline': {
                                                                        borderColor: theme.palette.primary.main,
                                                                        borderWidth: 2
                                                                    }
                                                                }
                                                            },
                                                            // Center numeric text and improve legibility
                                                            '& input': {
                                                                textAlign: 'center',
                                                                fontWeight: 700
                                                            },
                                                            // Hide native number spinners (Chrome/Edge/Opera)
                                                            '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                                                                WebkitAppearance: 'none',
                                                                margin: 0
                                                            },
                                                            // Hide native number spinners (Firefox)
                                                            '& input[type=number]': {
                                                                MozAppearance: 'textfield'
                                                            },
                                                            '& .MuiInputLabel-root': {
                                                                backgroundColor: theme.palette.background.paper,
                                                                px: 1,
                                                                borderRadius: 1,
                                                                '&.Mui-focused': {
                                                                    color: theme.palette.primary.main
                                                                }
                                                            }
                                                        }}
                                                        helperText={newLimitMinutes > 0 ? `${Math.floor(newLimitMinutes / 60)}h ${newLimitMinutes % 60}m daily limit` : "Choose a reasonable daily time limit"}
                                                    />
                                                </Stack>
                                            </Box>

                                            {/* Quick Presets */}
                                            {newLimitMinutes === 0 && (
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                                                        💡 Quick presets:
                                                    </Typography>
                                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                                        {[30, 60, 120, 180].map((minutes) => (
                                                            <Chip
                                                                key={minutes}
                                                                label={`${Math.floor(minutes / 60)}h ${minutes % 60}m`}
                                                                size="small"
                                                                onClick={() => setNewLimitMinutes(minutes)}
                                                                sx={{
                                                                    cursor: 'pointer',
                                                                    borderRadius: 2,
                                                                    fontWeight: 600,
                                                                    fontSize: '0.75rem',
                                                                    transition: 'all 0.2s ease',
                                                                    bgcolor: `${theme.palette.primary.main}10`,
                                                                    border: `1px solid ${theme.palette.primary.main}20`,
                                                                    color: theme.palette.primary.main,
                                                                    '&:hover': {
                                                                        bgcolor: `${theme.palette.primary.main}20`,
                                                                        borderColor: theme.palette.primary.main,
                                                                        transform: 'translateY(-1px)',
                                                                        boxShadow: `0 3px 8px ${theme.palette.primary.main}25`
                                                                    }
                                                                }}
                                                            />
                                                        ))}
                                                    </Stack>
                                                </Box>
                                            )}

                                            {/* Action Button */}
                                            <Button
                                                variant="contained"
                                                onClick={saveSiteLimit}
                                                disabled={!newLimitMinutes || newLimitMinutes <= 0}
                                                startIcon={<AddIcon />}
                                                sx={{
                                                    borderRadius: 2.5,
                                                    fontWeight: 700,
                                                    fontSize: '0.9rem',
                                                    px: 3,
                                                    py: 1.5,
                                                    textTransform: 'none',
                                                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                                    boxShadow: `0 4px 12px ${theme.palette.primary.main}30`,
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    '&:hover': {
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: `0 8px 25px ${theme.palette.primary.main}40`,
                                                        background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`
                                                    },
                                                    '&:disabled': {
                                                        background: theme.palette.action.disabledBackground,
                                                        boxShadow: 'none',
                                                        transform: 'none'
                                                    }
                                                }}
                                            >
                                                {newLimitMinutes > 0 ? `Set ${Math.floor(newLimitMinutes / 60)}h ${newLimitMinutes % 60}m Limit` : 'Set Focus Limit'}
                                            </Button>
                                        </Stack>
                                    </CardContent>
                                </Card>

                                {/* Category Management */}
                                <Card elevation={0} sx={{
                                    borderRadius: 3,
                                    border: `1px solid ${theme.palette.divider}`,
                                    background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.action.hover} 100%)`,
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <Box sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: 60,
                                        height: 60,
                                        background: `linear-gradient(135deg, ${theme.palette.secondary.main}15, ${theme.palette.info.main}10)`,
                                        borderRadius: '0 0 100% 0',
                                        opacity: 0.8
                                    }} />
                                    <CardContent sx={{ p: 3, position: 'relative' }}>
                                        <Stack spacing={3}>
                                            {/* Header */}
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <Avatar sx={{
                                                    bgcolor: theme.palette.secondary.main,
                                                    width: 36,
                                                    height: 36,
                                                    background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`
                                                }}>
                                                    <CategoryIcon sx={{ fontSize: 18 }} />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem', mb: 0.3 }}>
                                                        Category Assignment
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Organize your digital spaces for better insights
                                                    </Typography>
                                                </Box>
                                            </Stack>

                                            {/* Current Category Display */}
                                            {category && (
                                                <Box sx={{
                                                    background: `linear-gradient(135deg, ${theme.palette.success.main}08, ${theme.palette.success.main}05)`,
                                                    border: `1px solid ${theme.palette.success.main}25`,
                                                    borderRadius: 2,
                                                    p: 2
                                                }}>
                                                    <Stack direction="row" alignItems="center" spacing={1.5}>
                                                        <Box sx={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: '50%',
                                                            background: categories.find(c => c.name === category)?.color || theme.palette.primary.main,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            boxShadow: `0 2px 8px ${categories.find(c => c.name === category)?.color || theme.palette.primary.main}40`
                                                        }}>
                                                            <CategoryIcon sx={{ fontSize: 14, color: 'white' }} />
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="body2" fontWeight={600} color="text.primary">
                                                                Currently in: {category}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Change category to reorganize
                                                            </Typography>
                                                        </Box>
                                                    </Stack>
                                                </Box>
                                            )}

                                            {/* Category Selection */}
                                            <TextField
                                                select
                                                label="Choose Category"
                                                value={category}
                                                onChange={(e) => void changeCategory(e.target.value)}
                                                size="small"
                                                fullWidth
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 2.5,
                                                        backgroundColor: theme.palette.background.paper,
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            '& .MuiOutlinedInput-notchedOutline': {
                                                                borderColor: theme.palette.secondary.main
                                                            }
                                                        },
                                                        '&.Mui-focused': {
                                                            '& .MuiOutlinedInput-notchedOutline': {
                                                                borderColor: theme.palette.secondary.main,
                                                                borderWidth: 2
                                                            }
                                                        }
                                                    },
                                                    '& .MuiInputLabel-root': {
                                                        backgroundColor: theme.palette.background.paper,
                                                        px: 1,
                                                        borderRadius: 1,
                                                        '&.Mui-focused': {
                                                            color: theme.palette.secondary.main
                                                        }
                                                    }
                                                }}
                                                helperText={category ? "Category successfully assigned" : "Select a category to organize this site"}
                                            >
                                                <MenuItem value="" sx={{ py: 1.5 }}>
                                                    <Stack direction="row" alignItems="center" spacing={1.5}>
                                                        <Box sx={{
                                                            width: 20,
                                                            height: 20,
                                                            borderRadius: '50%',
                                                            border: `2px dashed ${theme.palette.divider}`,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>∅</Typography>
                                                        </Box>
                                                        <Box>
                                                            <Typography variant="body2" fontWeight={500}>No Category</Typography>
                                                            <Typography variant="caption" color="text.secondary">Keep uncategorized</Typography>
                                                        </Box>
                                                    </Stack>
                                                </MenuItem>
                                                {categories.map((c) => (
                                                    <MenuItem key={c.name} value={c.name} sx={{ py: 1.5 }}>
                                                        <Stack direction="row" alignItems="center" spacing={1.5}>
                                                            <Box sx={{
                                                                width: 20,
                                                                height: 20,
                                                                borderRadius: '50%',
                                                                backgroundColor: c.color,
                                                                boxShadow: `0 2px 6px ${c.color}40`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}>
                                                                <CategoryIcon sx={{ fontSize: 12, color: 'white' }} />
                                                            </Box>
                                                            <Box>
                                                                <Typography variant="body2" fontWeight={500}>{c.name}</Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {c.name === 'Productivity' ? 'Work & professional tools' :
                                                                     c.name === 'Social' ? 'Social media & communication' :
                                                                     c.name === 'Entertainment' ? 'Games, videos & leisure' :
                                                                     c.name === 'News' ? 'News & information sites' :
                                                                     c.name === 'Shopping' ? 'E-commerce & shopping' :
                                                                     c.name === 'Education' ? 'Learning & educational content' :
                                                                     'General category'}
                                                                </Typography>
                                                            </Box>
                                                        </Stack>
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Stack>
            )}
                    </Box>
                </Fade>
            </Box>
        </Box>
        </>
    );
}