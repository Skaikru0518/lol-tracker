import { type ChampionTotals, type CurrentRank, type GameRow } from "./types";

export interface TimeRange {
	from: Date;
	to: Date | null;
}

/** Killing spree length that counts as Legendary. */
const LEGENDARY_SPREE = 8;

function inRange(row: GameRow, range?: TimeRange): boolean {
	if (!range) return true;
	return row.gameCreation >= range.from.getTime() && (!range.to || row.gameCreation < range.to.getTime());
}

function emptyTotals(championName: string): ChampionTotals {
	return {
		championName,
		games: 0,
		wins: 0,
		pentas: 0,
		quadras: 0,
		kills: 0,
		assists: 0,
		vision: 0,
		turrets: 0,
		epics: 0,
		gold: 0,
		cs: 0,
		damage: 0,
		wardsPlaced: 0,
		wardsKilled: 0,
		support: 0,
		firstBloods: 0,
		deathless: 0,
		legendary: 0,
		seconds: 0,
	};
}

/** Per-champion sums over the games in `range` (all games without one), in first-seen order. */
export function championTotals(rows: GameRow[], range?: TimeRange): ChampionTotals[] {
	const byChampion = new Map<string, ChampionTotals>();
	for (const row of rows) {
		if (!inRange(row, range)) continue;
		const t = byChampion.get(row.championName) ?? emptyTotals(row.championName);
		t.games += 1;
		t.wins += row.win ? 1 : 0;
		t.pentas += row.pentas;
		t.quadras += row.quadras;
		t.kills += row.kills;
		t.assists += row.assists;
		t.vision += row.vision;
		t.turrets += row.turrets;
		t.epics += row.epics;
		t.gold += row.gold;
		t.cs += row.cs;
		t.damage += row.damage;
		t.wardsPlaced += row.wardsPlaced;
		t.wardsKilled += row.wardsKilled;
		t.support += row.support;
		t.firstBloods += row.firstBlood ? 1 : 0;
		t.deathless += row.deaths === 0 ? 1 : 0;
		t.legendary += row.largestSpree >= LEGENDARY_SPREE ? 1 : 0;
		t.seconds += row.gameDuration;
		byChampion.set(row.championName, t);
	}
	return [...byChampion.values()];
}

/** The games in `range`, oldest first. */
export function seasonGames(rows: GameRow[], range: TimeRange): GameRow[] {
	return rows.filter((r) => inRange(r, range)).sort((a, b) => a.gameCreation - b.gameCreation);
}

/** Ranked entries refreshed since the season started; older ones belong to an earlier season. */
export function seasonRanks(ranked: (CurrentRank & { updatedAt: Date })[], from: Date): CurrentRank[] {
	return ranked.filter((r) => r.updatedAt >= from).map(({ queueType, tier }) => ({ queueType, tier }));
}
