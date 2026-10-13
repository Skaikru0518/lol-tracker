import { describe, expect, it } from "vitest";
import { estimateMmr, mmrTooltip } from "./mmr-estimate";

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

	it("weights the LP signal by games and the lobby by known players / 3", () => {
		// LP: 2550 + 2 divisions = 2750, weight 6. Lobby: 2450, weight 6 / 3 = 2.
		const e = estimateMmr({ ...base, lpChanges: games(4, 25, 2, 15), lobbies: [[2400, 2450, 2500], [2400, 2450, 2500]] });
		expect(e?.absolute).toBe(2675);
	});
});

describe("mmrTooltip", () => {
	it("lists the sample and skips missing parts", () => {
		const e = estimateMmr({ ...base, lpChanges: games(4, 25, 2, 15) })!;
		expect(mmrTooltip(e)).toBe("6 games · +25 / −15 LP");
		const lobbyOnly = estimateMmr({ ...base, lobbies: [[2800, 2900, 3000]] })!;
		expect(mmrTooltip(lobbyOnly)).toBe("3 known lobby players");
	});
});
