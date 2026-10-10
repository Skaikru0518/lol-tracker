import { describe, expect, it } from "vitest";
import { earnedCount } from "./count";

describe("earnedCount", () => {
	it("counts only saved ids that still exist in the definitions", () => {
		expect(earnedCount([{ achievementId: "a" }, { achievementId: "gone" }, { achievementId: "b" }], [{ id: "a" }, { id: "b" }, { id: "c" }])).toBe(2);
		expect(earnedCount(undefined, [{ id: "a" }])).toBe(0);
	});
});
