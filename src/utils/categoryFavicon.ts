/**
 * AI-powered category favicon selection for FocusForge extension
 * Automatically selects the most representative favicon for categories
 */

import { getFaviconUrl } from './favicon';

export interface CategoryFaviconCache {
	[categoryName: string]: {
		representativeDomain: string;
		faviconUrl: string;
		timestamp: number;
		memberDomains: string[]; // To detect when members change
	};
}

const CATEGORY_FAVICON_CACHE_KEY = 'category_favicon_cache';
const CATEGORY_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * AI-powered analysis to find the most representative domain for a category
 */
const findRepresentativeDomain = async (categoryName: string, domains: string[]): Promise<string> => {
	if (domains.length === 0) {
		throw new Error('No domains provided for category');
	}

	if (domains.length === 1) {
		return domains[0];
	}

	try {
		// Check if browser AI is available
		if (typeof window !== 'undefined' && (window as any).ai?.languageModel) {
			const session = await (window as any).ai.languageModel.create({
				temperature: 0.1,
				topK: 1
			});

			const prompt = `
Given the category "${categoryName}" and these website domains: ${domains.join(', ')}.

Which domain is most representative and well-known for this category? Consider:
- Brand recognition and popularity
- How well the domain represents the category concept
- User familiarity and trust

Respond with only the domain name, nothing else.
			`.trim();

			const response = await session.prompt(prompt);
			const suggestedDomain = response.trim().toLowerCase();
			
			session.destroy();

			// Verify the AI's choice is in our domain list
			const matchedDomain = domains.find(domain => 
				domain.toLowerCase().includes(suggestedDomain) || 
				suggestedDomain.includes(domain.toLowerCase())
			);

			if (matchedDomain) {
				return matchedDomain;
			}
		}
	} catch (error) {
		console.debug('[CategoryFavicon] AI analysis failed, using fallback logic:', error);
	}

	// Fallback: Rule-based selection for common categories
	const categoryLower = categoryName.toLowerCase();
	
	// Social Media category
	if (categoryLower.includes('social')) {
		const socialPriority = ['facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com', 'tiktok.com'];
		for (const priority of socialPriority) {
			const match = domains.find(d => d.includes(priority.replace('.com', '')));
			if (match) return match;
		}
	}
	
	// Entertainment category
	if (categoryLower.includes('entertainment') || categoryLower.includes('video') || categoryLower.includes('streaming')) {
		const entertainmentPriority = ['youtube.com', 'netflix.com', 'twitch.tv', 'hulu.com', 'spotify.com'];
		for (const priority of entertainmentPriority) {
			const match = domains.find(d => d.includes(priority.replace('.com', '').replace('.tv', '')));
			if (match) return match;
		}
	}
	
	// News category
	if (categoryLower.includes('news')) {
		const newsPriority = ['cnn.com', 'bbc.com', 'nytimes.com', 'reuters.com', 'bloomberg.com'];
		for (const priority of newsPriority) {
			const match = domains.find(d => d.includes(priority.replace('.com', '')));
			if (match) return match;
		}
	}
	
	// Work/Productivity category
	if (categoryLower.includes('work') || categoryLower.includes('productivity')) {
		const workPriority = ['google.com', 'microsoft.com', 'slack.com', 'notion.so', 'github.com'];
		for (const priority of workPriority) {
			const match = domains.find(d => d.includes(priority.replace('.com', '').replace('.so', '')));
			if (match) return match;
		}
	}
	
	// Shopping category
	if (categoryLower.includes('shopping') || categoryLower.includes('ecommerce')) {
		const shoppingPriority = ['amazon.com', 'ebay.com', 'shopify.com', 'etsy.com'];
		for (const priority of shoppingPriority) {
			const match = domains.find(d => d.includes(priority.replace('.com', '')));
			if (match) return match;
		}
	}
	
	// Education category
	if (categoryLower.includes('education') || categoryLower.includes('learning')) {
		const educationPriority = ['khan', 'coursera', 'udemy', 'edx', 'wikipedia'];
		for (const priority of educationPriority) {
			const match = domains.find(d => d.includes(priority));
			if (match) return match;
		}
	}

	// Default fallback: choose the most "mainstream" looking domain
	const sortedDomains = [...domains].sort((a, b) => {
		// Prefer shorter, more recognizable domains
		const scoreA = getDomainScore(a);
		const scoreB = getDomainScore(b);
		return scoreB - scoreA;
	});

	return sortedDomains[0];
};

/**
 * Score domains for representativeness (higher is better)
 */
const getDomainScore = (domain: string): number => {
	let score = 0;
	
	// Prefer shorter domains
	score += Math.max(0, 20 - domain.length);
	
	// Prefer .com domains
	if (domain.endsWith('.com')) score += 10;
	
	// Penalize subdomains
	if (domain.split('.').length > 2) score -= 5;
	
	// Prefer well-known TLDs
	const wellKnownTlds = ['.com', '.org', '.net', '.edu', '.gov'];
	if (wellKnownTlds.some(tld => domain.endsWith(tld))) score += 5;
	
	// Boost popular domains
	const popularDomains = [
		'google', 'facebook', 'youtube', 'amazon', 'twitter', 'instagram',
		'linkedin', 'netflix', 'microsoft', 'apple', 'github', 'stackoverflow'
	];
	if (popularDomains.some(popular => domain.includes(popular))) score += 15;
	
	return score;
};

/**
 * Get domains that belong to a specific category
 */
const getDomainsForCategory = async (categoryName: string): Promise<string[]> => {
	try {
		const storage = await chrome.storage.local.get('domainCategories');
		const domainCategories = storage.domainCategories || {};
		
		const domains: string[] = [];
		for (const [domain, category] of Object.entries(domainCategories)) {
			if (category === categoryName) {
				domains.push(domain);
			}
		}
		
		return domains;
	} catch (error) {
		console.error('[CategoryFavicon] Error getting domains for category:', error);
		return [];
	}
};

/**
 * Get cached category favicons
 */
const getCachedCategoryFavicons = async (): Promise<CategoryFaviconCache> => {
	try {
		const result = await chrome.storage.local.get(CATEGORY_FAVICON_CACHE_KEY);
		return result[CATEGORY_FAVICON_CACHE_KEY] || {};
	} catch (error) {
		console.error('[CategoryFavicon] Error reading cache:', error);
		return {};
	}
};

/**
 * Cache a category favicon
 */
const cacheCategoryFavicon = async (
	categoryName: string, 
	representativeDomain: string, 
	faviconUrl: string,
	memberDomains: string[]
): Promise<void> => {
	try {
		const cache = await getCachedCategoryFavicons();
		cache[categoryName] = {
			representativeDomain,
			faviconUrl,
			timestamp: Date.now(),
			memberDomains: [...memberDomains]
		};
		
		await chrome.storage.local.set({ [CATEGORY_FAVICON_CACHE_KEY]: cache });
	} catch (error) {
		console.error('[CategoryFavicon] Error caching category favicon:', error);
	}
};

/**
 * Check if category members have changed
 */
const haveCategoryMembersChanged = (cachedMembers: string[], currentMembers: string[]): boolean => {
	if (cachedMembers.length !== currentMembers.length) {
		return true;
	}
	
	const sortedCached = [...cachedMembers].sort();
	const sortedCurrent = [...currentMembers].sort();
	
	return sortedCached.some((member, index) => member !== sortedCurrent[index]);
};

/**
 * Get favicon URL for a category using AI-powered representative domain selection
 */
export const getCategoryFaviconUrl = async (categoryName: string): Promise<string> => {
	try {
		// Get current domains for this category
		const currentDomains = await getDomainsForCategory(categoryName);
		
		if (currentDomains.length === 0) {
			// No domains in category, create a category-specific fallback
			return createCategoryFallbackIcon(categoryName);
		}
		
		// Check cache
		const cache = await getCachedCategoryFavicons();
		const cached = cache[categoryName];
		
		const isExpired = cached && (Date.now() - cached.timestamp) > CATEGORY_CACHE_DURATION;
		const membersChanged = cached && haveCategoryMembersChanged(cached.memberDomains, currentDomains);
		
		if (cached && !isExpired && !membersChanged) {
			return cached.faviconUrl;
		}
		
		// Need to refresh: analyze domains and select representative one
		const representativeDomain = await findRepresentativeDomain(categoryName, currentDomains);
		const faviconUrl = await getFaviconUrl(representativeDomain);
		
		// Cache the result
		await cacheCategoryFavicon(categoryName, representativeDomain, faviconUrl, currentDomains);
		
		return faviconUrl;
		
	} catch (error) {
		console.error('[CategoryFavicon] Error getting category favicon:', error);
		return createCategoryFallbackIcon(categoryName);
	}
};

/**
 * Create a category-specific fallback icon
 */
const createCategoryFallbackIcon = (categoryName: string): string => {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	
	if (!ctx) {
		throw new Error('Canvas context not available');
	}
	
	const size = 32;
	canvas.width = size;
	canvas.height = size;
	
	// Category-specific color schemes
	const categoryColors: Record<string, { gradient: string[], icon: string }> = {
		'social media': { gradient: ['#4267B2', '#1DA1F2'], icon: '👥' },
		'social': { gradient: ['#4267B2', '#1DA1F2'], icon: '👥' },
		'entertainment': { gradient: ['#FF0000', '#FF6B6B'], icon: '🎬' },
		'news': { gradient: ['#1A1A1A', '#4A4A4A'], icon: '📰' },
		'work': { gradient: ['#0077B5', '#00A0DC'], icon: '💼' },
		'productivity': { gradient: ['#0077B5', '#00A0DC'], icon: '⚡' },
		'shopping': { gradient: ['#FF9500', '#FFB84D'], icon: '🛒' },
		'education': { gradient: ['#4CAF50', '#66BB6A'], icon: '📚' },
		'learning': { gradient: ['#4CAF50', '#66BB6A'], icon: '🎓' }
	};
	
	const categoryKey = categoryName.toLowerCase();
	const categoryConfig = categoryColors[categoryKey] || 
		categoryColors[Object.keys(categoryColors).find(key => categoryKey.includes(key)) || ''] ||
		{ gradient: ['#9C27B0', '#BA68C8'], icon: '📁' };
	
	// Create gradient background
	const gradient = ctx.createLinearGradient(0, 0, size, size);
	gradient.addColorStop(0, categoryConfig.gradient[0]);
	gradient.addColorStop(1, categoryConfig.gradient[1]);
	
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, size, size);
	
	// Add emoji icon
	ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(categoryConfig.icon, size / 2, size / 2);
	
	return canvas.toDataURL('image/png');
};

/**
 * Force refresh of a category's favicon (useful when members change)
 */
export const refreshCategoryFavicon = async (categoryName: string): Promise<string> => {
	try {
		// Clear cache for this category
		const cache = await getCachedCategoryFavicons();
		delete cache[categoryName];
		await chrome.storage.local.set({ [CATEGORY_FAVICON_CACHE_KEY]: cache });
		
		// Get fresh favicon
		return await getCategoryFaviconUrl(categoryName);
	} catch (error) {
		console.error('[CategoryFavicon] Error refreshing category favicon:', error);
		return createCategoryFallbackIcon(categoryName);
	}
};

/**
 * Clean old category favicon cache entries
 */
export const cleanCategoryFaviconCache = async (): Promise<void> => {
	try {
		const cache = await getCachedCategoryFavicons();
		const now = Date.now();
		const cleanedCache: CategoryFaviconCache = {};
		
		for (const [categoryName, entry] of Object.entries(cache)) {
			if ((now - entry.timestamp) < CATEGORY_CACHE_DURATION) {
				cleanedCache[categoryName] = entry;
			}
		}
		
		await chrome.storage.local.set({ [CATEGORY_FAVICON_CACHE_KEY]: cleanedCache });
	} catch (error) {
		console.error('[CategoryFavicon] Error cleaning cache:', error);
	}
};


