export const TIER_NAMES = ["Bronze", "Silver", "Gold", "Platinum"] as const;
export const TIER_COLORS = ["#cd7f32", "#aab2bd", "#f1c40f", "#4fd1c5"] as const;
export const LOCKED_COLOR = "#7f8c8d";
const EARNED_COLOR = "#f1c40f";

/** Tier color of a reached tier; binary achievements use one earned color. */
export function tierColor(tier: number, maxTier: number): string {
	if (tier === 0) return LOCKED_COLOR;
	return maxTier === 1 ? EARNED_COLOR : TIER_COLORS[tier - 1];
}

/** How many thresholds `value` has reached (0 = none). */
export function tierFor(value: number, thresholds: readonly number[]): number {
	return thresholds.filter((t) => value >= t).length;
}

export const RANK_TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"] as const;

/** Iron 0 … Challenger 9; -1 for anything else. */
export function rankTierOrdinal(tier: string): number {
	return (RANK_TIERS as readonly string[]).indexOf(tier);
}

/** Highest rank tier ordinal among `tiers`; -1 when there is none. */
export function highestTierOrdinal(tiers: string[]): number {
	return Math.max(-1, ...tiers.map(rankTierOrdinal));
}

/** `Grandmaster` for 8, `Unranked` for -1. */
export function rankTierName(ordinal: number): string {
	const tier = RANK_TIERS[ordinal];
	return tier ? tier.charAt(0) + tier.slice(1).toLowerCase() : "Unranked";
}
