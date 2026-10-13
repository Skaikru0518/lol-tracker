import { describe, expect, it } from "vitest";
import { RiotApiError } from "@/lib/riot/riot";
import { isRateLimited, nextBatch, planRankedRun } from "./ranked-cron";

const ids = ["a", "b", "c", "d", "e"];

describe("nextBatch", () => {
	it("starts from the beginning without a cursor", () => {
		expect(nextBatch(ids, null, 2)).toEqual(["a", "b"]);
	});

	it("continues after the cursor and wraps around", () => {
		expect(nextBatch(ids, "b", 2)).toEqual(["c", "d"]);
		expect(nextBatch(ids, "d", 3)).toEqual(["e", "a", "b"]);
	});

	it("works when the cursor account no longer exists", () => {
		expect(nextBatch(ids, "bb", 2)).toEqual(["c", "d"]);
	});

	it("never repeats an account in one run", () => {
		expect(nextBatch(ids, "c", 40)).toEqual(["d", "e", "a", "b", "c"]);
		expect(nextBatch([], "c", 40)).toEqual([]);
	});
});

describe("isRateLimited", () => {
	it("recognises a Riot 429 only", () => {
		expect(isRateLimited(new RiotApiError(429, "Rate limit exceeded"))).toBe(true);
		expect(isRateLimited(new RiotApiError(404, "Not Found"))).toBe(false);
		expect(isRateLimited(new Error("boom"))).toBe(false);
	});
});

describe("planRankedRun", () => {
	it("refreshes active accounts first, then rotates through the rest", () => {
		expect(planRankedRun(ids, new Set(["d"]), "a", 3)).toEqual({ active: ["d"], rotation: ["b", "c"] });
	});

	it("keeps active accounts out of the rotation and caps everything at the batch size", () => {
		expect(planRankedRun(ids, new Set(["b", "c", "e"]), null, 2)).toEqual({ active: ["b", "c"], rotation: [] });
		expect(planRankedRun(ids, new Set(["a"]), "e", 3)).toEqual({ active: ["a"], rotation: ["b", "c"] });
	});

	it("ignores active ids that are no longer tracked", () => {
		expect(planRankedRun(ids, new Set(["zz"]), null, 2)).toEqual({ active: [], rotation: ["a", "b"] });
	});
});
