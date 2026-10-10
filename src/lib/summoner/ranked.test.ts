import { describe, expect, it } from "vitest";
import { shouldSnapshot } from "./ranked";

const entry = { tier: "EMERALD", rank: "I", leaguePoints: 8 };

describe("shouldSnapshot", () => {
	it("snapshots when there is no previous snapshot", () => {
		expect(shouldSnapshot(null, entry)).toBe(true);
	});

	it("skips when tier, rank and LP are unchanged", () => {
		expect(shouldSnapshot({ tier: "EMERALD", rank: "I", lp: 8 }, entry)).toBe(false);
	});

	it("snapshots on an LP change", () => {
		expect(shouldSnapshot({ tier: "EMERALD", rank: "I", lp: 26 }, entry)).toBe(true);
	});

	it("snapshots on a division change with equal LP", () => {
		expect(shouldSnapshot({ tier: "EMERALD", rank: "II", lp: 8 }, entry)).toBe(true);
	});

	it("snapshots on a tier change", () => {
		expect(shouldSnapshot({ tier: "DIAMOND", rank: "I", lp: 8 }, entry)).toBe(true);
	});
});
