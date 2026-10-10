import { type Champion } from "@/lib/game/icon-helpers";
import { type MasteryEntry } from "@/lib/summoner/champions/mastery";
import { type ChampionStat } from "@/lib/validators/champion-stats";

export interface ChampionTableRow {
	stat: ChampionStat;
	mastery: MasteryEntry | null;
}

export interface MasteryOnlyRow {
	championId: number;
	championKey: string;
	championName: string;
	mastery: MasteryEntry;
}

/** Stat rows with their mastery, plus champions that have mastery but no stored games (by points); empty until stats load. */
export function mergeChampionRows(
	stats: ChampionStat[] | undefined,
	masteries: MasteryEntry[],
	champions: Record<number, Champion> | undefined,
): { rows: ChampionTableRow[]; masteryOnly: MasteryOnlyRow[] } {
	if (!stats) return { rows: [], masteryOnly: [] };
	const byId = new Map(masteries.map((m) => [m.championId, m]));
	const rows = stats.map((stat) => ({ stat, mastery: byId.get(stat.championId) ?? null }));
	const played = new Set(stats.map((s) => s.championId));

	const masteryOnly = masteries
		.filter((m) => !played.has(m.championId) && champions?.[m.championId])
		.sort((a, b) => b.championPoints - a.championPoints)
		.map((m) => {
			const champ = champions![m.championId];
			return { championId: m.championId, championKey: champ.id, championName: champ.name, mastery: m };
		});

	return { rows, masteryOnly };
}
