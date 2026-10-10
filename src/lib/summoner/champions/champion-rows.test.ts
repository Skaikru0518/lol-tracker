import { describe, expect, it } from "vitest";
import { mergeChampionRows } from "./champion-rows";

const stat = (championId: number, championName: string, games: number) => ({
	championId,
	championName,
	games,
	wins: 1,
	winRate: 50,
	kills: 1,
	deaths: 1,
	assists: 1,
	kda: 2,
	csPerMin: 1,
	avgDamage: 1,
});
const mastery = (championId: number, championPoints: number) => ({
	puuid: "p1",
	championId,
	championLevel: 7,
	championPoints,
	lastPlayTime: 0,
});
const champions = {
	267: { id: "Nami", key: "267", name: "Nami" },
	99: { id: "Lux", key: "99", name: "Lux" },
	412: { id: "Thresh", key: "412", name: "Thresh" },
};

describe("mergeChampionRows", () => {
	it("attaches mastery to stat rows and keeps the stats order", () => {
		const { rows } = mergeChampionRows([stat(267, "Nami", 10), stat(99, "Lux", 4)], [mastery(99, 500), mastery(267, 900)], champions);
		expect(rows.map((r) => [r.stat.championId, r.mastery?.championPoints])).toEqual([
			[267, 900],
			[99, 500],
		]);
	});

	it("leaves mastery null when Riot has none for that champion", () => {
		expect(mergeChampionRows([stat(267, "Nami", 1)], [], champions).rows[0].mastery).toBeNull();
	});

	it("lists mastery-only champions by points, each champion once", () => {
		const { rows, masteryOnly } = mergeChampionRows(
			[stat(267, "Nami", 1)],
			[mastery(267, 900), mastery(99, 100), mastery(412, 300)],
			champions,
		);
		expect(rows).toHaveLength(1);
		expect(masteryOnly.map((m) => [m.championId, m.championKey])).toEqual([
			[412, "Thresh"],
			[99, "Lux"],
		]);
	});

	it("skips mastery-only champions missing from the champion map", () => {
		expect(mergeChampionRows([], [mastery(9999, 1)], champions).masteryOnly).toEqual([]);
	});

	it("lists no mastery-only champions while stats are still loading", () => {
		expect(mergeChampionRows(undefined, [mastery(267, 900), mastery(99, 100)], champions)).toEqual({ rows: [], masteryOnly: [] });
	});
});
