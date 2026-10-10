import { describe, expect, it } from "vitest";
import { liveViewState, mapName, playerRankSummary, showLiveBanner, splitTeams, teamAvgRank } from "./live-game";

const player = (puuid: string, teamId: number) => ({
	puuid,
	summonerId: "",
	riotId: `${puuid}#EUNE`,
	championId: 1,
	teamId,
	spell1Id: 4,
	spell2Id: 14,
	perks: { perkIds: [8112], perkStyle: 8100, perkSubStyle: 8200 },
});

const entry = (queueType: string, tier: string, rank: string, wins: number, losses: number) => ({
	queueType,
	tier,
	rank,
	leaguePoints: 40,
	wins,
	losses,
	hotStreak: false,
	veteran: false,
	freshBlood: false,
	inactive: false,
});

describe("splitTeams", () => {
	it("pairs blue and red by index, padding the shorter side", () => {
		const { rows } = splitTeams([player("b1", 100), player("r1", 200), player("b2", 100)]);
		expect(rows.map((r) => [r.blue?.puuid ?? null, r.red?.puuid ?? null])).toEqual([
			["b1", "r1"],
			["b2", null],
		]);
	});
});

describe("playerRankSummary", () => {
	const entries = [entry("RANKED_SOLO_5x5", "EMERALD", "I", 54, 46), entry("RANKED_FLEX_SR", "GOLD", "II", 10, 10), entry("RANKED_PREMADE_5x5", "SILVER", "I", 3, 1)];

	it("uses the game's ranked queue", () => {
		expect(playerRankSummary(entries, 420)).toEqual({ tier: "EMERALD", rank: "I", leaguePoints: 40, winRate: 54, games: 100 });
		expect(playerRankSummary(entries, 440)?.tier).toBe("GOLD");
		expect(playerRankSummary(entries, 710)).toMatchObject({ tier: "SILVER", winRate: 75, games: 4 });
	});

	it("falls back to solo for queues without their own rank", () => {
		expect(playerRankSummary(entries, 450)?.tier).toBe("EMERALD");
	});

	it("is null for an unranked player or unknown ranks", () => {
		expect(playerRankSummary([entry("RANKED_FLEX_SR", "GOLD", "II", 1, 1)], 420)).toBeNull();
		expect(playerRankSummary(undefined, 420)).toBeNull();
	});
});

describe("teamAvgRank", () => {
	it("averages only the team's players in the game's queue", () => {
		const ranks = {
			b1: [entry("RANKED_SOLO_5x5", "DIAMOND", "I", 1, 1)],
			b2: [entry("RANKED_SOLO_5x5", "DIAMOND", "I", 1, 1)],
			r1: [entry("RANKED_SOLO_5x5", "IRON", "IV", 1, 1)],
		};
		expect(teamAvgRank([player("b1", 100), player("b2", 100)], ranks, 420)).toMatchObject({ tier: "DIAMOND", rank: "I" });
	});

	it("is null when nobody on the team is ranked", () => {
		expect(teamAvgRank([player("b1", 100)], {}, 420)).toBeNull();
	});
});

describe("mapName", () => {
	it("names the common maps and falls back for others", () => {
		expect(mapName(11)).toBe("Summoner's Rift");
		expect(mapName(12)).toBe("Howling Abyss");
		expect(mapName(30)).toBe("Rings of Wrath");
		expect(mapName(99)).toBe("Custom map");
		expect(mapName(undefined)).toBe("Custom map");
	});
});

describe("splitTeams fallback", () => {
	it("splits non 100/200 team ids (Arena) into two halves by order, keeping every player", () => {
		const players = Array.from({ length: 16 }, (_, i) => player(`p${i}`, 100 * (Math.floor(i / 2) + 1)));
		const { rows, blue, red } = splitTeams(players);
		expect(rows).toHaveLength(8);
		expect(blue.map((p) => p.puuid)).toEqual(players.slice(0, 8).map((p) => p.puuid));
		expect(red.map((p) => p.puuid)).toEqual(players.slice(8).map((p) => p.puuid));
	});

	it("returns the blue and red lists for 100/200 games", () => {
		const { blue, red } = splitTeams([player("b1", 100), player("r1", 200)]);
		expect([blue.map((p) => p.puuid), red.map((p) => p.puuid)]).toEqual([["b1"], ["r1"]]);
	});
});

describe("liveViewState", () => {
	const game = { inGame: true, participants: [player("b1", 100)] };

	it("keeps showing the last game when a background refetch fails", () => {
		expect(liveViewState({ data: game, isLoading: false, isError: true })).toBe("live");
	});

	it("is error only without any data", () => {
		expect(liveViewState({ data: undefined, isLoading: false, isError: true })).toBe("error");
	});

	it("is loading, then idle when not in a game", () => {
		expect(liveViewState({ data: undefined, isLoading: true, isError: false })).toBe("loading");
		expect(liveViewState({ data: { inGame: false }, isLoading: false, isError: false })).toBe("idle");
	});
});

describe("showLiveBanner", () => {
	it("hides the banner on the live page itself", () => {
		expect(showLiveBanner("live")).toBe(false);
		expect(showLiveBanner(null)).toBe(true);
		expect(showLiveBanner("champions")).toBe(true);
	});
});
