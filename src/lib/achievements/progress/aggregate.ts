import { type ChampionTotals, type CurrentRank } from "./types";

/** One eligible game of a player, reduced to what achievements count. */
export interface GameRow {
	championName: string;
	gameCreation: number;
	win: boolean;
	pentas: number;
	quadras: number;
	kills: number;
	assists: number;
	vision: number;
	turrets: number;
	epics: number;
}

export interface TimeRange {
	from: Date;
	to: Date | null;
}

function inRange(row: GameRow, range?: TimeRange): boolean {
	if (!range) return true;
	return row.gameCreation >= range.from.getTime() && (!range.to || row.gameCreation < range.to.getTime());
}

/** Per-champion sums over the games in `range` (all games without one), in first-seen order. */
export function championTotals(rows: GameRow[], range?: TimeRange): ChampionTotals[] {
	const byChampion = new Map<string, ChampionTotals>();
	for (const row of rows) {
		if (!inRange(row, range)) continue;
		const t = byChampion.get(row.championName) ?? { championName: row.championName, games: 0, wins: 0, pentas: 0, quadras: 0, kills: 0, assists: 0, vision: 0, turrets: 0, epics: 0 };
		t.games += 1;
		t.wins += row.win ? 1 : 0;
		t.pentas += row.pentas;
		t.quadras += row.quadras;
		t.kills += row.kills;
		t.assists += row.assists;
		t.vision += row.vision;
		t.turrets += row.turrets;
		t.epics += row.epics;
		byChampion.set(row.championName, t);
	}
	return [...byChampion.values()];
}

/** Wins and losses of the games in `range`, oldest first. */
export function winSequence(rows: GameRow[], range: TimeRange): boolean[] {
	return rows
		.filter((r) => inRange(r, range))
		.sort((a, b) => a.gameCreation - b.gameCreation)
		.map((r) => r.win);
}

/** Ranked entries refreshed since the season started; older ones belong to an earlier season. */
export function seasonRanks(ranked: (CurrentRank & { updatedAt: Date })[], from: Date): CurrentRank[] {
	return ranked.filter((r) => r.updatedAt >= from).map(({ queueType, tier }) => ({ queueType, tier }));
}
