import { describe, expect, it } from "vitest";
import { type GameRow } from "./types";
import { championTotals, seasonGames, seasonRanks } from "./aggregate";

function game(championName: string, gameCreation: string, overrides: Partial<GameRow> = {}): GameRow {
	return {
		championName,
		gameCreation: Date.parse(gameCreation),
		gameDuration: 1800,
		teamPosition: "MIDDLE",
		win: true,
		pentas: 0,
		quadras: 0,
		kills: 1,
		deaths: 2,
		assists: 2,
		vision: 10,
		turrets: 0,
		epics: 0,
		gold: 10000,
		cs: 200,
		damage: 20000,
		wardsPlaced: 10,
		wardsKilled: 3,
		support: 1000,
		firstBlood: false,
		largestSpree: 2,
		...overrides,
	};
}

const rows = [
	game("Ahri", "2025-06-01", { win: false, pentas: 1 }),
	game("Ahri", "2026-02-01"),
	game("Lux", "2026-03-01", { win: false }),
	game("Ahri", "2026-01-20"),
];
const season2026 = { from: new Date("2026-01-08T11:00:00Z"), to: null };

describe("championTotals", () => {
	it("sums every game per champion without a range", () => {
		expect(championTotals(rows)).toEqual([
			{ championName: "Ahri", games: 3, wins: 2, pentas: 1, quadras: 0, kills: 3, assists: 6, vision: 30, turrets: 0, epics: 0, gold: 30000, cs: 600, damage: 60000, wardsPlaced: 30, wardsKilled: 9, support: 3000, firstBloods: 0, deathless: 0, legendary: 0, seconds: 5400 },
			{ championName: "Lux", games: 1, wins: 0, pentas: 0, quadras: 0, kills: 1, assists: 2, vision: 10, turrets: 0, epics: 0, gold: 10000, cs: 200, damage: 20000, wardsPlaced: 10, wardsKilled: 3, support: 1000, firstBloods: 0, deathless: 0, legendary: 0, seconds: 1800 },
		]);
	});

	it("counts first bloods, deathless games and 8+ killing sprees", () => {
		const [ahri] = championTotals([
			game("Ahri", "2026-02-01", { firstBlood: true, deaths: 0, largestSpree: 8 }),
			game("Ahri", "2026-02-02", { largestSpree: 7 }),
		]);
		expect(ahri).toMatchObject({ firstBloods: 1, deathless: 1, legendary: 1 });
	});

	it("keeps only games inside the range", () => {
		expect(championTotals(rows, { from: new Date("2025-01-09T11:00:00Z"), to: new Date("2026-01-08T11:00:00Z") }).map((c) => [c.championName, c.games])).toEqual([["Ahri", 1]]);
	});
});

describe("seasonGames", () => {
	it("keeps the range's games, oldest first", () => {
		expect(seasonGames(rows, season2026).map((g) => [g.championName, g.win])).toEqual([["Ahri", true], ["Ahri", true], ["Lux", false]]);
	});
});

describe("seasonRanks", () => {
	it("drops ranked entries not refreshed since the season started", () => {
		const ranked = [
			{ queueType: "RANKED_SOLO_5x5", tier: "MASTER", updatedAt: new Date("2025-12-20") },
			{ queueType: "RANKED_FLEX_SR", tier: "GOLD", updatedAt: new Date("2026-05-01") },
		];
		expect(seasonRanks(ranked, season2026.from)).toEqual([{ queueType: "RANKED_FLEX_SR", tier: "GOLD" }]);
	});
});
