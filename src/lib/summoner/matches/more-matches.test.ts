import { describe, expect, it } from "vitest";
import { mergeMatchPages, MORE_MATCHES_PAGE, nextMatchStart } from "./more-matches";

describe("nextMatchStart", () => {
	it("asks for the next page after one that returned games", () => {
		expect(nextMatchStart(50, 50)).toBe(100);
		// Pages can come back short when single matches fail to load, so the offset moves by the page size, not the count
		expect(nextMatchStart(43, 100)).toBe(150);
	});

	it("stops after an empty page", () => {
		expect(nextMatchStart(0, 150)).toBeUndefined();
	});

	it("pages by 50", () => {
		expect(MORE_MATCHES_PAGE).toBe(50);
	});
});

describe("mergeMatchPages", () => {
	const m = (matchId: string) => ({ metadata: { matchId } });

	it("drops a game that a newer one pushed from the first page onto the next", () => {
		expect(mergeMatchPages([m("c"), m("b")], [m("b"), m("a")]).map((x) => x.metadata.matchId)).toEqual(["c", "b", "a"]);
	});
});
