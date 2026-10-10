import { describe, expect, it } from "vitest";
import { MILESTONES, RANK_THRESHOLDS } from "./definitions";
import { SEASONAL } from "../seasonal/definitions";

describe("progress definitions", () => {
	it("has 14 four-tier milestones with ascending thresholds", () => {
		expect(MILESTONES).toHaveLength(14);
		for (const def of MILESTONES) {
			expect(def.thresholds).toHaveLength(4);
			expect([...def.thresholds].sort((a, b) => a - b)).toEqual([...def.thresholds]);
		}
		expect(MILESTONES.find((m) => m.id === "peak-rank")?.thresholds).toEqual(RANK_THRESHOLDS);
	});

	it("has 8 seasonal achievements, only Season Peak tiered", () => {
		expect(SEASONAL).toHaveLength(8);
		expect(SEASONAL.filter((s) => s.thresholds.length === 4).map((s) => s.id)).toEqual(["season-peak"]);
	});

	it("uses unique ids and an icon per achievement", () => {
		const ids = [...MILESTONES, ...SEASONAL].map((d) => d.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const def of [...MILESTONES, ...SEASONAL]) expect(def.icon).toBe(def.id);
	});
});
