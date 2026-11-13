import { describe, expect, it } from "vitest";
import { FULL_RUN_EVERY_MS, nextRunState, parseRunState, planAchievementRun } from "./cron-plan";

const now = new Date("2026-11-13T04:00:00Z");
const hoursAgo = (h: number) => now.getTime() - h * 60 * 60 * 1000;

describe("planAchievementRun", () => {
	it("runs everyone on the first run", () => {
		expect(planAchievementRun(null, now, false)).toEqual({ full: true, since: null });
	});

	it("runs only changed accounts since the last run otherwise", () => {
		expect(planAchievementRun({ at: hoursAgo(24), fullAt: hoursAgo(48) }, now, false)).toEqual({ full: false, since: new Date(hoursAgo(24)) });
	});

	it("runs everyone when forced", () => {
		expect(planAchievementRun({ at: hoursAgo(24), fullAt: hoursAgo(48) }, now, true).full).toBe(true);
	});

	it("runs everyone once the last full run is a week old (new definitions, missed changes)", () => {
		expect(planAchievementRun({ at: hoursAgo(24), fullAt: now.getTime() - FULL_RUN_EVERY_MS }, now, false).full).toBe(true);
	});

	it("runs everyone when a season started since the last run", () => {
		const newYear = new Date("2026-01-08T12:00:00Z");
		expect(planAchievementRun({ at: new Date("2026-01-07T04:00:00Z").getTime(), fullAt: new Date("2026-01-06T04:00:00Z").getTime() }, newYear, false).full).toBe(true);
	});
});

describe("parseRunState", () => {
	it("reads a stored state and rejects anything else", () => {
		expect(parseRunState(JSON.stringify({ at: 1, fullAt: 2 }))).toEqual({ at: 1, fullAt: 2 });
		expect(parseRunState(null)).toBeNull();
		expect(parseRunState("nope")).toBeNull();
		expect(parseRunState(JSON.stringify({ at: "x" }))).toBeNull();
	});
});

describe("nextRunState", () => {
	it("moves the full-run time only on a full run", () => {
		expect(nextRunState({ at: 1, fullAt: 1 }, { full: false, since: new Date(1) }, now)).toEqual({ at: now.getTime(), fullAt: 1 });
		expect(nextRunState({ at: 1, fullAt: 1 }, { full: true, since: null }, now)).toEqual({ at: now.getTime(), fullAt: now.getTime() });
	});
});
