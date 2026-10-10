import { toAbsoluteLp } from "@/lib/summoner/lp-change";
import { formatRankLabel } from "@/lib/rank-calculator";
import { type LPSnapshot } from "@/lib/validators/lp-history";

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const DIVISIONS = ["IV", "III", "II", "I"];
const APEX_BASE = 7 * 400;

export interface LpSummaryData {
	current: LPSnapshot | null;
	peak: LPSnapshot | null;
	change: number | null;
}

export type LpChangeKind = "start" | "gain" | "loss" | "promotion" | "demotion" | "same";

export interface LpChangeRow {
	id: string;
	createdAt: string;
	tier: string;
	rank: string;
	lp: number;
	wins: number | null;
	losses: number | null;
	delta: number | null;
	kind: LpChangeKind;
}

const absolute = (s: LPSnapshot) => toAbsoluteLp(s.tier, s.rank, s.lp);
/** Snapshots whose tier is on the ladder; unknown tiers would read as 0 LP. */
export const knownTierSnapshots = (snapshots: LPSnapshot[]) => snapshots.filter((s) => TIERS.includes(s.tier));
const division = (s: LPSnapshot) => `${s.tier} ${s.rank}`;

/** Latest snapshot, highest snapshot and LP change from first to last (oldest-first input); unknown tiers are skipped. */
export function lpSummary(all: LPSnapshot[]): LpSummaryData {
	const snapshots = knownTierSnapshots(all);
	if (snapshots.length === 0) return { current: null, peak: null, change: null };
	const current = snapshots[snapshots.length - 1];
	const peak = snapshots.reduce((best, s) => (absolute(s) > absolute(best) ? s : best), snapshots[0]);
	const change = snapshots.length > 1 ? absolute(current) - absolute(snapshots[0]) : null;
	return { current, peak, change };
}

/** Each known-tier snapshot with its LP delta and whether it was a gain, loss, promotion or demotion; newest first. */
export function lpChangeRows(all: LPSnapshot[]): LpChangeRow[] {
	const snapshots = knownTierSnapshots(all);
	return snapshots
		.map((s, i) => {
			const prev = snapshots[i - 1];
			const delta = prev ? absolute(s) - absolute(prev) : null;
			let kind: LpChangeKind = "start";
			if (prev && delta !== null) {
				if (division(s) !== division(prev)) kind = delta > 0 ? "promotion" : "demotion";
				else kind = delta > 0 ? "gain" : delta < 0 ? "loss" : "same";
			}
			return { id: s.id, createdAt: s.createdAt, tier: s.tier, rank: s.rank, lp: s.lp, wins: s.wins, losses: s.losses, delta, kind };
		})
		.reverse();
}

/** Rank label for an absolute LP value, e.g. `Emerald I · 50 LP`; the inverse of `toAbsoluteLp`. */
export function absoluteLpLabel(value: number): string {
	const v = Math.max(0, Math.round(value));
	if (v >= APEX_BASE) return `Master+ · ${v - APEX_BASE} LP`;
	const tier = TIERS[Math.floor(v / 400)];
	const rank = DIVISIONS[Math.floor((v % 400) / 100)];
	return `${formatRankLabel(tier, rank)} · ${v % 100} LP`;
}

/** Y-axis ticks on 100 LP boundaries spanning `min`..`max`. */
export function lpAxisTicks(min: number, max: number): number[] {
	const from = Math.floor(min / 100) * 100;
	const to = Math.max(Math.ceil(max / 100) * 100, from + 100);
	const ticks: number[] = [];
	for (let v = from; v <= to; v += 100) ticks.push(v);
	return ticks;
}

/** Y-axis tick label: the division below Master, `Master+` at the line and plain LP above it. */
export function lpAxisTickLabel(value: number): string {
	if (value > APEX_BASE) return `${value - APEX_BASE} LP`;
	return absoluteLpLabel(value).split(" · ")[0];
}
