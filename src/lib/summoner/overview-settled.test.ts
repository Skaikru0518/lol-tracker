import { describe, expect, it } from "vitest";
import { overviewSettled } from "./overview-settled";

describe("overviewSettled", () => {
	it("waits while the second page is pending", () => {
		expect(overviewSettled({ isError: false }, { isFetched: false })).toBe(false);
	});

	it("settles once the second page has been fetched", () => {
		expect(overviewSettled({ isError: false }, { isFetched: true })).toBe(true);
	});

	it("settles when the first page failed, since the second never runs", () => {
		expect(overviewSettled({ isError: true }, { isFetched: false })).toBe(true);
	});
});
