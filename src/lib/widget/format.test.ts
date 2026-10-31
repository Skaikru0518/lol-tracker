import { describe, expect, it } from "vitest";
import { lpChangeLabel, rankLabel, sessionSince, shortRank, showsPart, winRate, winRateLabel } from "./format";

describe("rankLabel / shortRank", () => {
	it("names tier and division, apex without division", () => {
		expect(rankLabel({ tier: "EMERALD", division: "II", leaguePoints: 54 })).toBe("Emerald II");
		expect(rankLabel({ tier: "GRANDMASTER", division: "I", leaguePoints: 300 })).toBe("Grandmaster");
		expect(rankLabel(null)).toBe("Unranked");
		expect(shortRank({ tier: "EMERALD", division: "II", leaguePoints: 54 })).toBe("E2");
		expect(shortRank({ tier: "GRANDMASTER", division: "I", leaguePoints: 300 })).toBe("GM");
		expect(shortRank(null)).toBe("—");
	});
});

describe("winRate / lpChangeLabel", () => {
	it("rounds the session win rate, null without games", () => {
		expect(winRate(5, 2)).toBe(71);
		expect(winRate(0, 0)).toBeNull();
	});

	it("labels the win rate in brackets", () => {
		expect(winRateLabel(5, 2)).toBe("(71%)");
		expect(winRateLabel(0, 0)).toBeNull();
	});

	it("signs the LP change", () => {
		expect(lpChangeLabel(38)).toBe("+38");
		expect(lpChangeLabel(-12)).toBe("−12");
		expect(lpChangeLabel(0)).toBe("±0");
	});
});

describe("sessionSince", () => {
	const loadedAt = new Date(2026, 9, 31, 20, 15).getTime();

	it("is undefined for auto, local midnight for today, page load for load", () => {
		expect(sessionSince("auto", loadedAt)).toBeUndefined();
		expect(sessionSince("today", loadedAt)).toBe(new Date(2026, 9, 31).getTime());
		expect(sessionSince("load", loadedAt)).toBe(loadedAt);
	});
});

describe("showsPart", () => {
	it("applies a toggle only where the style has a place for it", () => {
		expect(showsPart("pill", ["id", "server", "lp"], "id")).toBe(false);
		expect(showsPart("bar", ["id", "wr"], "wr")).toBe(true);
		expect(showsPart("square", ["id"], "wr")).toBe(false);
		expect(showsPart("strip", ["wr"], "wr")).toBe(true);
		expect(showsPart("square", ["lp"], "server")).toBe(false);
		expect(showsPart("square", ["server"], "server")).toBe(true);
	});
});
