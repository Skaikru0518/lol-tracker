/** One page of `items` (0-based, clamped to the valid range) and the total page count; always at least one page. */
export function paginate<T>(items: T[], page: number, size: number): { items: T[]; page: number; pageCount: number } {
	const pageCount = Math.max(Math.ceil(items.length / size), 1);
	const current = Math.min(Math.max(page, 0), pageCount - 1);
	return { items: items.slice(current * size, (current + 1) * size), page: current, pageCount };
}
