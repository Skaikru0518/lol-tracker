import { describe, expect, it } from "vitest";
import { championTotals, seasonRanks, winSequence, type GameRow } from "./aggregate";

function game(championName: string, gameCreation: string, overrides: Partial<GameRow> = {}): GameRow {
	return { championName, gameCreation: Date.parse(gameCreation), win: true, pentas: 0, quadras: 0, kills: 1, assists: 2, vision: 10, turrets: 0, epics: 0, ...overrides };
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
			{ championName: "Ahri", games: 3, wins: 2, pentas: 1, quadras: 0, kills: 3, assists: 6, vision: 30, turrets: 0, epics: 0 },
			{ championName: "Lux", games: 1, wins: 0, pentas: 0, quadras: 0, kills: 1, assists: 2, vision: 10, turrets: 0, epics: 0 },
		]);
	});

	it("keeps only games inside the range", () => {
		expect(championTotals(rows, { from: new Date("2025-01-09T11:00:00Z"), to: new Date("2026-01-08T11:00:00Z") }).map((c) => [c.championName, c.games])).toEqual([["Ahri", 1]]);
	});
});

describe("winSequence", () => {
	it("orders the range's results oldest first", () => {
		expect(winSequence(rows, season2026)).toEqual([true, true, false]);
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
