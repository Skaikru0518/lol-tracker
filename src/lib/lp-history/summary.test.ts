import { describe, expect, it } from "vitest";
import { absoluteLpLabel, lpAxisTickLabel, lpAxisTicks, lpChangeRows, lpSummary } from "./summary";

const snap = (id: string, tier: string, rank: string, lp: number) => ({
	id,
	tier,
	rank,
	lp,
	wins: null,
	losses: null,
	createdAt: `2026-10-0${id}T12:00:00.000Z`,
});

describe("lpSummary", () => {
	it("is empty for no snapshots", () => {
		expect(lpSummary([])).toEqual({ current: null, peak: null, change: null });
	});

	it("has no change for a single snapshot", () => {
		const one = snap("1", "EMERALD", "I", 8);
		expect(lpSummary([one])).toEqual({ current: one, peak: one, change: null });
	});

	it("finds the peak across divisions and the change from first to last", () => {
		const series = [snap("1", "EMERALD", "II", 90), snap("2", "EMERALD", "I", 40), snap("3", "EMERALD", "I", 8)];
		const summary = lpSummary(series);
		expect(summary.current?.id).toBe("3");
		expect(summary.peak?.id).toBe("2");
		expect(summary.change).toBe(18);
	});
});

describe("lpChangeRows", () => {
	it("labels each step newest first", () => {
		const rows = lpChangeRows([
			snap("1", "EMERALD", "II", 90),
			snap("2", "EMERALD", "I", 10),
			snap("3", "EMERALD", "I", 29),
			snap("4", "EMERALD", "I", 11),
			snap("5", "EMERALD", "II", 75),
			snap("6", "EMERALD", "II", 75),
		]);
		expect(rows.map((r) => [r.id, r.kind, r.delta])).toEqual([
			["6", "same", 0],
			["5", "demotion", -36],
			["4", "loss", -18],
			["3", "gain", 19],
			["2", "promotion", 20],
			["1", "start", null],
		]);
	});
});

describe("absoluteLpLabel", () => {
	it("inverts toAbsoluteLp for divisions", () => {
		expect(absoluteLpLabel(2350)).toBe("Emerald I · 50 LP");
	});

	it("keeps apex LP above 400 on one tier", () => {
		expect(absoluteLpLabel(2800 + 523)).toBe("Master+ · 523 LP");
	});

	it("clamps negative values to Iron IV", () => {
		expect(absoluteLpLabel(-10)).toBe("Iron IV · 0 LP");
	});
});

describe("unknown tiers", () => {
	const series = [snap("1", "EMERALD", "I", 50), snap("2", "UNKNOWN", "", 0), snap("3", "EMERALD", "I", 70)];

	it("are left out of the summary", () => {
		const summary = lpSummary(series);
		expect(summary.change).toBe(20);
		expect(summary.peak?.id).toBe("3");
	});

	it("are left out of the change rows", () => {
		expect(lpChangeRows(series).map((r) => [r.id, r.kind, r.delta])).toEqual([
			["3", "gain", 20],
			["1", "start", null],
		]);
	});
});

describe("lpAxisTicks", () => {
	it("puts ticks on 100 LP boundaries covering the range", () => {
		expect(lpAxisTicks(2310, 2490)).toEqual([2300, 2400, 2500]);
	});

	it("returns a single tick for a flat series", () => {
		expect(lpAxisTicks(2350, 2350)).toEqual([2300, 2400]);
	});
});

describe("lpAxisTickLabel", () => {
	it("names the division below Master", () => {
		expect(lpAxisTickLabel(2300)).toBe("Emerald I");
	});

	it("shows LP above the Master line instead of repeating Master", () => {
		expect(lpAxisTickLabel(2800)).toBe("Master+");
		expect(lpAxisTickLabel(3300)).toBe("500 LP");
	});
});
