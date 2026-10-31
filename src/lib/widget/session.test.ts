import { describe, expect, it } from "vitest";
import { type Match } from "@/lib/validators/match";
import { autoSession, sessionGames, sessionLpChange } from "./session";

const MIN = 60_000;
const HOUR = 60 * MIN;
const PUUID = "me";

function match(id: string, start: number, { win = true, minutes = 30, queueId = 420, champ = "Ahri" } = {}): Match {
	return {
		metadata: { matchId: id },
		info: {
			gameCreation: start,
			gameDuration: minutes * 60,
			queueId,
			participants: [{ puuid: PUUID, championName: champ, win, kills: 5, deaths: 2, assists: 7 }],
		},
	} as unknown as Match;
}

describe("sessionGames", () => {
	it("keeps the queue's games since the start, oldest first, without remakes", () => {
		const games = sessionGames(
			[
				match("c", 3 * HOUR),
				match("a", 1 * HOUR, { win: false }),
				match("old", 0),
				match("flex", 2 * HOUR, { queueId: 440 }),
				match("remake", 2.5 * HOUR, { minutes: 3 }),
			],
			PUUID,
			420,
			HOUR,
		);
		expect(games.map((g) => g.matchId)).toEqual(["a", "c"]);
		expect(games[0]).toEqual({ matchId: "a", championName: "Ahri", win: false, kills: 5, deaths: 2, assists: 7, start: HOUR, end: HOUR + 30 * MIN });
	});

	it("skips matches the player is not in", () => {
		expect(sessionGames([match("x", HOUR)], "someone-else", 420, 0)).toEqual([]);
	});
});

describe("autoSession", () => {
	const all = (starts: number[]) => sessionGames(starts.map((s, i) => match(`m${i}`, s)), PUUID, 420, 0);

	it("is the run of games with gaps under the limit", () => {
		// m0 ends 0:30, m1 starts 5:00 (gap > 3h); m1..m3 are close together
		const games = all([0, 5 * HOUR, 6 * HOUR, 7 * HOUR]);
		expect(autoSession(games, 8 * HOUR, 3 * HOUR).map((g) => g.matchId)).toEqual(["m1", "m2", "m3"]);
	});

	it("is empty when the newest game ended longer ago than the limit", () => {
		expect(autoSession(all([0, HOUR]), 5 * HOUR, 3 * HOUR)).toEqual([]);
	});

	it("is empty without games", () => {
		expect(autoSession([], 0, 3 * HOUR)).toEqual([]);
	});
});

describe("sessionLpChange", () => {
	const games = sessionGames([match("a", 10 * HOUR), match("b", 11 * HOUR, { win: false }), match("c", 12 * HOUR)], PUUID, 420, 0);
	const snap = (tier: string, rank: string, lp: number, wins: number | null, losses: number | null) => ({ tier, rank, lp, wins, losses });

	it("is current minus the baseline, across a promotion", () => {
		const baseline = snap("EMERALD", "II", 80, 20, 18);
		const current = snap("EMERALD", "I", 10, 22, 19);
		expect(sessionLpChange(baseline, current, games)).toBe(30);
	});

	it("goes negative across a demotion", () => {
		expect(sessionLpChange(snap("DIAMOND", "IV", 10, 5, 5), snap("EMERALD", "I", 70, 6, 7), games)).toBe(-40);
	});

	it("is null without a baseline or without games", () => {
		expect(sessionLpChange(null, snap("EMERALD", "I", 10, 22, 19), games)).toBeNull();
		expect(sessionLpChange(snap("EMERALD", "I", 10, 22, 19), snap("EMERALD", "I", 10, 22, 19), [])).toBeNull();
	});

	it("is null when the baseline predates games outside the session", () => {
		expect(sessionLpChange(snap("EMERALD", "II", 80, 18, 18), snap("EMERALD", "I", 10, 22, 19), games)).toBeNull();
	});

	it("is null when the baseline has no W/L", () => {
		expect(sessionLpChange(snap("EMERALD", "II", 80, null, null), snap("EMERALD", "I", 10, 22, 19), games)).toBeNull();
	});
});
