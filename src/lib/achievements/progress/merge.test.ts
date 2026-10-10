import { describe, expect, it } from "vitest";
import { mergeProgress } from "./merge";

const now = new Date("2026-10-11T12:00:00Z");
const earlier = new Date("2026-05-01T12:00:00Z");
const row = { achievementId: "veteran", scope: "all" };

describe("mergeProgress", () => {
	it("dates every tier reached on the first save", () => {
		expect(mergeProgress(undefined, { ...row, value: 600, tier: 3 }, now)).toEqual({ ...row, value: 600, tier: 3, reachedAt: [now, now, now] });
		expect(mergeProgress(undefined, { ...row, value: 3, tier: 0 }, now).reachedAt).toEqual([]);
	});

	it("keeps old dates and appends only newly reached tiers", () => {
		const stored = { ...row, value: 250, tier: 2, reachedAt: [earlier, earlier] };
		expect(mergeProgress(stored, { ...row, value: 1200, tier: 4 }, now)).toEqual({ ...row, value: 1200, tier: 4, reachedAt: [earlier, earlier, now, now] });
	});

	it("never lowers the tier, even when the value drops (derank, pruned games, partial mastery)", () => {
		const stored = { ...row, achievementId: "peak-rank", value: 7, tier: 3, reachedAt: [earlier, earlier, earlier] };
		expect(mergeProgress(stored, { ...row, achievementId: "peak-rank", value: 5, tier: 1 }, now)).toEqual({ ...stored, value: 5 });
	});

	it("keeps the highest value for peaks, so the card never contradicts the tier", () => {
		const stored = { ...row, achievementId: "peak-rank", value: 7, tier: 3, reachedAt: [earlier, earlier, earlier] };
		expect(mergeProgress(stored, { ...row, achievementId: "peak-rank", value: 5, tier: 1 }, now, { keepHighestValue: true })).toEqual(stored);
	});
});
