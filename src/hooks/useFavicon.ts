/**
 * React hook for managing favicons in FocusForge extension
 * Handles both domain favicons and AI-powered category favicons
 */

import { useState, useEffect, useCallback } from 'react';
import { getFaviconUrl } from '../utils/favicon';
import { getCategoryFaviconUrl, refreshCategoryFavicon } from '../utils/categoryFavicon';

export interface UseFaviconReturn {
	faviconUrl: string | null;
	isLoading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
}

/**
 * Hook for getting favicon URL for a domain
 */
export const useFavicon = (domain: string): UseFaviconReturn => {
	const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadFavicon = useCallback(async () => {
		if (!domain) {
			setFaviconUrl(null);
			setIsLoading(false);
			return;
		}

		try {
			setIsLoading(true);
			setError(null);
			
			const url = await getFaviconUrl(domain);
			setFaviconUrl(url);
		} catch (err) {
			console.error('[useFavicon] Error loading favicon:', err);
			setError(err instanceof Error ? err.message : 'Unknown error');
			setFaviconUrl(null);
		} finally {
			setIsLoading(false);
		}
	}, [domain]);

	const refresh = useCallback(async () => {
		await loadFavicon();
	}, [loadFavicon]);

	useEffect(() => {
		loadFavicon();
	}, [loadFavicon]);

	return {
		faviconUrl,
		isLoading,
		error,
		refresh
	};
};

/**
 * Hook for getting favicon URL for a category using AI selection
 */
export const useCategoryFavicon = (categoryName: string): UseFaviconReturn => {
	const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadCategoryFavicon = useCallback(async () => {
		if (!categoryName) {
			setFaviconUrl(null);
			setIsLoading(false);
			return;
		}

		try {
			setIsLoading(true);
			setError(null);
			
			const url = await getCategoryFaviconUrl(categoryName);
			setFaviconUrl(url);
		} catch (err) {
			console.error('[useCategoryFavicon] Error loading category favicon:', err);
			setError(err instanceof Error ? err.message : 'Unknown error');
			setFaviconUrl(null);
		} finally {
			setIsLoading(false);
		}
	}, [categoryName]);

	const refresh = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);
			
			const url = await refreshCategoryFavicon(categoryName);
			setFaviconUrl(url);
		} catch (err) {
			console.error('[useCategoryFavicon] Error refreshing category favicon:', err);
			setError(err instanceof Error ? err.message : 'Unknown error');
		} finally {
			setIsLoading(false);
		}
	}, [categoryName]);

	useEffect(() => {
		loadCategoryFavicon();
	}, [loadCategoryFavicon]);

	return {
		faviconUrl,
		isLoading,
		error,
		refresh
	};
};

/**
 * Hook that automatically detects if the item is a category or domain and returns appropriate favicon
 */
export const useSmartFavicon = (
	name: string, 
	isCategory: boolean = false
): UseFaviconReturn => {
	const domainFavicon = useFavicon(isCategory ? '' : name);
	const categoryFavicon = useCategoryFavicon(isCategory ? name : '');

	return isCategory ? categoryFavicon : domainFavicon;
};


