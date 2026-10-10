/** A role with its game count and whole-percent share. */
export interface RoleShare {
	role: string;
	count: number;
	share: number;
}

/** Role counts to shares, most played first. */
export function roleShares(roles: Record<string, number>): RoleShare[] {
	const total = Object.values(roles).reduce((sum, count) => sum + count, 0);
	if (total === 0) return [];
	return Object.entries(roles)
		.map(([role, count]) => ({ role, count, share: Math.round((count / total) * 100) }))
		.sort((a, b) => b.count - a.count);
}

/** CSS `conic-gradient` for a role donut; colors repeat if there are more roles than colors. */
export function donutGradient(shares: RoleShare[], colors: readonly string[]): string {
	if (shares.length === 0) return "conic-gradient(var(--border) 0% 100%)";

	let start = 0;
	const stops = shares.map((share, index) => {
		const end = index === shares.length - 1 ? 100 : start + share.share;
		const stop = `${colors[index % colors.length]} ${start}% ${end}%`;
		start = end;
		return stop;
	});
	return `conic-gradient(${stops.join(", ")})`;
}
