import { describe, expect, it } from "vitest";
import { type PerformanceScore } from "./score";
import { summarizeRecent, type RecentGame } from "./recent-summary";

function score(value: number, categories: [string, number][] = []): PerformanceScore {
	return {
		role: "MIDDLE",
		score: value,
		grade: "B",
		baselineGames: 500,
		categories: categories.map(([id, s]) => ({ id: id as PerformanceScore["categories"][number]["id"], score: s, grade: "B", metrics: [] })),
		opponent: null,
	};
}

function game(overrides: Partial<RecentGame> & { win: boolean }): RecentGame {
	return {
		championName: "Ahri",
		kills: 5,
		deaths: 2,
		assists: 5,
		teamId: 100,
		score: null,
		lobby: [],
		...overrides,
	};
}

const lobby = (mine: number, win: boolean) => [
	{ puuid: "me", teamId: 100, win, score: mine },
	{ puuid: "a", teamId: 100, win, score: 60 },
	{ puuid: "b", teamId: 200, win: !win, score: 70 },
	{ puuid: "c", teamId: 200, win: !win, score: 40 },
];

describe("summarizeRecent", () => {
	it("counts wins, averages K/D/A and orders the top champions", () => {
		const s = summarizeRecent("me", [
			game({ win: true, championName: "Ahri" }),
			game({ win: false, championName: "Ahri", deaths: 8 }),
			game({ win: true, championName: "Lux", kills: 10 }),
			game({ win: true, championName: "Ahri" }),
		]);
		expect(s).toMatchObject({ games: 4, wins: 3, losses: 1, winRate: 75 });
		expect(s.kills).toBe(6.3);
		expect(s.deaths).toBe(3.5);
		expect(s.kda).toBe(3.21);
		expect(s.champions.map((c) => [c.championName, c.games, c.wins])).toEqual([["Ahri", 3, 2], ["Lux", 1, 1]]);
	});

	it("averages scores and categories over scored games only", () => {
		const s = summarizeRecent("me", [
			game({ win: true, score: score(80, [["vision", 90], ["laning", 60]]) }),
			game({ win: false, score: score(60, [["vision", 70]]) }),
			game({ win: true }),
		]);
		expect(s.scoredGames).toBe(2);
		expect(s.score).toEqual({ average: 70, grade: "A" });
		expect(s.categories).toEqual([
			{ id: "laning", score: 60, grade: "B" },
			{ id: "vision", score: 80, grade: "S" },
		]);
	});

	it("ranks the player in each lobby and counts MVP and ACE", () => {
		const s = summarizeRecent("me", [
			game({ win: true, score: score(90), lobby: lobby(90, true) }),
			game({ win: false, score: score(65), lobby: lobby(65, false) }),
			game({ win: true, score: score(50), lobby: lobby(50, true) }),
		]);
		expect(s.mvp).toBe(1);
		expect(s.ace).toBe(1);
		expect(s.lobbyRank).toBe(2);
	});

	it("handles no games", () => {
		expect(summarizeRecent("me", [])).toMatchObject({ games: 0, winRate: 0, score: null, lobbyRank: null, champions: [], categories: [] });
	});
});
