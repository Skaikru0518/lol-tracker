import { fromAbsoluteLp, TIERS, toAbsoluteLp } from "@/lib/summoner/profile/lp-change";
import { type ApexCutoff } from "@/lib/validators/apex";
import { type LPSnapshot } from "@/lib/validators/lp-history";

export interface BaseRank {
	tier: string;
	rank: string;
	lp: number;
}

const AVERAGE_SCORE = 65;
const POINTS_PER_DIVISION = 8;
const MAX_OFFSET = 4;
const APEX_INDEX = TIERS.indexOf("MASTER");

export function baseRankAt(
	snapshots: LPSnapshot[] | undefined,
	end: number,
	current: { tier: string; rank: string; leaguePoints: number } | undefined,
): BaseRank | null {
	const sorted = [...(snapshots ?? [])].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
	const snapshot = sorted.findLast((s) => Date.parse(s.createdAt) <= end) ?? sorted.find((s) => Date.parse(s.createdAt) > end);
	if (snapshot) return { tier: snapshot.tier, rank: snapshot.rank, lp: snapshot.lp };
	return current ? { tier: current.tier, rank: current.rank, lp: current.leaguePoints } : null;
}

const top = (index: number) => ({ tier: TIERS[index], rank: index >= APEX_INDEX ? "" : "I" });
const bottom = (index: number) => ({ tier: TIERS[index], rank: index >= APEX_INDEX ? "" : "IV" });

export function performanceRank(base: BaseRank, score: number, cutoff: ApexCutoff | null | undefined): { tier: string; rank: string } {
	const baseIndex = TIERS.indexOf(base.tier);
	// Below Master the game is judged against the division; above it LP is what separates the tiers
	const start = baseIndex >= APEX_INDEX ? toAbsoluteLp(base.tier, base.rank, base.lp) : toAbsoluteLp(base.tier, base.rank, 0);
	const offset = Math.min(Math.max(Math.round((score - AVERAGE_SCORE) / POINTS_PER_DIVISION), -MAX_OFFSET), MAX_OFFSET);
	const result = fromAbsoluteLp(start + offset * 100, cutoff);
	const index = TIERS.indexOf(result.tier);
	if (index > baseIndex + 1) return top(baseIndex + 1);
	if (index < baseIndex - 1) return bottom(Math.max(baseIndex - 1, 0));
	return result;
}
