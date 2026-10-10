import { describe, expect, it } from "vitest";
import { allMasteryPlan } from "./mastery-plan";

const now = new Date("2026-10-10T12:00:00Z");
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

describe("allMasteryPlan", () => {
	it("asks Riot when the full list was never synced, however many rows are stored", () => {
		expect(allMasteryPlan(null, now)).toBe("riot");
	});

	it("serves a full list synced in the last 30 minutes from the DB", () => {
		expect(allMasteryPlan(minutesAgo(5), now)).toBe("cached");
	});

	it("serves an older full list and refreshes it in the background", () => {
		expect(allMasteryPlan(minutesAgo(90), now)).toBe("cached-revalidate");
	});
});
