import { describe, expect, it } from "vitest";
import { thinSample, together, toSharedGames } from "./compare";
import { type DuoGame } from "./partners";

function game(matchId: string, win: boolean): DuoGame {
	const p = (puuid: string, championName: string) => ({
		puuid,
		teamId: 100,
		win,
		teamPosition: "",
		championName,
		kills: 2,
		deaths: 1,
		assists: 3,
		riotIdGameName: puuid,
		riotIdTagline: "EUNE",
		profileIcon: 1,
	});
	return { matchId, queueId: 420, gameCreation: 1, participants: [p("me", "Ahri"), p("fr", "Lee Sin")] };
}

const shared = (games: DuoGame[], scores: Record<string, Record<string, number>>) => toSharedGames(games, "me", "fr", scores);

describe("toSharedGames", () => {
	it("crowns the higher score", () => {
		const [g] = shared([game("m1", true)], { m1: { me: 80, fr: 70 } });
		expect(g).toMatchObject({ crown: "player", player: { championName: "Ahri", score: 80 }, friend: { championName: "Lee Sin", score: 70 } });
	});

	it("crowns nobody on equal scores", () => {
		const games = shared([game("m1", true)], { m1: { me: 70, fr: 70 } });
		expect(games[0].crown).toBeNull();
		expect(together(games)).toMatchObject({ playerCarried: 0, friendCarried: 0 });
	});

	it("leaves unscored games out of the carried counts", () => {
		const games = shared([game("m1", true), game("m2", true)], { m1: { me: 60, fr: 75 } });
		expect(games[1]).toMatchObject({ crown: null, player: { score: null }, friend: { score: null } });
		expect(together(games)).toEqual({ wins: 2, losses: 0, playerCarried: 0, friendCarried: 1 });
	});
});

describe("together", () => {
	it("counts wins and losses over shared games", () => {
		const games = shared([game("a", true), game("b", true), game("c", true), game("d", false)], {});
		expect(together(games)).toMatchObject({ wins: 3, losses: 1 });
	});
});

describe("thinSample", () => {
	it("judges the sample by scored games, which the average is built from", () => {
		expect(thinSample({ scoredGames: 12 })).toBe(12);
		expect(thinSample({ scoredGames: 30 })).toBeNull();
	});
});
