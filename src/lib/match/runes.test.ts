import { describe, expect, it } from "vitest";
import { plainText, runeStatLines } from "./runes";

const pta = { id: 8005, name: "Press the Attack", shortDesc: "", endOfGameStatDescs: ["Total Damage: @eogvar1@", "Bonus Damage: @eogvar2@"] };

describe("runeStatLines", () => {
	it("fills the end-of-game templates with the match values", () => {
		expect(runeStatLines(pta, [1842, 624, 0])).toEqual(["Total Damage: 1,842", "Bonus Damage: 624"]);
	});

	it("joins adjacent variables like the boots timer", () => {
		const boots = { ...pta, endOfGameStatDescs: ["Boots Arrival Time: @eogvar1@:@eogvar2@@eogvar3@"] };
		expect(runeStatLines(boots, [10, 0, 5])).toEqual(["Boots Arrival Time: 10:05"]);
	});

	it("is empty for an unknown rune", () => {
		expect(runeStatLines(undefined, [1, 2, 3])).toEqual([]);
	});
});

describe("plainText", () => {
	it("strips markup and collapses whitespace", () => {
		expect(plainText("Deal <b>more</b> damage.<br><br>Then   <i>heal</i>.")).toBe("Deal more damage. Then heal.");
	});
});
