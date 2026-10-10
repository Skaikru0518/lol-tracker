import { describe, expect, it } from "vitest";
import { getRecentTeammates } from "./teammates";
import { makeMatch, makeParticipant } from "@/test/factories";

const me = makeParticipant({ puuid: "me", teamId: 100 });
const duo = (win: boolean) =>
	makeParticipant({ puuid: "duo", riotIdGameName: "Duo", riotIdTagline: "EUW", teamId: 100, win });
const enemy = makeParticipant({ puuid: "enemy", teamId: 200 });

describe("getRecentTeammates", () => {
	it("counts games and wins with players on the same team", () => {
		const matches = [
			makeMatch({ participants: [me, duo(true), enemy] }),
			makeMatch({ participants: [me, duo(false), enemy] }),
		];
		expect(getRecentTeammates(matches, "me")).toEqual([
			{ puuid: "duo", gameName: "Duo", tagLine: "EUW", profileIcon: 1, games: 2, wins: 1 },
		]);
	});

	it("leaves out one-off teammates and enemies", () => {
		const once = makeParticipant({ puuid: "once", teamId: 100 });
		expect(getRecentTeammates([makeMatch({ participants: [me, once, enemy] })], "me")).toEqual([]);
	});

	it("skips matches the player is not in", () => {
		expect(getRecentTeammates([makeMatch({ participants: [duo(true), enemy] })], "me")).toEqual([]);
	});
});
