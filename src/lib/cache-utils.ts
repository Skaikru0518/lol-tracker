export function isRecent(updatedAt: Date, maxAgeSeconds: number): boolean {
	return Date.now() - updatedAt.getTime() < maxAgeSeconds * 1000;
}

/**
 * Stale-while-revalidate helper.
 * Runs the revalidation function in the background without awaiting it.
 * Errors are silently swallowed.
 */
export function revalidateInBackground(fn: () => Promise<void>): void {
	fn().catch(() => {});
}
