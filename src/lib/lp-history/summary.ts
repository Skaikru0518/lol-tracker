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

export type LpChangeKind = "start" | "gain" | "loss" | "promotion" | "demotion" | "same" | "reset";

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
const divisionOrder = (s: LPSnapshot) => TIERS.indexOf(s.tier) * DIVISIONS.length + Math.max(DIVISIONS.indexOf(s.rank), 0);
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

/** Each known-tier snapshot with its LP delta and kind, newest first; a drop in the W/L totals is a season `reset` with no delta. */
export function lpChangeRows(all: LPSnapshot[]): LpChangeRow[] {
	const snapshots = knownTierSnapshots(all);
	return snapshots
		.map((s, i) => {
			const prev = snapshots[i - 1];
			const reset =
				!!prev &&
				s.wins !== null &&
				s.losses !== null &&
				prev.wins !== null &&
				prev.losses !== null &&
				(s.wins < prev.wins || s.losses < prev.losses);
			const delta = prev && !reset ? absolute(s) - absolute(prev) : null;
			let kind: LpChangeKind = reset ? "reset" : "start";
			if (prev && delta !== null) {
				// At equal absolute LP (Diamond I 100 → Master 0, Master → Grandmaster) the tier, then division order decides
				if (division(s) !== division(prev)) kind = delta > 0 || (delta === 0 && divisionOrder(s) > divisionOrder(prev)) ? "promotion" : "demotion";
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

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar day of an ISO timestamp as `YYYY-MM-DD`. */
export function localDayKey(iso: string): string {
	const d = new Date(iso);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight of a `YYYY-MM-DD` day key. */
export function dayKeyToDate(day: string): Date {
	const [y, m, d] = day.split("-").map(Number);
	return new Date(y, m - 1, d);
}

export interface DailyLpPoint {
	day: string;
	value: number;
	snapshot: LPSnapshot;
}

/** One point per day that has snapshots (that day's last), oldest first; unknown tiers are skipped. */
export function dailyLpPoints(snapshots: LPSnapshot[]): DailyLpPoint[] {
	const byDay = new Map<string, LPSnapshot>();
	for (const s of knownTierSnapshots(snapshots)) byDay.set(localDayKey(s.createdAt), s);
	return [...byDay].map(([day, snapshot]) => ({ day, value: absolute(snapshot), snapshot }));
}

export interface LpDayGroup {
	day: string;
	latest: LpChangeRow;
	rows: LpChangeRow[];
	delta: number | null;
	wins: number;
	losses: number;
}

/** Newest-first change rows grouped by local day with net LP and W/L; W/L uses running totals when known (a reset counts its new-season totals), else gain/loss kinds. */
export function groupChangesByDay(rows: LpChangeRow[]): LpDayGroup[] {
	const groups: LpDayGroup[] = [];
	rows.forEach((row, i) => {
		const day = localDayKey(row.createdAt);
		let group = groups[groups.length - 1];
		if (!group || group.day !== day) {
			group = { day, latest: row, rows: [], delta: null, wins: 0, losses: 0 };
			groups.push(group);
		}
		group.rows.push(row);
		if (row.delta !== null) group.delta = (group.delta ?? 0) + row.delta;
		if (row.kind === "start") return;

		if (row.kind === "reset") {
			group.wins += row.wins ?? 0;
			group.losses += row.losses ?? 0;
			return;
		}

		const older = rows[i + 1];
		if (older && row.wins !== null && row.losses !== null && older.wins !== null && older.losses !== null) {
			group.wins += row.wins - older.wins;
			group.losses += row.losses - older.losses;
		} else if (row.kind === "gain" || row.kind === "promotion") group.wins += 1;
		else if (row.kind === "loss" || row.kind === "demotion") group.losses += 1;
	});
	return groups;
}

/** Why the LP chart is not drawn for a number of charted days; null when it can be drawn. */
export function lpChartNotice(dayCount: number): string | null {
	if (dayCount === 0) return "No chartable snapshots in this range.";
	if (dayCount === 1) return "Played on one day so far.";
	return null;
}
