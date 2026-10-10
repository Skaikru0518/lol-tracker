import { describe, expect, it } from "vitest";
import { absoluteLpLabel, dailyLpPoints, dayKeyToDate, groupChangesByDay, localDayKey, lpAxisTickLabel, lpChartNotice, lpAxisTicks, lpChangeRows, lpSummary } from "./summary";

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

const at = (id: string, createdAt: string, lp: number, wins: number | null = null, losses: number | null = null, tier = "EMERALD") => ({
	id,
	tier,
	rank: "I",
	lp,
	wins,
	losses,
	createdAt,
});

describe("localDayKey / dayKeyToDate", () => {
	it("round-trips a local day", () => {
		const key = localDayKey("2026-10-03T12:00:00.000Z");
		expect(key).toBe("2026-10-03");
		expect(localDayKey(dayKeyToDate(key).toISOString())).toBe(key);
	});
});

describe("dailyLpPoints", () => {
	it("keeps the last snapshot of each played day, oldest first", () => {
		const points = dailyLpPoints([
			at("a", "2026-10-01T12:00:00.000Z", 10),
			at("b", "2026-10-01T13:00:00.000Z", 30),
			at("c", "2026-10-04T12:00:00.000Z", 50),
		]);
		expect(points.map((p) => [p.day, p.snapshot.id])).toEqual([
			["2026-10-01", "b"],
			["2026-10-04", "c"],
		]);
		expect(points[0].value).toBe(2300 + 30);
	});

	it("collapses a single day to one point", () => {
		expect(dailyLpPoints([at("a", "2026-10-01T12:00:00.000Z", 10), at("b", "2026-10-01T13:00:00.000Z", 30)])).toHaveLength(1);
	});

	it("skips unknown tiers", () => {
		expect(dailyLpPoints([at("a", "2026-10-01T12:00:00.000Z", 10, null, null, "UNKNOWN")])).toEqual([]);
	});
});

describe("groupChangesByDay", () => {
	it("groups newest first with the day's net LP and W/L from running totals", () => {
		const rows = lpChangeRows([
			at("a", "2026-10-01T12:00:00.000Z", 10, 10, 10),
			at("b", "2026-10-01T13:00:00.000Z", 30, 11, 10),
			at("c", "2026-10-02T12:00:00.000Z", 50, 12, 10),
			at("d", "2026-10-02T12:30:00.000Z", 32, 12, 11),
			at("e", "2026-10-02T13:00:00.000Z", 52, 13, 11),
		]);
		const groups = groupChangesByDay(rows);
		expect(groups.map((g) => [g.day, g.latest.id, g.rows.length, g.delta, g.wins, g.losses])).toEqual([
			["2026-10-02", "e", 3, 22, 2, 1],
			["2026-10-01", "b", 2, 20, 1, 0],
		]);
	});

	it("counts gain and loss kinds when W/L is unknown", () => {
		const groups = groupChangesByDay(
			lpChangeRows([at("a", "2026-10-01T12:00:00.000Z", 10), at("b", "2026-10-01T12:30:00.000Z", 30), at("c", "2026-10-01T13:00:00.000Z", 12)]),
		);
		expect([groups[0].wins, groups[0].losses, groups[0].delta]).toEqual([1, 1, 2]);
	});

	it("has no delta for a day holding only the first snapshot", () => {
		expect(groupChangesByDay(lpChangeRows([at("a", "2026-10-01T12:00:00.000Z", 10)]))[0].delta).toBeNull();
	});

	it("never counts negative games across a season reset", () => {
		const groups = groupChangesByDay(lpChangeRows([at("a", "2026-10-01T12:00:00.000Z", 10, 80, 70), at("b", "2026-10-02T12:00:00.000Z", 30, 1, 0)]));
		expect([groups[0].wins, groups[0].losses]).toEqual([1, 0]);
	});
});

describe("season reset", () => {
	const reset = [at("a", "2026-10-01T12:00:00.000Z", 50, 80, 70, "DIAMOND"), at("b", "2026-10-02T12:00:00.000Z", 20, 2, 3, "GOLD")];

	it("marks a drop in the W/L totals as a new season, not a demotion", () => {
		const [row] = lpChangeRows(reset);
		expect([row.kind, row.delta]).toEqual(["reset", null]);
	});

	it("counts the new season's placement games for that day", () => {
		const [day] = groupChangesByDay(lpChangeRows(reset));
		expect([day.wins, day.losses, day.delta]).toEqual([2, 3, null]);
	});
});

describe("lpChartNotice", () => {
	it("explains a range with nothing to chart", () => {
		expect(lpChartNotice(0)).toBe("No chartable snapshots in this range.");
	});

	it("explains a single played day", () => {
		expect(lpChartNotice(1)).toBe("Played on one day so far.");
	});

	it("is null once two days can be charted", () => {
		expect(lpChartNotice(2)).toBeNull();
	});
});

describe("zero-LP division changes", () => {
	it("labels a move to a higher division as promotion even when the absolute LP is equal", () => {
		const rows = lpChangeRows([
			{ id: "a", tier: "DIAMOND", rank: "I", lp: 100, wins: null, losses: null, createdAt: "2026-10-01T12:00:00.000Z" },
			{ id: "b", tier: "MASTER", rank: "I", lp: 0, wins: null, losses: null, createdAt: "2026-10-02T12:00:00.000Z" },
		]);
		expect([rows[0].kind, rows[0].delta]).toEqual(["promotion", 0]);
	});
});

describe("zero-LP apex changes", () => {
	it("labels Master → Grandmaster at the same LP as promotion", () => {
		const rows = lpChangeRows([
			{ id: "a", tier: "MASTER", rank: "I", lp: 500, wins: null, losses: null, createdAt: "2026-10-01T12:00:00.000Z" },
			{ id: "b", tier: "GRANDMASTER", rank: "I", lp: 500, wins: null, losses: null, createdAt: "2026-10-02T12:00:00.000Z" },
		]);
		expect(rows[0].kind).toBe("promotion");
	});
});
