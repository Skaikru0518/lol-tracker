import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_QUEUE_IDS, isAchievementEligible } from "./eligibility";

describe("isAchievementEligible", () => {
	it("accepts Ranked Solo, Flex and 5s games", () => {
		expect(ACHIEVEMENT_QUEUE_IDS).toEqual([420, 440, 710]);
		for (const queueId of ACHIEVEMENT_QUEUE_IDS) expect(isAchievementEligible(queueId, 1800)).toBe(true);
	});

	it("rejects Arena, ARAM and normals", () => {
		for (const queueId of [1700, 450, 400, 430]) expect(isAchievementEligible(queueId, 1800)).toBe(false);
	});

	it("rejects remakes under five minutes", () => {
		expect(isAchievementEligible(420, 299)).toBe(false);
		expect(isAchievementEligible(420, 300)).toBe(true);
	});
});
