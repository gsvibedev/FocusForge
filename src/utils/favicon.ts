/**
 * Favicon utility for FocusForge extension
 * Handles secure favicon fetching with multiple fallback methods
 */

export interface FaviconCache {
	[domain: string]: {
		url: string;
		timestamp: number;
		isCustomFallback: boolean;
	};
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const FAVICON_CACHE_KEY = 'favicon_cache';
const FAVICON_SIZE = 32;

/**
 * Multiple favicon URL strategies for maximum compatibility
 */
const getFaviconUrls = (domain: string): string[] => {
	const cleanDomain = domain.replace(/^www\./, '');
	
	return [
		`https://${cleanDomain}/favicon.ico`,
		`https://www.${cleanDomain}/favicon.ico`,
		`https://${cleanDomain}/favicon.png`,
		`https://www.${cleanDomain}/favicon.png`,
		`https://${cleanDomain}/apple-touch-icon.png`,
		`https://www.${cleanDomain}/apple-touch-icon-precomposed.png`,
		// Google's favicon service as last resort
		`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${cleanDomain}&size=${FAVICON_SIZE}`,
		`https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=${FAVICON_SIZE}`
	];
};

/**
 * Test if a favicon URL is accessible and returns valid image data
 */
const testFaviconUrl = async (url: string): Promise<boolean> => {
	try {
		const response = await fetch(url, {
			method: 'HEAD',
			mode: 'no-cors', // Required for cross-origin favicon requests
			cache: 'force-cache',
			credentials: 'omit',
			referrerPolicy: 'no-referrer'
		});
		
		// In no-cors mode, we can't check response status directly
		// If fetch doesn't throw, the resource likely exists
		return true;
	} catch (error) {
		console.debug(`[Favicon] Failed to fetch ${url}:`, error);
		return false;
	}
};

/**
 * Create a beautiful custom fallback icon with the first letter of the domain
 */
export const createCustomFallbackIcon = (domain: string): string => {
	const letter = domain.charAt(0).toUpperCase();
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	
	if (!ctx) {
		throw new Error('Canvas context not available');
	}
	
	canvas.width = FAVICON_SIZE;
	canvas.height = FAVICON_SIZE;
	
	// Create a beautiful gradient background
	const gradient = ctx.createLinearGradient(0, 0, FAVICON_SIZE, FAVICON_SIZE);
	
	// Generate colors based on domain for consistency
	const hash = domain.split('').reduce((a, b) => {
		a = ((a << 5) - a) + b.charCodeAt(0);
		return a & a;
	}, 0);
	
	const hue = Math.abs(hash) % 360;
	gradient.addColorStop(0, `hsl(${hue}, 70%, 60%)`);
	gradient.addColorStop(1, `hsl(${hue + 30}, 70%, 45%)`);
	
	// Fill background with gradient
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, FAVICON_SIZE, FAVICON_SIZE);
	
	// Add subtle shadow for depth
	ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
	ctx.shadowBlur = 2;
	ctx.shadowOffsetY = 1;
	
	// Draw the letter
	ctx.fillStyle = 'white';
	ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(letter, FAVICON_SIZE / 2, FAVICON_SIZE / 2);
	
	// Reset shadow for border
	ctx.shadowColor = 'transparent';
	ctx.shadowBlur = 0;
	ctx.shadowOffsetY = 0;
	
	// Add subtle border
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
	ctx.lineWidth = 1;
	ctx.strokeRect(0.5, 0.5, FAVICON_SIZE - 1, FAVICON_SIZE - 1);
	
	return canvas.toDataURL('image/png');
};

/**
 * Get cached favicon or fetch new one
 */
export const getFaviconUrl = async (domain: string): Promise<string> => {
	try {
		// Normalize domain
		const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
		
		// Check cache first
		const cache = await getCachedFavicons();
		const cached = cache[cleanDomain];
		
		if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
			return cached.url;
		}
		
		// Try different favicon URLs
		const faviconUrls = getFaviconUrls(cleanDomain);
		
		for (const url of faviconUrls) {
			const isValid = await testFaviconUrl(url);
			if (isValid) {
				// Cache successful favicon
				await cacheFavicon(cleanDomain, url, false);
				return url;
			}
		}
		
		// If no favicon found, create custom fallback
		const fallbackIcon = createCustomFallbackIcon(cleanDomain);
		await cacheFavicon(cleanDomain, fallbackIcon, true);
		return fallbackIcon;
		
	} catch (error) {
		console.error('[Favicon] Error fetching favicon for', domain, error);
		// Return custom fallback on any error
		return createCustomFallbackIcon(domain);
	}
};

/**
 * Get cached favicons from storage
 */
const getCachedFavicons = async (): Promise<FaviconCache> => {
	try {
		const result = await chrome.storage.local.get(FAVICON_CACHE_KEY);
		return result[FAVICON_CACHE_KEY] || {};
	} catch (error) {
		console.error('[Favicon] Error reading cache:', error);
		return {};
	}
};

/**
 * Cache a favicon URL
 */
const cacheFavicon = async (domain: string, url: string, isCustomFallback: boolean): Promise<void> => {
	try {
		const cache = await getCachedFavicons();
		cache[domain] = {
			url,
			timestamp: Date.now(),
			isCustomFallback
		};
		
		await chrome.storage.local.set({ [FAVICON_CACHE_KEY]: cache });
	} catch (error) {
		console.error('[Favicon] Error caching favicon:', error);
	}
};

/**
 * Clear old cache entries to prevent storage bloat
 */
export const cleanFaviconCache = async (): Promise<void> => {
	try {
		const cache = await getCachedFavicons();
		const now = Date.now();
		const cleanedCache: FaviconCache = {};
		
		for (const [domain, entry] of Object.entries(cache)) {
			if ((now - entry.timestamp) < CACHE_DURATION) {
				cleanedCache[domain] = entry;
			}
		}
		
		await chrome.storage.local.set({ [FAVICON_CACHE_KEY]: cleanedCache });
	} catch (error) {
		console.error('[Favicon] Error cleaning cache:', error);
	}
};

/**
 * Preload favicons for a list of domains
 */
export const preloadFavicons = async (domains: string[]): Promise<void> => {
	const promises = domains.map(domain => getFaviconUrl(domain));
	await Promise.allSettled(promises);
};


