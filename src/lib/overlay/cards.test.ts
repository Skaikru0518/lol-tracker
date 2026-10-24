import { describe, expect, it } from "vitest";
import { type Match } from "@/lib/validators/match";
import { type RankedEntry } from "@/lib/validators/ranked";
import { allocateMatchFetches, overlayRank, overlayTags, splitRiotId, todayRecord } from "./cards";

function entry(queueType: string, tier = "EMERALD"): RankedEntry {
	return { queueType, tier, rank: "II", leaguePoints: 54, wins: 30, losses: 20, hotStreak: false, veteran: false, freshBlood: false, inactive: false };
}

function match(id: string, opts: { queueId?: number; creation?: number; duration?: number; puuid?: string; win?: boolean }): Match {
	const { queueId = 420, creation = 2_000, duration = 1800, puuid = "p1", win = true } = opts;
	return { metadata: { matchId: id }, info: { queueId, gameCreation: creation, gameDuration: duration, participants: [{ puuid, win }] } } as unknown as Match;
}

describe("splitRiotId", () => {
	it("splits at the last #", () => {
		expect(splitRiotId("Cool#Guy#EUNE")).toEqual({ gameName: "Cool#Guy", tagLine: "EUNE" });
	});

	it("keeps a blank Riot ID blank", () => {
		expect(splitRiotId("")).toEqual({ gameName: "", tagLine: "" });
	});
});

describe("overlayRank", () => {
	const entries = [entry("RANKED_SOLO_5x5"), entry("RANKED_FLEX_SR", "GOLD")];

	it("uses Flex in Flex games and Solo/Duo everywhere else", () => {
		expect(overlayRank(entries, 440)?.queueType).toBe("RANKED_FLEX_SR");
		for (const queueId of [420, 450, 0]) expect(overlayRank(entries, queueId)?.queueType).toBe("RANKED_SOLO_5x5");
	});

	it("maps the entry's rank to division", () => {
		expect(overlayRank(entries, 420)).toEqual({ queueType: "RANKED_SOLO_5x5", tier: "EMERALD", division: "II", leaguePoints: 54, wins: 30, losses: 20 });
	});

	it("is null when the game's queue has no entry", () => {
		expect(overlayRank([entry("RANKED_FLEX_SR")], 420)).toBeNull();
	});
});

describe("todayRecord", () => {
	it("counts only today's finished games of the queue the player was in", () => {
		const matches = [
			match("win1", {}),
			match("win2", {}),
			match("loss", { win: false }),
			match("old", { creation: 500 }),
			match("flex", { queueId: 440 }),
			match("remake", { duration: 200, win: false }),
			match("other", { puuid: "p9" }),
		];
		expect(todayRecord(matches, "p1", 1_000, 420)).toEqual({ wins: 2, losses: 1 });
	});
});

describe("allocateMatchFetches", () => {
	it("shares duplicate ids, takes them round-robin and flags players left short", () => {
		const { fetch, partial } = allocateMatchFetches([["a", "b", "c"], ["a", "d"], []], 3);
		expect([...fetch].sort()).toEqual(["a", "b", "d"]);
		expect(partial).toEqual([true, false, false]);
	});

	it("fetches everything under the cap", () => {
		expect(allocateMatchFetches([["a"], ["b"]], 30)).toEqual({ fetch: ["a", "b"], partial: [false, false] });
	});
});

describe("overlayTags", () => {
	it("maps the streak and one-trick achievements", () => {
		expect(overlayTags(["win-streak", "feeder", "one-trick"])).toEqual(["on-fire", "one-trick"]);
	});
});
