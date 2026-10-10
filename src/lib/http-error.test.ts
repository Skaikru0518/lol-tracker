import { describe, expect, it } from "vitest";
import { HttpError, retryUnlessNotFound } from "./http-error";

describe("retryUnlessNotFound", () => {
	it("never retries a 404 or 400", () => {
		expect(retryUnlessNotFound(0, new HttpError("Match not found", 404))).toBe(false);
		expect(retryUnlessNotFound(0, new HttpError("Bad id", 400))).toBe(false);
	});

	it("retries other failures up to three times", () => {
		expect(retryUnlessNotFound(0, new HttpError("Server error", 500))).toBe(true);
		expect(retryUnlessNotFound(2, new Error("network"))).toBe(true);
		expect(retryUnlessNotFound(3, new Error("network"))).toBe(false);
	});
});
