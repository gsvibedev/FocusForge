export function getDomainFromUrl(url: string): string {
	try {
		const u = new URL(url);
		return normalizeDomain(u.hostname);
	} catch {
		return '';
	}
}

export function normalizeDomain(domain: string): string {
	// Accepts either a hostname or a full URL-like string and returns a canonical domain
	let v = (domain || '').trim().toLowerCase();
	if (!v) return '';
	// If it looks like a URL, try to parse and extract hostname first
	if (v.startsWith('http://') || v.startsWith('https://')) {
		try {
			v = new URL(v).hostname;
		} catch {
			// Fallback: strip scheme manually
			v = v.replace(/^https?:\/\//, '');
		}
	}
	// Remove any path/query/hash remnants if provided a non-URL string
	v = v.split('/')[0] || '';
	// Strip port if present
	v = v.replace(/:\d+$/, '');
	// Remove leading www.
	if (v.startsWith('www.')) v = v.slice(4);
	// Remove trailing dot
	v = v.replace(/\.$/, '');
	return v;
}

export function formatDateKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function nowUtcIso(): string {
	return new Date().toISOString();
}

export function secondsBetween(startMs: number, endMs: number): number {
	return (endMs - startMs) / 1000;
}




