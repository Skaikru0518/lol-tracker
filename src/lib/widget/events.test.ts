import { describe, expect, it } from "vitest";
import { type WidgetData } from "@/lib/validators/widget";
import { SAMPLE_WIDGET } from "./sample";
import { trailingWinStreak, widgetEvents } from "./events";

const game = (id: string, win: boolean) => ({ matchId: id, championName: "Ahri", win, kills: 1, deaths: 1, assists: 1, start: 0, end: 0 });
const data = (patch: Partial<WidgetData>): WidgetData => ({ ...SAMPLE_WIDGET, games: [game("a", true)], ...patch });

describe("trailingWinStreak", () => {
	it("counts the wins at the newest end", () => {
		expect(trailingWinStreak([game("a", true), game("b", false), game("c", true), game("d", true)])).toBe(2);
		expect(trailingWinStreak([game("a", true), game("b", false)])).toBe(0);
		expect(trailingWinStreak([])).toBe(0);
	});
});

describe("widgetEvents", () => {
	it("is empty on the first load", () => {
		expect(widgetEvents(null, data({}))).toEqual({ newGames: [], result: null, lpDelta: null, rank: null });
	});

	it("finds new games, the newest result and the LP moved", () => {
		const prev = data({ rank: { tier: "EMERALD", division: "II", leaguePoints: 54 } });
		const next = data({ rank: { tier: "EMERALD", division: "II", leaguePoints: 74 }, games: [game("a", true), game("b", false), game("c", true)] });
		expect(widgetEvents(prev, next)).toEqual({ newGames: ["b", "c"], result: "win", lpDelta: 20, rank: null });
	});

	it("detects a promotion and a demotion across tiers", () => {
		const d1 = { tier: "EMERALD", division: "I", leaguePoints: 90 };
		const p1 = { tier: "DIAMOND", division: "IV", leaguePoints: 10 };
		expect(widgetEvents(data({ rank: d1 }), data({ rank: p1 })).rank).toBe("up");
		expect(widgetEvents(data({ rank: p1 }), data({ rank: d1 })).rank).toBe("down");
		expect(widgetEvents(data({ rank: p1 }), data({ rank: d1 })).lpDelta).toBe(-20);
	});

	it("ignores LP without a rank on either side", () => {
		expect(widgetEvents(data({ rank: null }), data({})).lpDelta).toBeNull();
	});
});
