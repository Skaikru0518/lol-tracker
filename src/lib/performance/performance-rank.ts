import { seasonFor } from "@/lib/achievements/seasons";
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

const seasonOf = (time: number) => seasonFor(new Date(time))?.id ?? null;

// A reset moves everyone down, so a game is only judged against ranks from its own season
export function baseRankAt(
	snapshots: LPSnapshot[] | undefined,
	end: number,
	current: { tier: string; rank: string; leaguePoints: number } | undefined,
	now: number = Date.now(),
): BaseRank | null {
	const season = seasonOf(end);
	const sorted = (snapshots ?? [])
		.map((s) => ({ ...s, time: Date.parse(s.createdAt) }))
		.filter((s) => seasonOf(s.time) === season)
		.sort((a, b) => a.time - b.time);
	const snapshot = sorted.findLast((s) => s.time <= end) ?? sorted.find((s) => s.time > end);
	if (snapshot) return { tier: snapshot.tier, rank: snapshot.rank, lp: snapshot.lp };
	return current && seasonOf(now) === season ? { tier: current.tier, rank: current.rank, lp: current.leaguePoints } : null;
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
	// Missing or newer cut-offs can name a lower apex tier than the player's own; a good game never drops below it
	if ((offset >= 0 && index < baseIndex) || (offset <= 0 && index > baseIndex)) return { tier: base.tier, rank: baseIndex >= APEX_INDEX ? "" : base.rank };
	if (index > baseIndex + 1) return top(baseIndex + 1);
	if (index < baseIndex - 1) return bottom(Math.max(baseIndex - 1, 0));
	return result;
}
