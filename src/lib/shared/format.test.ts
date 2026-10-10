import { describe, expect, it } from "vitest";
import { csPerMinute, formatDuration, formatPoints, formatThousands, kdaRatio, timeAgo } from "./format";

describe("formatDuration", () => {
	it("formats minutes and padded seconds", () => {
		expect(formatDuration(1523)).toBe("25:23");
		expect(formatDuration(65)).toBe("1:05");
	});

	it("clamps negative values to zero", () => {
		expect(formatDuration(-12)).toBe("0:00");
	});
});

describe("formatThousands", () => {
	it("abbreviates thousands with one decimal", () => {
		expect(formatThousands(13812)).toBe("13.8k");
	});

	it("rounds values below a thousand", () => {
		expect(formatThousands(812.6)).toBe("813");
	});
});

describe("timeAgo", () => {
	const now = Date.parse("2026-10-10T12:00:00Z");

	it("is 'Just now' under five minutes and for future timestamps", () => {
		expect(timeAgo(now - 60_000, now)).toBe("Just now");
		expect(timeAgo(now + 60_000, now)).toBe("Just now");
	});

	it("rounds minutes down to five", () => {
		expect(timeAgo(now - 17 * 60_000, now)).toBe("15m ago");
	});

	it("switches to hours and days", () => {
		expect(timeAgo(now - 3 * 3_600_000, now)).toBe("3h ago");
		expect(timeAgo(now - 4 * 86_400_000, now)).toBe("4d ago");
	});
});

describe("kdaRatio", () => {
	it("is (kills + assists) / deaths rounded to two decimals", () => {
		expect(kdaRatio(8, 5, 10)).toBe(3.6);
		expect(kdaRatio(1, 3, 1)).toBe(0.67);
	});

	it("is null for a deathless game (perfect KDA)", () => {
		expect(kdaRatio(2, 0, 24)).toBeNull();
	});
});

describe("csPerMinute", () => {
	it("divides by game minutes with one decimal", () => {
		expect(csPerMinute(189, 1523)).toBe(7.4);
	});

	it("is 0 for a zero-length game", () => {
		expect(csPerMinute(10, 0)).toBe(0);
	});
});

describe("formatPoints", () => {
	it("abbreviates thousands without decimals", () => {
		expect(formatPoints(412_345)).toBe("412k");
	});

	it("uses two decimals for millions", () => {
		expect(formatPoints(1_254_000)).toBe("1.25M");
	});

	it("keeps small values as is", () => {
		expect(formatPoints(980)).toBe("980");
	});
});
