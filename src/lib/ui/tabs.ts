/** Href for a route tab; `null` segment is the index tab. */
export function buildTabHref(basePath: string, segment: string | null): string {
	const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
	return segment ? `${base}/${segment}` : base;
}

/** Whether a tab is active for the `useSelectedLayoutSegment()` value. */
export function isTabActive(
	activeSegment: string | null,
	tabSegment: string | null,
): boolean {
	return activeSegment === tabSegment;
}
