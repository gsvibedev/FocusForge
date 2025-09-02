/* eslint-disable no-console */
import { initializeUsageTracking } from './modules/usageTracking';
import { initializeBlockRulesEngine } from './modules/blocking';
import { initializeAlarms } from './modules/alarms';
import { initializeMessageRouter } from './modules/messaging';
import { cleanFaviconCache } from '../utils/favicon';
import { cleanCategoryFaviconCache } from '../utils/categoryFavicon';

// Boot sequence for background service worker
initializeUsageTracking();
initializeBlockRulesEngine();
initializeAlarms();
initializeMessageRouter();

// Keep service worker warm on install/update
chrome.runtime.onInstalled.addListener(() => {
	console.log('FocusForge installed');
	
	// Clean favicon caches periodically
	cleanFaviconCache().catch(err => console.error('[Favicon] Cache cleanup failed:', err));
	cleanCategoryFaviconCache().catch(err => console.error('[CategoryFavicon] Cache cleanup failed:', err));
});

// Schedule periodic cache cleanup
chrome.alarms.create('favicon-cache-cleanup', { periodInMinutes: 60 * 24 }); // Daily cleanup

chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === 'favicon-cache-cleanup') {
		cleanFaviconCache().catch(err => console.error('[Favicon] Scheduled cache cleanup failed:', err));
		cleanCategoryFaviconCache().catch(err => console.error('[CategoryFavicon] Scheduled cache cleanup failed:', err));
	}
});




