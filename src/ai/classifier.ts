declare global {
	interface Window {
		ai?: { prompt: (input: { text: string }) => Promise<{ text: string }> };
	}
}

const FALLBACK_RULES: Array<{ match: RegExp; category: string }> = [
	{ match: /(facebook|instagram|tiktok|x\.com|twitter|snapchat)/i, category: 'Social Media' },
	{ match: /(youtube|netflix|hulu|spotify|twitch)/i, category: 'Entertainment' },
	{ match: /(docs\.google|notion|slack|jira|asana|github|gitlab)/i, category: 'Work' },
	{ match: /(nytimes|cnn|bbc|bloomberg|reuters)/i, category: 'News' },
	{ match: /(amazon|ebay|shopify|etsy)/i, category: 'Shopping' },
	{ match: /(khanacademy|coursera|udemy|edx)/i, category: 'Education' }
];

export async function suggestCategory(domain: string): Promise<string> {
	// Chrome built-in AI if available
	try {
		if (typeof window !== 'undefined' && window.ai?.prompt) {
			const res = await window.ai.prompt({
				text: `Classify the website domain "${domain}" into one of: Social Media, News, Productivity, Entertainment, Shopping, Work, Education, Other. Output only the category name.`
			});
			const out = res.text?.trim();
			if (out) return out;
		}
	} catch {
		// ignore
	}

	for (const rule of FALLBACK_RULES) {
		if (rule.match.test(domain)) return rule.category;
	}
	return 'Other';
}




