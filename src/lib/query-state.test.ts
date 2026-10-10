import { describe, expect, it } from "vitest";
import { queryFailed } from "./query-state";

describe("queryFailed", () => {
	it("is true only when the query errored and has nothing to show", () => {
		expect(queryFailed({ isError: true, data: undefined })).toBe(true);
		expect(queryFailed({ isError: true, data: [] })).toBe(false);
		expect(queryFailed({ isError: false, data: undefined })).toBe(false);
	});
});
