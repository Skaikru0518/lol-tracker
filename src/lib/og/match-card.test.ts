import { describe, expect, it } from "vitest";
import { type PerformanceScore } from "@/lib/performance/score";
import { type Match } from "@/lib/validators/match";
import { buildMatchCard, matchMetadata, pickRankAtMatch } from "./match-card";

function player(puuid: string, teamId: number, kills: number, extra: Record<string, unknown> = {}) {
	return { puuid, teamId, kills, deaths: 3, assists: 4, totalMinionsKilled: 100, neutralMinionsKilled: 0, championName: "Garen", win: teamId === 100, teamPosition: "TOP", riotIdGameName: puuid, riotIdTagline: "EUW", ...extra };
}

function match(gameDuration = 1902, queueId = 420): Match {
	const me = player("me", 100, 14, { deaths: 2, assists: 9, totalMinionsKilled: 270, neutralMinionsKilled: 19, championName: "Ahri", teamPosition: "MIDDLE", riotIdGameName: "Velmora", riotIdTagline: "MOON" });
	// teammates' kills: 6 + 6 + 6 + 5 = 23, team total 37
	const mates = [6, 6, 6, 5].map((k, i) => player(`a${i}`, 100, k));
	const foes = [3, 3, 3, 3, 3].map((k, i) => player(`b${i}`, 200, k));
	return { metadata: { matchId: "EUN1_1" }, info: { gameCreation: 1_000_000, gameDuration, queueId, participants: [me, ...mates, ...foes] } } as unknown as Match;
}

const score = {
	role: "MIDDLE",
	score: 94,
	grade: "S+",
	baselineGames: 500,
	categories: [{ id: "laning", score: 96, grade: "S+", metrics: [] }],
	opponent: null,
} as PerformanceScore;

const rank = { tier: "GRANDMASTER", division: "I", lp: 412 };

describe("buildMatchCard", () => {
	it("turns a stored match into the card fields", () => {
		const card = buildMatchCard(match(), "me", score, ["mvp"], rank);
		expect(card).toMatchObject({
			result: "win",
			queue: "Ranked Solo/Duo",
			duration: "31:42",
			role: "Mid",
			championName: "Ahri",
			kills: 14,
			deaths: 2,
			assists: 9,
			kda: "11.5",
			csPerMin: "9.1",
			killShare: 0.62,
			badgeIds: ["mvp"],
			riotId: "Velmora#MOON",
			rank,
		});
		expect(card?.score).toEqual({ value: 94, grade: "S+", categories: [{ id: "laning", score: 96, grade: "S+" }] });
	});

	it("shows a remake without a score even when one is passed", () => {
		const card = buildMatchCard(match(240), "me", score, [], null);
		expect(card?.result).toBe("remake");
		expect(card?.score).toBeNull();
	});

	it("is null for a player who was not in the match", () => {
		expect(buildMatchCard(match(), "stranger", score, [], null)).toBeNull();
	});
});

describe("pickRankAtMatch", () => {
	const end = 10 * 60 * 60 * 1000;
	const at = (h: number, lp: number) => ({ tier: "GRANDMASTER", rank: "I", lp, createdAt: new Date(end + h * 60 * 60 * 1000) });

	it("takes the first snapshot written after the game, within a day", () => {
		expect(pickRankAtMatch([at(-2, 380), at(3, 412), at(5, 430)], end)).toEqual({ tier: "GRANDMASTER", division: "I", lp: 412 });
	});

	it("has no rank when nothing was written after the game, or only more than a day later", () => {
		expect(pickRankAtMatch([at(-2, 380)], end)).toBeNull();
		expect(pickRankAtMatch([at(25, 450)], end)).toBeNull();
	});
});

describe("matchMetadata", () => {
	it("names the player, champion, KDA, score and rank", () => {
		expect(matchMetadata(buildMatchCard(match(), "me", score, [], rank)!)).toEqual({
			title: "Velmora#MOON · Ahri 14/2/9 · S+ 94",
			description: "Victory in Ranked Solo/Duo · Grandmaster 412 LP",
		});
	});

	it("uses the champion's display name", () => {
		const card = { ...buildMatchCard(match(), "me", null, [], null)!, championName: "MonkeyKing" };
		expect(matchMetadata(card).title).toBe("Velmora#MOON · Wukong 14/2/9");
	});

	it("leaves out what the card does not have", () => {
		expect(matchMetadata(buildMatchCard(match(1902, 450), "me", null, [], null)!)).toEqual({
			title: "Velmora#MOON · Ahri 14/2/9",
			description: "Victory in ARAM",
		});
	});
});
