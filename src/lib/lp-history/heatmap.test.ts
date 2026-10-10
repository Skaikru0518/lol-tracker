import { describe, expect, it } from "vitest";
import { budapestSlot, cellTone, heatmapExtremes, slotLabel, winrateHeatmap } from "./heatmap";

const at = (iso: string, win = true) => ({ gameCreation: Date.parse(iso), win });

describe("budapestSlot", () => {
	it("buckets by Budapest weekday (Monday first) and 3-hour slot", () => {
		// 2026-03-02 is a Monday; 17:30 UTC is 18:30 in Budapest (CET)
		expect(budapestSlot(Date.parse("2026-03-02T17:30:00Z"))).toEqual({ day: 0, slot: 6 });
		// Sunday 23:30 UTC is already Monday 00:30 in Budapest
		expect(budapestSlot(Date.parse("2026-03-01T23:30:00Z"))).toEqual({ day: 0, slot: 0 });
		// summer time (CEST, UTC+2): Saturday 2026-07-04 20:59 UTC is 22:59
		expect(budapestSlot(Date.parse("2026-07-04T20:59:00Z"))).toEqual({ day: 5, slot: 7 });
	});
});

describe("winrateHeatmap", () => {
	it("returns all 56 cells with wins and games per slot", () => {
		const cells = winrateHeatmap([at("2026-03-02T17:30:00Z"), at("2026-03-02T18:10:00Z", false), at("2026-03-09T17:10:00Z")]);
		expect(cells).toHaveLength(56);
		expect(cells.find((c) => c.day === 0 && c.slot === 6)).toEqual({ day: 0, slot: 6, wins: 2, games: 3 });
		expect(cells.filter((c) => c.games > 0)).toHaveLength(1);
	});
});

describe("cellTone", () => {
	it("hides win rate below three games", () => {
		expect(cellTone({ day: 0, slot: 0, wins: 2, games: 2 })).toBeNull();
	});

	it("gives the win rate and a confidence that grows with games", () => {
		expect(cellTone({ day: 0, slot: 0, wins: 3, games: 4 })).toEqual({ winRate: 75, confidence: 0.4 });
		expect(cellTone({ day: 0, slot: 0, wins: 6, games: 12 })).toEqual({ winRate: 50, confidence: 1 });
	});
});

describe("heatmapExtremes", () => {
	it("picks the best and worst slot with at least five games", () => {
		const cells = [
			{ day: 0, slot: 6, wins: 7, games: 10 },
			{ day: 6, slot: 0, wins: 3, games: 10 },
			{ day: 2, slot: 3, wins: 4, games: 4 },
		];
		expect(heatmapExtremes(cells)).toEqual({ best: cells[0], worst: cells[1] });
	});

	it("is null when every qualifying slot has the same win rate", () => {
		expect(heatmapExtremes([{ day: 0, slot: 6, wins: 3, games: 5 }, { day: 1, slot: 2, wins: 6, games: 10 }])).toBeNull();
	});

	it("breaks ties by sample size at both ends", () => {
		const cells = [
			{ day: 0, slot: 0, wins: 4, games: 5 },
			{ day: 0, slot: 1, wins: 8, games: 10 },
			{ day: 1, slot: 0, wins: 1, games: 5 },
			{ day: 1, slot: 1, wins: 2, games: 10 },
		];
		expect(heatmapExtremes(cells)).toEqual({ best: cells[1], worst: cells[3] });
	});

	it("is null without two qualifying slots", () => {
		expect(heatmapExtremes([{ day: 0, slot: 6, wins: 7, games: 10 }])).toBeNull();
	});
});

describe("slotLabel", () => {
	it("names 3-hour slots", () => {
		expect(slotLabel(0)).toBe("0–3");
		expect(slotLabel(6)).toBe("18–21");
		expect(slotLabel(7)).toBe("21–24");
	});
});
