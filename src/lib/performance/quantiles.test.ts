import { describe, expect, it } from "vitest";
import { quantiles } from "./quantiles";

describe("quantiles", () => {
	it("interpolates like Postgres percentile_cont", () => {
		const q = quantiles([5, 1, 4, 2, 3])!;
		expect(q).toHaveLength(21);
		expect(q[0]).toBe(1);
		expect(q[10]).toBe(3);
		expect(q[20]).toBe(5);
		expect(q[5]).toBe(2);
	});

	it("handles a single value and an empty list", () => {
		expect(quantiles([7])).toEqual(Array(21).fill(7));
		expect(quantiles([])).toBeNull();
	});
});
