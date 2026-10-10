import { describe, expect, it } from "vitest";
import { remSize } from "./size";

describe("remSize", () => {
	it("turns a 16px-root pixel size into rem so it follows the fluid root", () => {
		expect(remSize(32)).toBe("2rem");
		expect(remSize(22)).toBe("1.375rem");
	});
});
