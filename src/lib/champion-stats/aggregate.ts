import { type ChampionStat } from "@/lib/validators/champion-stats";

/** Totals per champion as returned by the aggregation query. */
export interface ChampionStatRow {
	championId: number;
	championName: string;
	games: number;
	wins: number;
	kills: number;
	deaths: number;
	assists: number;
	cs: number;
	damage: number;
	durationSeconds: number;
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

/** Totals to per-game averages and rates; perfect KDA is kills + assists, zero duration gives 0 rates. */
export function toChampionStat(row: ChampionStatRow): ChampionStat {
	const minutes = row.durationSeconds / 60;
	const perMinute = (total: number) => (minutes > 0 ? round2(total / minutes) : 0);
	const perGame = (total: number) => round2(total / row.games);

	return {
		championId: row.championId,
		championName: row.championName,
		games: row.games,
		wins: row.wins,
		winRate: round2((row.wins / row.games) * 100),
		kills: perGame(row.kills),
		deaths: perGame(row.deaths),
		assists: perGame(row.assists),
		kda: round2(row.deaths > 0 ? (row.kills + row.assists) / row.deaths : row.kills + row.assists),
		csPerMin: perMinute(row.cs),
		damagePerMin: perMinute(row.damage),
	};
}
