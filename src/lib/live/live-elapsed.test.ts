import { describe, expect, it } from "vitest";
import { liveElapsedSeconds } from "./live-elapsed";

const now = 1_000_000_000_000;

describe("liveElapsedSeconds", () => {
	it("counts from the game start time", () => {
		expect(liveElapsedSeconds(now - 90_500, 10, now)).toBe(90);
	});

	it("falls back to gameLength before the start time is known", () => {
		expect(liveElapsedSeconds(0, 42, now)).toBe(42);
		expect(liveElapsedSeconds(undefined, 42, now)).toBe(42);
	});

	it("never returns a negative value", () => {
		expect(liveElapsedSeconds(now + 5_000, undefined, now)).toBe(0);
		expect(liveElapsedSeconds(0, -30, now)).toBe(0);
	});
});
