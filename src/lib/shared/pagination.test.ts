import { describe, expect, it } from "vitest";
import { paginate } from "./pagination";

const items = Array.from({ length: 65 }, (_, i) => i);

describe("paginate", () => {
	it("returns the requested page and the page count", () => {
		const result = paginate(items, 1, 30);
		expect(result.items[0]).toBe(30);
		expect(result.items).toHaveLength(30);
		expect([result.page, result.pageCount]).toEqual([1, 3]);
	});

	it("returns the short last page", () => {
		expect(paginate(items, 2, 30).items).toEqual([60, 61, 62, 63, 64]);
	});

	it("clamps pages outside the range", () => {
		expect(paginate(items, 9, 30).page).toBe(2);
		expect(paginate(items, -1, 30).page).toBe(0);
	});

	it("has one empty page for no items", () => {
		expect(paginate([], 0, 30)).toEqual({ items: [], page: 0, pageCount: 1 });
	});
});
