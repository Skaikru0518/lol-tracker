import { beforeEach, describe, expect, it } from "vitest";
import { allowRequest, resetRateLimit } from "./ip-rate-limit";

describe("allowRequest", () => {
	beforeEach(() => resetRateLimit());

	it("allows 30 requests a minute per key and blocks the 31st", () => {
		for (let i = 0; i < 30; i++) expect(allowRequest("1.2.3.4", 1_000 + i)).toBe(true);
		expect(allowRequest("1.2.3.4", 1_100)).toBe(false);
	});

	it("frees the key after the window passes", () => {
		for (let i = 0; i < 31; i++) allowRequest("1.2.3.4", 1_000);
		expect(allowRequest("1.2.3.4", 61_001)).toBe(true);
	});

	it("keeps keys independent", () => {
		for (let i = 0; i < 31; i++) allowRequest("1.2.3.4", 1_000);
		expect(allowRequest("5.6.7.8", 1_000)).toBe(true);
	});
});
