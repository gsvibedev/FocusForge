import React from 'react';

interface AppData {
	limits: any[];
	categories: { name: string; color: string }[];
	domainCategories: Record<string, string>;
	gamificationState: any;
	usageData: {
		today: { key: string; seconds: number }[];
		week: { key: string; seconds: number }[];
		month: { key: string; seconds: number }[];
	};
}

interface AppDataContext {
	data: AppData;
	loading: boolean;
	refresh: () => Promise<void>;
	refreshLimits: () => Promise<void>;
	refreshCategories: () => Promise<void>;
	refreshUsage: () => Promise<void>;
}

const AppDataContext = React.createContext<AppDataContext | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
	const [data, setData] = React.useState<AppData>({
		limits: [],
		categories: [],
		domainCategories: {},
		gamificationState: null,
		usageData: { today: [], week: [], month: [] }
	});
	const [loading, setLoading] = React.useState(true);

	const refreshLimits = React.useCallback(async () => {
		return new Promise<void>((resolve) => {
			chrome.runtime.sendMessage({ type: 'get-limits' }, (res) => {
				if (res?.ok) {
					setData(prev => ({ ...prev, limits: res.data }));
				}
				resolve();
			});
		});
	}, []);

	const refreshCategories = React.useCallback(async () => {
		const storage = await chrome.storage.local.get(['categories', 'domainCategories']);
		setData(prev => ({
			...prev,
			categories: storage['categories'] ?? [],
			domainCategories: storage['domainCategories'] ?? {}
		}));
	}, []);

	const refreshUsage = React.useCallback(async () => {
		const promises = [
			new Promise<{ key: string; seconds: number }[]>((resolve) => {
				chrome.runtime.sendMessage({ 
					type: 'get-usage-summary', 
					payload: { range: 'today', by: 'domain' } 
				}, (res) => resolve(res?.ok ? res.data : []));
			}),
			new Promise<{ key: string; seconds: number }[]>((resolve) => {
				chrome.runtime.sendMessage({ 
					type: 'get-usage-summary', 
					payload: { range: 'week', by: 'date' } 
				}, (res) => resolve(res?.ok ? res.data : []));
			}),
			new Promise<{ key: string; seconds: number }[]>((resolve) => {
				chrome.runtime.sendMessage({ 
					type: 'get-usage-summary', 
					payload: { range: 'month', by: 'date' } 
				}, (res) => resolve(res?.ok ? res.data : []));
			})
		];

		const [today, week, month] = await Promise.all(promises);
		setData(prev => ({
			...prev,
			usageData: { today, week, month }
		}));
	}, []);

	const refreshGamification = React.useCallback(async () => {
		return new Promise<void>((resolve) => {
			chrome.runtime.sendMessage({ type: 'eval-gamification' }, (res) => {
				if (res?.ok) {
					setData(prev => ({ ...prev, gamificationState: res.data }));
				}
				resolve();
			});
		});
	}, []);

	const refresh = React.useCallback(async () => {
		setLoading(true);
		await Promise.all([
			refreshLimits(),
			refreshCategories(),
			refreshUsage(),
			refreshGamification()
		]);
		setLoading(false);
	}, [refreshLimits, refreshCategories, refreshUsage, refreshGamification]);

	React.useEffect(() => {
		refresh();
	}, [refresh]);

	const value: AppDataContext = {
		data,
		loading,
		refresh,
		refreshLimits,
		refreshCategories,
		refreshUsage
	};

	return (
		<AppDataContext.Provider value={value}>
			{children}
		</AppDataContext.Provider>
	);
}

export function useAppData(): AppDataContext {
	const context = React.useContext(AppDataContext);
	if (!context) {
		throw new Error('useAppData must be used within AppDataProvider');
	}
	return context;
}
