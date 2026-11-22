import { describe, expect, it } from "vitest";
import { seasonOneTrick } from "./one-trick";

const champ = (championName: string, games: number) => ({ championName, games });

describe("seasonOneTrick", () => {
	it("names the champion with half or more of the season's games", () => {
		expect(seasonOneTrick([champ("Lulu", 9), champ("Nami", 11)])).toBe("one-trick:Nami");
	});

	it("gives nothing below half of the season", () => {
		expect(seasonOneTrick([champ("Nami", 10), champ("Lulu", 6), champ("Soraka", 5)])).toBeNull();
	});

	it("needs 10 games on the champion", () => {
		expect(seasonOneTrick([champ("Nami", 9)])).toBeNull();
		expect(seasonOneTrick([])).toBeNull();
	});
});
