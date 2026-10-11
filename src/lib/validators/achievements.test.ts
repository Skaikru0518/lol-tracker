import { describe, expect, it } from "vitest";
import { achievementPayloadSchema } from "./achievements";

describe("achievementPayloadSchema", () => {
	it("accepts the API payload with and without rarity", () => {
		const payload = {
			form: [{ achievementId: "carry", earnedAt: "2026-10-11T12:00:00.000Z" }],
			progress: [{ achievementId: "veteran", scope: "all", value: 312, tier: 2, reachedAt: ["2026-10-11T12:00:00.000Z", "2026-10-11T12:00:00.000Z"] }],
			rarity: { players: 40, shares: { "veteran:all": [0.5, 0.2] } },
		};
		expect(achievementPayloadSchema.parse(payload)).toEqual(payload);
		expect(achievementPayloadSchema.parse({ ...payload, rarity: null }).rarity).toBeNull();
	});
});
