import { type ApexCutoff } from "@/lib/validators/apex";
import { type LPSnapshot } from "@/lib/validators/lp-history";

export const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const DIVISIONS = ["IV", "III", "II", "I"];
const APEX_INDEX = 7;

/** Rank as one LP number: 400 per tier, 100 per division; Master+ share one ladder above Diamond I. */
export function toAbsoluteLp(tier: string, rank: string, lp: number): number {
	const tierIndex = TIERS.indexOf(tier);
	if (tierIndex === -1) return 0;
	if (tierIndex >= APEX_INDEX) return APEX_INDEX * 400 + lp;
	return tierIndex * 400 + Math.max(DIVISIONS.indexOf(rank), 0) * 100 + lp;
}

const APEX_START = APEX_INDEX * 400;

export function fromAbsoluteLp(points: number, cutoff: ApexCutoff | null | undefined): { tier: string; rank: string } {
	if (points >= APEX_START) {
		const lp = points - APEX_START;
		if (cutoff && lp >= cutoff.challenger) return { tier: "CHALLENGER", rank: "" };
		if (cutoff && lp >= cutoff.grandmaster) return { tier: "GRANDMASTER", rank: "" };
		return { tier: "MASTER", rank: "" };
	}
	const p = Math.max(points, 0);
	return { tier: TIERS[Math.floor(p / 400)], rank: DIVISIONS[Math.floor((p % 400) / 100)] };
}

/** Ranked games played between two snapshots; 1 when W/L is unknown. */
function gamesBetween(before: LPSnapshot, after: LPSnapshot): number {
	if (before.wins === null || before.losses === null || after.wins === null || after.losses === null) return 1;
	return after.wins + after.losses - (before.wins + before.losses);
}

/** LP gained or lost in a match, from the snapshots just before and after it ended. */
export function calculateLPChange(snapshots: LPSnapshot[] | undefined, matchEndTime: number): number | null {
	if (!snapshots || snapshots.length < 2) return null;

	const sorted = [...snapshots].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
	let before: LPSnapshot | null = null;
	let after: LPSnapshot | null = null;

	for (const snap of sorted) {
		if (Date.parse(snap.createdAt) <= matchEndTime) before = snap;
		else if (!after) after = snap;
	}

	if (!before || !after) return null;
	if (gamesBetween(before, after) > 1) return null; // the delta belongs to several games
	return toAbsoluteLp(after.tier, after.rank, after.lp) - toAbsoluteLp(before.tier, before.rank, before.lp);
}
