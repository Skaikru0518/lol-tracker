import { formatPoints } from "@/lib/shared/format";
import { type ProgressRow, type Rarity } from "@/lib/validators/achievements";
import { type ProgressDef, ALL_TIME_SCOPE } from "./progress/types";
import { SEASONS, currentSeason } from "./seasons";
import { TIER_NAMES, rankTierName } from "./tiers";

export interface ProgressView {
	tier: number;
	tierName: string | null;
	current: string;
	next: string | null;
	percent: number;
}

/** A value as the card shows it: `1,500`, `412k` or `Diamond`. */
export function formatProgressValue(def: ProgressDef, value: number): string {
	if (def.display === "points") return formatPoints(value);
	if (def.display === "rank") return rankTierName(value);
	return value.toLocaleString("en-US");
}

/** Name of a reached tier: a metal, a rank for peaks (`Grandmaster+` at the top), `Earned` for binary ones. */
export function tierLabel(def: ProgressDef, tier: number): string {
	if (def.thresholds.length === 1) return "Earned";
	if (def.display === "rank") return rankTierName(def.thresholds[tier - 1]) + (tier === def.thresholds.length ? "+" : "");
	return TIER_NAMES[tier - 1];
}

/** Tier label, current value, next target and bar fill (from the reached threshold to the next one). */
export function progressView(def: ProgressDef, row: ProgressRow | undefined): ProgressView {
	const tier = row?.tier ?? 0;
	const value = row?.value ?? 0;
	const max = def.thresholds.length;
	const tierName = tier === 0 ? null : tierLabel(def, tier);
	if (tier >= max) return { tier, tierName, current: formatProgressValue(def, value), next: null, percent: 100 };

	const floor = tier === 0 ? 0 : def.thresholds[tier - 1];
	const target = def.thresholds[tier];
	const percent = Math.round(Math.min(Math.max((value - floor) / (target - floor), 0), 1) * 100);
	return { tier, tierName, current: formatProgressValue(def, value), next: formatProgressValue(def, target), percent };
}

/** `4% of players` for the reached tier; null without rarity data or a reached tier. */
export function rarityText(rarity: Rarity | null, achievementId: string, scope: string, tier: number): string | null {
	const share = tier > 0 ? rarity?.shares[`${achievementId}:${scope}`]?.[tier - 1] : undefined;
	if (share === undefined) return null;
	const percent = share * 100;
	return percent < 1 ? "<1% of players" : `${Math.round(percent)}% of players`;
}

/** The best reached milestones: highest tier first, then the rarest. */
export function topMilestones(rows: ProgressRow[], rarity: Rarity | null, count = 3): ProgressRow[] {
	const share = (r: ProgressRow) => rarity?.shares[`${r.achievementId}:${r.scope}`]?.[r.tier - 1] ?? Number.POSITIVE_INFINITY;
	return rows
		.filter((r) => r.scope === ALL_TIME_SCOPE && r.tier > 0)
		.sort((a, b) => b.tier - a.tier || share(a) - share(b))
		.slice(0, count);
}

/** The current season first, then archived seasons that have rows, newest first. */
export function seasonOptions(rows: ProgressRow[], now: Date = new Date()): { id: string; label: string }[] {
	const current = currentSeason(now);
	const scopes = new Set(rows.map((r) => r.scope));
	return [...SEASONS]
		.reverse()
		.filter((s) => s.id === current.id || (scopes.has(s.id) && new Date(s.start) < new Date(current.start)))
		.map(({ id, label }) => ({ id, label }));
}

/** `50% win rate · needs 55%` for a locked Iron Will that already has its 50 games; null otherwise. */
export function ironWillNote(ironWill: ProgressRow | undefined, seasonWinner: ProgressRow | undefined): string | null {
	if (!ironWill || ironWill.tier > 0 || ironWill.value < 50) return null;
	return `${Math.round(((seasonWinner?.value ?? 0) / ironWill.value) * 100)}% win rate · needs 55%`;
}
