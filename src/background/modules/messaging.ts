/* eslint-disable no-console */
import { UsageStore } from '../../storage/usageStore';
import { LimitsStore } from '../../storage/limitsStore';
import { normalizeDomain, formatDateKey } from '../../utils/time';
import { GamificationStore } from '../../storage/gamificationStore';
import { checkAllDomainsForImmediateNotifications } from './usageTracking';

async function getDebugData() {
	const now = new Date();
	const todayKey = formatDateKey(now);

	try {
		// Get all usage data
		const allLogs = await UsageStore.getAllLogs();
		const todayLogs = allLogs.filter(log => log.dateKey === todayKey);

		// Get recent logs (last 7 days)
		const recentLogs = allLogs.filter(log => {
			const logDate = new Date(log.dateKey);
			const daysDiff = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
			return daysDiff <= 7 && daysDiff >= 0;
		});

		// Group by date
		const dateGroups = {};
		recentLogs.forEach(log => {
			if (!dateGroups[log.dateKey]) {
				dateGroups[log.dateKey] = { logs: [], totalTime: 0, domains: new Set() };
			}
			dateGroups[log.dateKey].logs.push(log);
			dateGroups[log.dateKey].totalTime += log.seconds;
			dateGroups[log.dateKey].domains.add(log.domain);
		});

		return {
			currentDate: now.toISOString(),
			todayKey,
			totalLogs: allLogs.length,
			todayLogs: todayLogs.length,
			recentLogs: recentLogs.length,
			dateGroups: Object.keys(dateGroups).sort().map(date => ({
				date,
				logCount: dateGroups[date].logs.length,
				totalTime: dateGroups[date].totalTime,
				totalMinutes: Math.round(dateGroups[date].totalTime / 60),
				domains: Array.from(dateGroups[date].domains),
				sampleLogs: dateGroups[date].logs.slice(0, 3)
			}))
		};
	} catch (error) {
		console.error('[Debug] Error getting debug data:', error);
		return { error: String(error) };
	}
}

export function initializeMessageRouter(): void {
	chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		(async () => {
			try {
				switch (message?.type) {
					case 'get-usage-summary': {
						console.log('[Messaging] get-usage-summary request:', message.payload);
						const summary = await UsageStore.getSummary(message.payload);
						console.log('[Messaging] get-usage-summary response:', summary);
						sendResponse({ ok: true, data: summary });
						break;
					}
					case 'get-usage-summary-for-date': {
						console.log('[Messaging] get-usage-summary-for-date request:', message.payload);
						const { date, by } = message.payload;
						// Parse YYYY-MM-DD as LOCAL midnight to avoid timezone shifts
						let targetDate: Date;
						if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
							const parts = date.split('-').map((n: string) => parseInt(n, 10));
							const y = parts[0] ?? 1970;
							const m = parts[1] ?? 1;
							const d = parts[2] ?? 1;
							targetDate = new Date(y, m - 1, d);
						} else {
							targetDate = new Date(date);
						}
						const summary = await UsageStore.getSummaryForDate(targetDate, by);
						console.log(`[Messaging] get-usage-summary-for-date response for ${date} by ${by}:`, summary);
						sendResponse({ ok: true, data: summary });
						break;
					}
					case 'get-usage-summary-for-range': {
						console.log('[Messaging] get-usage-summary-for-range request:', message.payload);
						const { startDate, endDate, by } = message.payload;
						// Parse YYYY-MM-DD as LOCAL midnight for both start and end
						const parseLocal = (v: any): Date => {
							if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
								const parts = v.split('-').map((n: string) => parseInt(n, 10));
								const y = parts[0] ?? 1970;
								const m = parts[1] ?? 1;
								const d = parts[2] ?? 1;
								return new Date(y, m - 1, d);
							}
							return new Date(v);
						};
						const start = parseLocal(startDate);
						const end = parseLocal(endDate);
						const summary = await UsageStore.getSummaryForRange(start, end, by);
						console.log('[Messaging] get-usage-summary-for-range response:', summary);
						sendResponse({ ok: true, data: summary });
						break;
					}
					case 'get-limits': {
						const limits = await LimitsStore.getAllLimits();
						sendResponse({ ok: true, data: limits });
						break;
					}
					case 'debug-blocked-domains': {
						const domains = await LimitsStore.getAllDomainsMarkedBlocked();
						console.log('[Debug] Domains currently marked blocked by limits:', domains);
						sendResponse({ ok: true, data: domains });
						break;
					}
					case 'get-usage-logs': {
						const logs = await UsageStore.getAllLogs();
						sendResponse({ ok: true, data: logs });
						break;
					}
					// Individual category export removed - use comprehensive export in Privacy & Data section
					case 'import-usage-logs': {
						try {
							const { logs } = message.payload;
							if (!Array.isArray(logs)) {
								sendResponse({ ok: false, error: 'Invalid logs data format' });
								break;
							}
							
							let importedCount = 0;
							for (const log of logs) {
								try {
									// Validate log structure
									if (log.domain && typeof log.seconds === 'number' && log.dateKey) {
										await UsageStore.appendUsage(log.domain, log.seconds, new Date(log.dateKey + 'T00:00:00.000Z'));
										importedCount++;
									}
								} catch (error) {
									console.warn('[Messaging] Failed to import log:', log, error);
								}
							}
							
							console.log(`[Messaging] Successfully imported ${importedCount}/${logs.length} usage logs`);
							sendResponse({ ok: true, data: { imported: importedCount, total: logs.length } });
						} catch (error) {
							console.error('[Messaging] Usage logs import failed:', error);
							sendResponse({ ok: false, error: 'Failed to import usage logs' });
						}
						break;
					}
					case 'clear-usage-logs': {
						try {
							await UsageStore.clearAll();
							console.log('[Messaging] All usage logs cleared');
							sendResponse({ ok: true });
						} catch (error) {
							console.error('[Messaging] Failed to clear usage logs:', error);
							sendResponse({ ok: false, error: 'Failed to clear usage logs' });
						}
						break;
					}
					case 'set-global-snooze': {
						await LimitsStore.setGlobalSnooze(message.payload?.minutes ?? 5);
						sendResponse({ ok: true });
						break;
					}
					case 'cancel-snooze': {
						await chrome.storage.local.remove('blockSnoozeUntil');
						await chrome.storage.local.set({ usageTick: Date.now() }); // Trigger rule rebuild
						sendResponse({ ok: true });
						break;
					}
					case 'get-limit-history': {
						const history = await LimitsStore.getLimitHistory();
						sendResponse({ ok: true, data: history });
						break;
					}
					case 'eval-gamification': {
						const result = await GamificationStore.evaluateAndAward();
						sendResponse({ ok: true, data: result });
						break;
					}
					case 'mark-modal-shown': {
						await GamificationStore.markModalShown();
						sendResponse({ ok: true });
						break;
					}
					case 'apply-recommended-limits': {
						await GamificationStore.applyRecommendedLimits(message.payload);
						sendResponse({ ok: true });
						break;
					}
					case 'set-limit': {
						// Normalize incoming payload for consistency
						const incoming = message.payload ?? {};
						const targetType = incoming.targetType;
						const timeframe = incoming.timeframe;
						let targetId = String(incoming.targetId ?? '').trim();
						let displayName = String(incoming.displayName ?? targetId);
						if (targetType === 'site') {
							targetId = normalizeDomain(targetId);
							displayName = targetId;
						}
						const id = `${targetType}:${targetId}:${timeframe}`;
						const normalizedPayload = { 
							...incoming, 
							id,
							targetId,
							displayName
						};
						// Deduplicate: remove any existing limit with equivalent key but different ID
						try {
							const existing = await LimitsStore.getAllLimits();
							for (const l of existing) {
								const sameKey = l.targetType === targetType && l.timeframe === timeframe && (
									l.targetType === 'site' ? normalizeDomain(l.targetId) === targetId : l.targetId === targetId
								);
								if (sameKey && l.id !== id) {
									await LimitsStore.deleteLimit(l.id);
								}
							}
						} catch (e) {
							console.warn('[Messaging] Dedup during set-limit failed:', e);
						}
						await LimitsStore.upsertLimit(normalizedPayload);
						// Trigger immediate rule rebuild
						await chrome.storage.local.set({ usageTick: Date.now() });
						// Check for immediate notifications for newly added limits
						void checkAllDomainsForImmediateNotifications();
						sendResponse({ ok: true });
						break;
					}
					case 'delete-limit': {
						await LimitsStore.deleteLimit(message.payload.id);
						// Trigger immediate rule rebuild
						await chrome.storage.local.set({ usageTick: Date.now() });
						sendResponse({ ok: true });
						break;
					}
					case 'force-rule-rebuild': {
						// Debug function to manually trigger rule rebuild
						await chrome.storage.local.set({ forceRuleRebuild: Date.now() });
						sendResponse({ ok: true });
						break;
					}
					case 'force-immediate-commit': {
						// Force immediate commit of any pending usage data
						const { commitPendingUsage } = await import('../modules/usageTracking');
						await commitPendingUsage();
						sendResponse({ ok: true });
						break;
					}
					case 'force-data-refresh': {
						// Force rebuild of all data and rule caches
						console.log('[Messaging] Forcing complete data refresh...');

						// Commit any pending usage data
						const { commitPendingUsage } = await import('../modules/usageTracking');
						await commitPendingUsage();

						// Trigger storage change to rebuild rules
						await chrome.storage.local.set({ forceRuleRebuild: Date.now() });

						// Get fresh debug data
						const debugData = await getDebugData();

						sendResponse({ ok: true, data: debugData });
						break;
					}
					case 'debug-storage': {
						// Debug function to check storage contents
						const storage = await chrome.storage.local.get(null);
						console.log('[Debug] Full storage contents:', storage);
						sendResponse({ ok: true, data: storage });
						break;
					}
					case 'debug-tracking-state': {
						// Debug function to check current tracking state
						const { getTrackingState } = await import('../modules/usageTracking');
						const state = getTrackingState();
						console.log('[Debug] Current tracking state:', state);
						sendResponse({ ok: true, data: state });
						break;
					}
					
					case 'debug-todays-data': {
						try {
							// Return all usage data for today for debugging
							const { UsageStore } = await import('../../storage/usageStore');
							const today = new Date();
							const allLogs = await UsageStore.getAllLogs();
							const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
							const todayLogs = allLogs.filter(log => log.dateKey === todayKey);
							const result = {
								todayKey,
								todayLogs,
								totalEntries: todayLogs.length,
								domains: [...new Set(todayLogs.map(log => log.domain))],
								totalTimeByDomain: todayLogs.reduce((acc, log) => {
									acc[log.domain] = (acc[log.domain] || 0) + log.seconds;
									return acc;
								}, {} as Record<string, number>)
							};
							console.log('[Debug] Today\'s usage data:', result);
							sendResponse({ ok: true, data: result });
						} catch (error) {
							console.error('[Debug] Error getting today\'s data:', error);
							const msg = error instanceof Error ? error.message : String(error);
							sendResponse({ ok: false, error: msg });
						}
						break;
					}
					case 'notify': {
						const { title, message: body } = message.payload ?? {};
						if (chrome.notifications) {
							chrome.notifications.create({
								type: 'basic', iconUrl: 'src/icons/icon128.png', title: title ?? 'FocusForge', message: body ?? ''
							});
						}
						sendResponse({ ok: true });
						break;
					}
					default:
						sendResponse({ ok: false, error: 'unknown-message' });
				}
			} catch (error) {
				console.error('Message handling error', error);
				sendResponse({ ok: false, error: String(error) });
			}
		})();
		return true; // async
	});
}


