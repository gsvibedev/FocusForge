import { normalizeDomain } from '../utils/time';

export interface TimeRule {
	id: string;
	name: string;
	enabled: boolean;
	schedule: {
		days: number[]; // 0 = Sunday, 1 = Monday, etc.
		startTime: string; // "HH:MM" format
		endTime: string; // "HH:MM" format
		timezone?: string; // User's timezone
	};
	targets: {
		type: 'domain' | 'category' | 'pattern';
		value: string;
		action: 'block' | 'limit';
		limitMinutes?: number; // for limit action
	}[];
	priority: number; // Higher number = higher priority
	createdAt: Date;
	updatedAt: Date;
}

export interface URLPattern {
	id: string;
	name: string;
	pattern: string; // Regex or glob pattern
	type: 'regex' | 'glob' | 'exact' | 'contains';
	enabled: boolean;
	action: 'block' | 'limit';
	limitMinutes?: number;
	description?: string;
	createdAt: Date;
}

export interface AdvancedLimit extends TimeRule {
	urlPatterns?: URLPattern[];
	conditions?: {
		maxDailyUsage?: number; // seconds
		maxWeeklyUsage?: number; // seconds
		breakInterval?: number; // minutes - require break after this much usage
		breakDuration?: number; // minutes - length of required break
	};
}

export class RulesEngine {
	private static readonly STORAGE_KEY = 'advancedRules';
	private static readonly PATTERNS_KEY = 'urlPatterns';

	static async getRules(): Promise<TimeRule[]> {
		const storage = await chrome.storage.local.get(this.STORAGE_KEY);
		return storage[this.STORAGE_KEY] || [];
	}

	static async saveRule(rule: TimeRule): Promise<void> {
		const rules = await this.getRules();
		const existingIndex = rules.findIndex(r => r.id === rule.id);
		
		if (existingIndex >= 0) {
			rules[existingIndex] = { ...rule, updatedAt: new Date() };
		} else {
			rules.push({ ...rule, createdAt: new Date(), updatedAt: new Date() });
		}
		
		await chrome.storage.local.set({ [this.STORAGE_KEY]: rules });
		await this.triggerRuleRebuild();
	}

	static async deleteRule(ruleId: string): Promise<void> {
		const rules = await this.getRules();
		const filtered = rules.filter(r => r.id !== ruleId);
		await chrome.storage.local.set({ [this.STORAGE_KEY]: filtered });
		await this.triggerRuleRebuild();
	}

	static async getURLPatterns(): Promise<URLPattern[]> {
		const storage = await chrome.storage.local.get(this.PATTERNS_KEY);
		return storage[this.PATTERNS_KEY] || [];
	}

	static async saveURLPattern(pattern: URLPattern): Promise<void> {
		const patterns = await this.getURLPatterns();
		const existingIndex = patterns.findIndex(p => p.id === pattern.id);
		
		if (existingIndex >= 0) {
			patterns[existingIndex] = pattern;
		} else {
			patterns.push({ ...pattern, createdAt: new Date() });
		}
		
		await chrome.storage.local.set({ [this.PATTERNS_KEY]: patterns });
		await this.triggerRuleRebuild();
	}

	static async deleteURLPattern(patternId: string): Promise<void> {
		const patterns = await this.getURLPatterns();
		const filtered = patterns.filter(p => p.id !== patternId);
		await chrome.storage.local.set({ [this.PATTERNS_KEY]: filtered });
		await this.triggerRuleRebuild();
	}

	static isTimeInRange(startTime: string, endTime: string, currentTime: Date = new Date()): boolean {
		const [startHour = 0, startMin = 0] = startTime.split(':').map(Number);
		const [endHour = 0, endMin = 0] = endTime.split(':').map(Number);
		
		const start = new Date(currentTime);
		start.setHours(startHour, startMin, 0, 0);
		
		const end = new Date(currentTime);
		end.setHours(endHour, endMin, 0, 0);
		
		// Handle overnight rules (e.g., 22:00 to 06:00)
		if (end < start) {
			// Check if current time is after start time today OR before end time tomorrow
			const nextDayEnd = new Date(end);
			nextDayEnd.setDate(nextDayEnd.getDate() + 1);
			return currentTime >= start || currentTime <= end;
		}
		
		return currentTime >= start && currentTime <= end;
	}

	static isDayActive(days: number[], currentTime: Date = new Date()): boolean {
		const currentDay = currentTime.getDay();
		return days.includes(currentDay);
	}

	static async getActiveRules(domain: string, currentTime: Date = new Date()): Promise<TimeRule[]> {
		const rules = await this.getRules();
		const activeRules: TimeRule[] = [];
		
		for (const rule of rules) {
			if (!rule.enabled) continue;
			if (!this.isDayActive(rule.schedule.days, currentTime)) continue;
			if (!this.isTimeInRange(rule.schedule.startTime, rule.schedule.endTime, currentTime)) continue;
			
			// Check if any target matches (async check)
			let hasMatchingTarget = false;
			for (const target of rule.targets) {
				if (await this.targetMatches(target, domain)) {
					hasMatchingTarget = true;
					break;
				}
			}
			
			if (hasMatchingTarget) {
				activeRules.push(rule);
			}
		}
		
		return activeRules.sort((a, b) => b.priority - a.priority); // Higher priority first
	}

	static async targetMatches(target: TimeRule['targets'][0], domain: string): Promise<boolean> {
		const normalizedDomain = normalizeDomain(domain);
		const normalizedTargetValue = normalizeDomain(target.value);
		
		switch (target.type) {
			case 'domain':
				return normalizedDomain === normalizedTargetValue || normalizedDomain.endsWith('.' + normalizedTargetValue);
			case 'category':
				return await this.matchesDomainCategory(normalizedDomain, target.value);
			case 'pattern':
				return this.matchesPattern(normalizedDomain, target.value);
			default:
				return false;
		}
	}

	static matchesPattern(domain: string, pattern: string): boolean {
		try {
			// Simple glob to regex conversion
			const regexPattern = pattern
				.replace(/\./g, '\\.')
				.replace(/\*/g, '.*')
				.replace(/\?/g, '.');
			const regex = new RegExp('^' + regexPattern + '$', 'i');
			return regex.test(domain);
		} catch {
			return false;
		}
	}

	static async shouldBlockDomain(domain: string, currentTime: Date = new Date()): Promise<{
		blocked: boolean;
		reason?: string;
		ruleName?: string;
		allowedTime?: number; // minutes remaining if limited
	}> {
		const activeRules = await this.getActiveRules(domain, currentTime);
		
		for (const rule of activeRules) {
			let matchingTarget = null;
			for (const target of rule.targets) {
				if (await this.targetMatches(target, domain)) {
					matchingTarget = target;
					break;
				}
			}
			if (!matchingTarget) continue;

			if (matchingTarget.action === 'block') {
				return {
					blocked: true,
					reason: `Blocked by scheduled rule: ${rule.name}`,
					ruleName: rule.name
				};
			}

			if (matchingTarget.action === 'limit' && matchingTarget.limitMinutes) {
				// Check current usage against limit
				// This would integrate with usage tracking
				return {
					blocked: false,
					allowedTime: matchingTarget.limitMinutes
				};
			}
		}

		// Check URL patterns (domain-only evaluation)
		const patterns = await this.getURLPatterns();
		for (const pattern of patterns.filter(p => p.enabled)) {
			if (this.matchesURLPattern(domain, pattern)) {
				if (pattern.action === 'block') {
					return {
						blocked: true,
						reason: `Blocked by URL pattern: ${pattern.name}`,
						ruleName: pattern.name
					};
				}
			}
		}

		return { blocked: false };
	}

	static matchesURLPattern(input: string, pattern: URLPattern): boolean {
		switch (pattern.type) {
			case 'exact':
				try {
					const u = new URL(input);
					const host = u.hostname.replace(/^www\./, '');
					const expected = pattern.pattern.replace(/^www\./, '');
					return host === expected;
				} catch {
					return input === pattern.pattern;
				}
			case 'contains':
				return input.includes(pattern.pattern);
			case 'glob':
				try {
					const regexPattern = pattern.pattern
						.replace(/\./g, '\\.')
						.replace(/\*/g, '.*')
						.replace(/\?/g, '.');
					const regex = new RegExp(regexPattern, 'i');
					return regex.test(input);
				} catch {
					return false;
				}
			case 'regex':
				try {
					const regex = new RegExp(pattern.pattern, 'i');
					return regex.test(input);
				} catch {
					return false;
				}
			default:
				return false;
		}
	}

	/**
	 * Evaluate a full URL against advanced rules and URL patterns.
	 * This uses the domain for domain/category rules and the full URL for pattern rules.
	 */
	static async shouldBlockUrl(url: string, currentTime: Date = new Date()): Promise<{
		blocked: boolean;
		reason?: string;
		ruleName?: string;
		allowedTime?: number;
	}> {
		let domain = '';
		try {
			const u = new URL(url);
			domain = normalizeDomain(u.hostname);
		} catch {
			// Fallback if not a full URL
			domain = url;
		}

		const scheduled = await this.shouldBlockDomain(domain, currentTime);
		if (scheduled.blocked) return scheduled;

		// URL pattern evaluation against full URL
		const patterns = await this.getURLPatterns();
		for (const pattern of patterns.filter(p => p.enabled)) {
			if (this.matchesURLPattern(url, pattern)) {
				if (pattern.action === 'block') {
					return {
						blocked: true,
						reason: `Blocked by URL pattern: ${pattern.name}`,
						ruleName: pattern.name
					};
				}
			}
		}

		return { blocked: false };
	}

	private static async triggerRuleRebuild(): Promise<void> {
		await chrome.storage.local.set({ 
			rulesRebuildTrigger: Date.now(),
			usageTick: Date.now() 
		});
	}

	static async getDomainCategory(domain: string): Promise<string> {
		// Get user's domain categories from storage
		const { domainCategories = {} } = await chrome.storage.local.get(['domainCategories']);
		
		// Check if domain has a user-assigned category
		if (domainCategories[domain]) {
			return domainCategories[domain];
		}
		
		// Fall back to hardcoded categories for common sites
		const categoryMap: { [key: string]: string[] } = {
			'Social': [
				'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com',
				'snapchat.com', 'linkedin.com', 'pinterest.com', 'reddit.com', 'discord.com',
				'whatsapp.com', 'telegram.org', 'mastodon.social', 'threads.net'
			],
			'Entertainment': [
				'youtube.com', 'netflix.com', 'hulu.com', 'disney.com', 'twitch.tv',
				'spotify.com', 'soundcloud.com', 'amazon.com/prime', 'hbo.com',
				'crunchyroll.com', 'funimation.com', 'paramount.com'
			],
			'News': [
				'cnn.com', 'bbc.com', 'reuters.com', 'ap.org', 'nytimes.com',
				'washingtonpost.com', 'wsj.com', 'theguardian.com', 'npr.org',
				'bloomberg.com', 'techcrunch.com', 'arstechnica.com'
			],
			'Shopping': [
				'amazon.com', 'ebay.com', 'walmart.com', 'target.com', 'bestbuy.com',
				'costco.com', 'alibaba.com', 'etsy.com', 'shopify.com', 'wayfair.com'
			],
			'Gaming': [
				'steam.com', 'epicgames.com', 'blizzard.com', 'riotgames.com',
				'minecraft.net', 'roblox.com', 'twitch.tv', 'ign.com', 'gamespot.com'
			],
			'Development': [
				'github.com', 'stackoverflow.com', 'gitlab.com', 'bitbucket.org',
				'codepen.io', 'jsfiddle.net', 'replit.com', 'codesandbox.io'
			]
		};
		
		for (const [category, domains] of Object.entries(categoryMap)) {
			for (const categoryDomain of domains) {
				if (domain === categoryDomain || domain.endsWith('.' + categoryDomain)) {
					return category;
				}
			}
		}
		
		return 'Other';
	}

	static async matchesDomainCategory(domain: string, targetCategory: string): Promise<boolean> {
		const domainCategory = await this.getDomainCategory(domain);
		return domainCategory === targetCategory;
	}

	// Preset configurations for common scenarios
	static getPresetConfigurations(): {
		name: string;
		description: string;
		rules: Omit<TimeRule, 'id' | 'createdAt' | 'updatedAt'>[];
	}[] {
		return [
			{
				name: "Work Hours Focus",
				description: "Block social media and entertainment during work hours",
				rules: [{
					name: "Workday Social Block",
					enabled: true,
					schedule: {
						days: [1, 2, 3, 4, 5], // Monday to Friday
						startTime: "09:00",
						endTime: "17:00"
					},
					targets: [
						{ type: 'category', value: 'Social', action: 'block' },
						{ type: 'category', value: 'Entertainment', action: 'block' }
					],
					priority: 10
				}]
			},
			{
				name: "Evening Wind Down",
				description: "Limit stimulating content before bedtime",
				rules: [{
					name: "Evening Limits",
					enabled: true,
					schedule: {
						days: [0, 1, 2, 3, 4, 5, 6], // Every day
						startTime: "21:00",
						endTime: "23:59"
					},
					targets: [
						{ type: 'category', value: 'Social', action: 'limit', limitMinutes: 30 },
						{ type: 'category', value: 'News', action: 'limit', limitMinutes: 15 }
					],
					priority: 8
				}]
			},
			{
				name: "Weekend Balance",
				description: "Moderate limits on weekends for digital wellness",
				rules: [{
					name: "Weekend Social Limit",
					enabled: true,
					schedule: {
						days: [0, 6], // Saturday and Sunday
						startTime: "10:00",
						endTime: "20:00"
					},
					targets: [
						{ type: 'category', value: 'Social', action: 'limit', limitMinutes: 120 }
					],
					priority: 5
				}]
			}
		];
	}
}