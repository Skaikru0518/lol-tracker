import { type ScoreboardData } from "@/lib/summoner/scoreboard";
import { type Participant } from "@/lib/validators/match";

export type ComparisonMetric = "damage" | "gold" | "vision" | "cs" | "taken";

export const COMPARISON_METRICS: { id: ComparisonMetric; label: string }[] = [
	{ id: "damage", label: "Damage" },
	{ id: "gold", label: "Gold" },
	{ id: "vision", label: "Vision" },
	{ id: "cs", label: "CS" },
	{ id: "taken", label: "Taken" },
];

const VALUE: Record<ComparisonMetric, (p: Participant) => number> = {
	damage: (p) => p.totalDamageDealtToChampions,
	gold: (p) => p.goldEarned,
	vision: (p) => p.visionScore,
	cs: (p) => p.totalMinionsKilled + p.neutralMinionsKilled,
	taken: (p) => p.totalDamageTaken,
};

export interface ComparisonEntry {
	puuid: string;
	championName: string;
	value: number;
}

/** Both teams' values for one metric in scoreboard order, the largest value (at least 1) to scale bars by, and who holds it. */
export function comparisonRows(
	data: ScoreboardData,
	metric: ComparisonMetric,
): { blue: ComparisonEntry[]; red: ComparisonEntry[]; max: number; topPuuid: string | null } {
	const entry = (p: Participant): ComparisonEntry => ({ puuid: p.puuid, championName: p.championName, value: VALUE[metric](p) });
	const blue = data.rows.flatMap((r) => (r.blue ? [entry(r.blue)] : []));
	const red = data.rows.flatMap((r) => (r.red ? [entry(r.red)] : []));
	const max = Math.max(1, ...blue.map((e) => e.value), ...red.map((e) => e.value));
	const top = [...blue, ...red].find((e) => e.value === max && e.value > 0);
	return { blue, red, max, topPuuid: top?.puuid ?? null };
}
