export function isRecent(updatedAt: Date, maxAgeSeconds: number): boolean {
	return Date.now() - updatedAt.getTime() < maxAgeSeconds * 1000;
}
