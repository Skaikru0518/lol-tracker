import { describe, expect, it } from "vitest";
import { badgeColumn } from "./column";

describe("badgeColumn", () => {
	it("shows up to three badges as they are", () => {
		expect(badgeColumn(["a", "b", "c"])).toEqual({ shown: ["a", "b", "c"], overflow: [] });
	});

	it("keeps two and folds the rest behind +N when there are more", () => {
		expect(badgeColumn(["a", "b", "c", "d", "e"])).toEqual({ shown: ["a", "b"], overflow: ["c", "d", "e"] });
	});

	it("is empty without badges", () => {
		expect(badgeColumn([])).toEqual({ shown: [], overflow: [] });
	});
});
