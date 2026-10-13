import { describe, expect, it } from "vitest";
import { formatDiff, formatMetric } from "./format";

describe("formatMetric", () => {
	it("formats shares as percent, rates with one decimal, counts as integers", () => {
		expect(formatMetric("killParticipation", 0.634)).toBe("63%");
		expect(formatMetric("csPerMin", 7.25)).toBe("7.3");
		expect(formatMetric("goldDiffPerMin", -12.3)).toBe("-12.3");
		expect(formatMetric("kda", 3.456)).toBe("3.46");
		expect(formatMetric("controlWards", 4)).toBe("4");
	});
});

describe("formatDiff", () => {
	it("signs and groups whole numbers", () => {
		expect(formatDiff(1240)).toBe("+1,240");
		expect(formatDiff(-35)).toBe("-35");
		expect(formatDiff(0)).toBe("0");
	});
});
