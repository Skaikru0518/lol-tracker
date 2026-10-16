import { describe, expect, it } from "vitest";
import { estimateMmr, lobbyRankAt, mmrTooltip, pickLpChanges } from "./mmr-estimate";

const current = { tier: "DIAMOND", rank: "III", lp: 50 }; // absolute 2550
const base = { queueType: "RANKED_FLEX_SR" as const, current, lpChanges: [], lobbies: [], cutoff: { grandmaster: 250, challenger: 600 } };
const games = (wins: number, gain: number, losses: number, loss: number) => [
	...Array.from({ length: wins }, () => ({ win: true, change: gain })),
	...Array.from({ length: losses }, () => ({ win: false, change: -loss })),
];

describe("estimateMmr", () => {
	it("moves (W − L) / 5 divisions from the current rank", () => {
		const e = estimateMmr({ ...base, lpChanges: games(4, 25, 2, 15) });
		expect(e).toMatchObject({ tier: "DIAMOND", rank: "I", absolute: 2750, direction: "above", lpGames: 6, winGain: 25, lossLoss: 15, lobbyPlayers: 0 });
	});

	it("is equal when gains match losses", () => {
		expect(estimateMmr({ ...base, lpChanges: games(3, 20, 3, 20) })).toMatchObject({ tier: "DIAMOND", rank: "III", direction: "equal" });
	});

	it("clamps the LP offset to four divisions", () => {
		expect(estimateMmr({ ...base, lpChanges: games(5, 40, 1, 1) })?.absolute).toBe(2950);
	});

	it("drops zero, oversized and wrong-sign changes", () => {
		const e = estimateMmr({ ...base, lpChanges: [...games(3, 20, 2, 20), { win: false, change: 0 }, { win: true, change: 50 }, { win: true, change: -18 }] });
		expect(e?.lpGames).toBe(5);
	});

	it("needs both a win and a loss for the LP signal", () => {
		expect(estimateMmr({ ...base, lpChanges: games(6, 22, 0, 0) })).toBeNull();
	});

	it("gives no estimate with fewer than 5 LP games and no lobby", () => {
		expect(estimateMmr({ ...base, lpChanges: games(2, 25, 2, 15) })).toBeNull();
	});

	it("uses the lobby alone when there is no LP signal", () => {
		const e = estimateMmr({ ...base, lobbies: [[2800, 2900, 3000], [2600, 2700, 2800]] });
		expect(e).toMatchObject({ absolute: 2800, tier: "MASTER", lpGames: 0, winGain: null, lossLoss: null, lobbyPlayers: 6 });
	});

	it("skips lobby games with fewer than 3 known players", () => {
		expect(estimateMmr({ ...base, lobbies: [[3000, 3100]] })).toBeNull();
	});

	it("weights the LP signal by its decayed game count and the lobby by known players / 3", () => {
		// LP: 2550 + 2 divisions = 2750, weight 1 + 0.5^0.1 + … + 0.5^0.5 ≈ 5.08. Lobby: 2450, weight 6 / 3 = 2.
		const e = estimateMmr({ ...base, lpChanges: games(4, 25, 2, 15), lobbies: [[2400, 2450, 2500], [2400, 2450, 2500]] });
		expect(e?.absolute).toBe(2665);
	});

	it("counts newer LP games more, halving the weight every 10 games", () => {
		const lpChanges = [{ win: true, change: 30 }, ...Array.from({ length: 9 }, () => ({ win: false, change: -20 })), { win: true, change: 10 }];
		// W = (30 · 1 + 10 · 0.5) / 1.5 ≈ 23.3, L = 20 → +0.67 divisions
		expect(estimateMmr({ ...base, lpChanges })).toMatchObject({ winGain: 23, lossLoss: 20, absolute: 2617, lpGames: 11 });
	});

	it("is highly confident with many LP games and a lobby that agrees", () => {
		const e = estimateMmr({ ...base, lpChanges: games(8, 22, 8, 18), lobbies: [[2600, 2650, 2700], [2600, 2650, 2700]] });
		expect(e?.confidence).toBe("high");
	});

	it("is not confident when the signals disagree by more than four divisions", () => {
		const e = estimateMmr({ ...base, lpChanges: games(8, 22, 8, 18), lobbies: [[1800, 1900, 2000], [1800, 1900, 2000]] });
		expect(e?.confidence).toBe("low");
	});

	it("is not confident with few LP games and few lobby players", () => {
		expect(estimateMmr({ ...base, lobbies: [[2800, 2900, 3000]] })?.confidence).toBe("low");
	});

	it("is moderately confident in between", () => {
		expect(estimateMmr({ ...base, lpChanges: games(5, 22, 5, 18) })?.confidence).toBe("medium");
	});
});

describe("mmrTooltip", () => {
	it("lists the sample and skips missing parts", () => {
		const e = estimateMmr({ ...base, lpChanges: games(4, 25, 2, 15) })!;
		expect(mmrTooltip(e)).toBe("Low confidence · 6 games · +25 / −15 LP");
		const lobbyOnly = estimateMmr({ ...base, lobbies: [[2800, 2900, 3000]] })!;
		expect(mmrTooltip(lobbyOnly)).toBe("Low confidence · 3 known lobby players");
	});
});

describe("pickLpChanges", () => {
	const games = Array.from({ length: 30 }, (_, i) => ({ id: `g${i}`, win: i % 2 === 0 }));

	it("takes the newest exact changes up to the limit, skipping games without one", () => {
		const changes = new Map(games.filter((_, i) => i % 3 !== 0).map((g) => [g.id, g.win ? 20 : -20] as const));
		const picked = pickLpChanges(games, changes, 5);
		// g0, g3, g6 have no exact change; g1, g2, g4, g5, g7 are the newest five that do
		expect(picked).toEqual([
			{ win: false, change: -20 },
			{ win: true, change: 20 },
			{ win: true, change: 20 },
			{ win: false, change: -20 },
			{ win: false, change: -20 },
		]);
	});

	it("returns fewer when the window runs out", () => {
		expect(pickLpChanges(games.slice(0, 3), new Map([["g1", -15]]), 20)).toEqual([{ win: false, change: -15 }]);
	});
});

describe("lobbyRankAt", () => {
	const DAY = 86_400_000;
	const now = Date.parse("2026-03-20T10:00:00Z");
	const end = Date.parse("2026-03-10T10:00:00Z");
	const snap = (createdAt: string, tier: string, rank: string, lp: number) => ({ id: createdAt, tier, rank, lp, wins: null, losses: null, createdAt });
	const entry = (updatedAt: number) => ({ tier: "PLATINUM", rank: "I", leaguePoints: 0, updatedAt: new Date(updatedAt) });

	it("uses the player's snapshot at the time of the game", () => {
		const snapshots = [snap("2026-03-01T10:00:00Z", "GOLD", "I", 50), snap("2026-03-15T10:00:00Z", "PLATINUM", "II", 0)];
		expect(lobbyRankAt(snapshots, end, entry(now), now)).toBe(1550);
	});

	it("falls back to a fresh current entry", () => {
		expect(lobbyRankAt(undefined, end, entry(now - 5 * DAY), now)).toBe(1900);
	});

	it("skips an entry not refreshed for 30 days", () => {
		expect(lobbyRankAt(undefined, end, entry(now - 31 * DAY), now)).toBeNull();
	});

	it("skips an entry from another season than the game", () => {
		expect(lobbyRankAt(undefined, Date.parse("2025-12-20T10:00:00Z"), entry(now), now)).toBeNull();
	});
});
