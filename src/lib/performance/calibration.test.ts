import { describe, expect, it } from "vitest";
import { type Baselines } from "@/lib/validators/performance";
import { calibrate } from "./calibration";
import { METRIC_IDS } from "./weights";

const roles: Baselines["roles"] = {
	MIDDLE: { games: 500, metrics: Object.fromEntries(METRIC_IDS.map((id) => [id, Array.from({ length: 21 }, (_, i) => i - 10)])) },
};

describe("calibrate", () => {
	it("builds overall and per-category quantiles of raw scores per role", () => {
		const atMedian = Object.fromEntries(METRIC_IDS.map((id) => [id, 0]));
		const result = calibrate([{ role: "MIDDLE", values: atMedian }, { role: "MIDDLE", values: atMedian }], roles);
		expect(result.MIDDLE?.overall).toEqual(Array(21).fill(50));
		expect(result.MIDDLE?.categories.vision).toEqual(Array(21).fill(50));
	});

	it("skips roles without a baseline", () => {
		expect(calibrate([{ role: "TOP", values: { csPerMin: 1 } }], roles)).toEqual({});
	});
});
