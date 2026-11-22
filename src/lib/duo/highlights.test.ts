import { describe, expect, it } from "vitest";
import { duoHighlights } from "./highlights";

const p = (puuid: string, games: number, difference: number | null) => ({ puuid, games, difference });

describe("duoHighlights", () => {
	it("picks the most games, the best and the toughest difference", () => {
		const h = duoHighlights([p("a", 20, -5), p("b", 11, 8), p("c", 4, 29), p("d", 4, -25)]);
		expect([h.mostPlayed?.puuid, h.best?.puuid, h.toughest?.puuid]).toEqual(["a", "c", "d"]);
	});

	it("only calls a positive difference best and a negative one toughest", () => {
		const h = duoHighlights([p("a", 5, 3), p("b", 4, null)]);
		expect(h.best?.puuid).toBe("a");
		expect(h.toughest).toBeNull();
		expect(duoHighlights([p("a", 5, -3)]).best).toBeNull();
	});

	it("is empty without partners", () => {
		expect(duoHighlights([])).toEqual({ mostPlayed: null, best: null, toughest: null });
	});
});
