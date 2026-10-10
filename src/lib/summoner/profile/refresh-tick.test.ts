import { describe, expect, it } from "vitest";
import { refreshTick } from "./refresh-tick";

const INTERVAL = 300_000;

describe("refreshTick", () => {
	it("is not due before the deadline and counts down in whole seconds", () => {
		expect(refreshTick(1_000, 61_500, INTERVAL)).toEqual({ due: false, deadline: 61_500, secondsLeft: 61 });
	});

	it("is due at the deadline and schedules the next one", () => {
		expect(refreshTick(61_500, 61_500, INTERVAL)).toEqual({ due: true, deadline: 361_500, secondsLeft: 300 });
	});

	it("is due once after a long pause and does not stack missed refreshes", () => {
		const tick = refreshTick(10_000_000, 61_500, INTERVAL);
		expect(tick.due).toBe(true);
		expect(tick.deadline).toBe(10_300_000);
	});
});
