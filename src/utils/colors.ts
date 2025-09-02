function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function hashStringToHsl(input: string): { h: number; s: number; l: number } {
	let hash = 0;
	for (let i = 0; i < input.length; i += 1) {
		hash = input.charCodeAt(i) + ((hash << 5) - hash);
		hash |= 0; // 32-bit
	}
	const h = Math.abs(hash) % 360;
	const s = 60 + (Math.abs(hash >> 3) % 25); // 60-85
	const l = 45 + (Math.abs(hash >> 6) % 15); // 45-60
	return { h, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
	s /= 100;
	l /= 100;
	const k = (n: number) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
	return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function stringToColor(name: string): string {
	const { h, s, l } = hashStringToHsl(name);
	return hslToHex(h, s, l);
}

export function adjustHexLightness(hex: string, delta: number): string {
	// hex -> hsl
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	let l = (max + min) / 2;
	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		s = clamp(s, 0, 1);
		s *= 100;
		s = clamp(s, 0, 100);
		s = Math.round(s);
		s /= 100;
		s *= 100; // back to percent
		s = Math.round(s);
		// hue
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			default:
				h = (r - g) / d + 4;
		}
		h /= 6;
		h *= 360;
	}
	l *= 100;
	l = clamp(l + delta, 0, 100);
	return hslToHex(Math.round(h), Math.round(s), Math.round(l));
}

export function hexToRgba(hex: string, alpha = 1): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
























