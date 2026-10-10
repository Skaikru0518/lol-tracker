import { describe, expect, it } from "vitest";
import { makeMatch, makeParticipant } from "@/test/factories";
import { type Timeline } from "@/lib/validators/timeline";
import { arenaPlacement, badgeIdsFor, defaultSelectedPuuid, findParticipant, matchResult, participantIdOf, playerShares, playerStatGroups, timelineState } from "./detail";

const blue = [
	makeParticipant({ puuid: "a", teamId: 100, kills: 4, assists: 2, totalDamageDealtToChampions: 20000, goldEarned: 10000, visionScore: 30 }),
	makeParticipant({ puuid: "b", teamId: 100, kills: 6, totalDamageDealtToChampions: 30000, goldEarned: 10000 }),
];
const red = [makeParticipant({ puuid: "c", teamId: 200, win: false })];
const match = makeMatch({ participants: [...blue, ...red], gameDuration: 1800 });

describe("findParticipant / defaultSelectedPuuid", () => {
	it("finds the ?puuid player", () => {
		expect(findParticipant(match, "b")?.puuid).toBe("b");
		expect(defaultSelectedPuuid(match, "b")).toBe("b");
	});

	it("falls back to the first participant for a missing or foreign puuid", () => {
		expect(findParticipant(match, undefined)).toBeUndefined();
		expect(findParticipant(match, "zzz")).toBeUndefined();
		expect(defaultSelectedPuuid(match, "zzz")).toBe("a");
		expect(defaultSelectedPuuid(match, undefined)).toBe("a");
	});
});

describe("participantIdOf", () => {
	it("is the 1-based position in info.participants", () => {
		expect(participantIdOf(match, "a")).toBe(1);
		expect(participantIdOf(match, "c")).toBe(3);
	});

	it("is null for a player not in the match", () => {
		expect(participantIdOf(match, "zzz")).toBeNull();
	});
});

describe("matchResult", () => {
	it("reads the player's win flag", () => {
		expect(matchResult(match, blue[0])).toBe("Victory");
		expect(matchResult(match, red[0])).toBe("Defeat");
	});

	it("calls games under five minutes a remake", () => {
		expect(matchResult(makeMatch({ participants: blue, gameDuration: 240 }), blue[0])).toBe("Remake");
	});
});

describe("playerShares", () => {
	it("divides by the player's own team", () => {
		expect(playerShares(match, blue[0])).toEqual({ damageShare: 40, goldShare: 50, killParticipation: 60, csPerMin: 0, visionScore: 30 });
	});

	it("never returns NaN for a team with nothing", () => {
		const empty = makeParticipant({ puuid: "x", teamId: 100, totalDamageDealtToChampions: 0, goldEarned: 0 });
		const shares = playerShares(makeMatch({ participants: [empty], gameDuration: 0 }), empty);
		expect(shares).toEqual({ damageShare: 0, goldShare: 0, killParticipation: 0, csPerMin: 0, visionScore: empty.visionScore });
	});
});

describe("playerStatGroups", () => {
	it("formats per-minute values and clocks", () => {
		const p = makeParticipant({ totalDamageDealtToChampions: 18000, goldEarned: 12000, timeCCingOthers: 75, totalTimeSpentDead: 130 });
		const groups = playerStatGroups(p, 1800);
		expect(groups.damage).toContainEqual({ label: "DPM", value: "600" });
		expect(groups.income).toContainEqual({ label: "Gold/min", value: "400" });
		expect(groups.combat).toContainEqual({ label: "CC time", value: "1:15" });
		expect(groups.combat).toContainEqual({ label: "Time dead", value: "2:10" });
	});

	it("lists multikills only when there are any", () => {
		expect(playerStatGroups(makeParticipant(), 1800).combat.map((s) => s.label)).not.toContain("Multikills");
		expect(playerStatGroups(makeParticipant({ doubleKills: 2, pentaKills: 1 }), 1800).combat).toContainEqual({
			label: "Multikills",
			value: "2× Double, 1× Penta",
		});
	});

	it("does not divide by a zero duration", () => {
		expect(playerStatGroups(makeParticipant({ goldEarned: 500 }), 0).income).toContainEqual({ label: "Gold/min", value: "0" });
	});
});

describe("timelineState", () => {
	it("is loading while the first fetch or its retries run", () => {
		expect(timelineState({ data: undefined, isLoading: true })).toBe("loading");
	});

	it("is ready once data is there", () => {
		expect(timelineState({ data: {} as Timeline, isLoading: false })).toBe("ready");
	});

	it("is missing when loading ended without data", () => {
		expect(timelineState({ data: undefined, isLoading: false })).toBe("missing");
	});
});

describe("arenaPlacement", () => {
	it("reads the placement", () => {
		expect(arenaPlacement(makeParticipant({ placement: 3 }))).toBe(3);
	});

	it("falls back to the win flag when placement is missing", () => {
		expect(arenaPlacement(makeParticipant({ placement: undefined, win: true }))).toBe(1);
		expect(arenaPlacement(makeParticipant({ placement: undefined, win: false }))).toBe(5);
	});
});

describe("badgeIdsFor", () => {
	it("keeps only the player's badges", () => {
		const badges = [
			{ puuid: "a", badgeId: "mvp" },
			{ puuid: "b", badgeId: "tank" },
			{ puuid: "a", badgeId: "farmer" },
		];
		expect(badgeIdsFor(badges, "a")).toEqual(["mvp", "farmer"]);
		expect(badgeIdsFor(undefined, "a")).toEqual([]);
	});
});
