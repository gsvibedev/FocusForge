export function formatDurationSeconds(seconds: number): string {
	if (seconds < 60) return `${Math.round(seconds)}s`;
	const mins = Math.floor(seconds / 60);
	const secs = Math.round(seconds % 60);
	if (mins < 60) return secs ? `${mins}m ${secs}s` : `${mins}m`;
	const hrs = Math.floor(mins / 60);
	const rem = mins % 60;
	return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
}
























