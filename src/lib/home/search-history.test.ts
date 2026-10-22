import { describe, expect, it } from "vitest";
import { parseSearchHistory } from "./search-history";

describe("parseSearchHistory", () => {
	it("returns an empty list for null", () => {
		expect(parseSearchHistory(null)).toEqual([]);
	});

	it("reads legacy plain Riot IDs as EUNE entries", () => {
		expect(parseSearchHistory('["Skaikru#HEAVN","Nyzor#420"]')).toEqual([
			{ riotId: "Skaikru#HEAVN", platform: "eune" },
			{ riotId: "Nyzor#420", platform: "eune" },
		]);
	});

	it("keeps stored entries and drops invalid ones", () => {
		const raw = JSON.stringify([{ riotId: "A#EUW", platform: "euw" }, { riotId: "B#1", platform: "na" }, 42, null, { platform: "euw" }]);
		expect(parseSearchHistory(raw)).toEqual([{ riotId: "A#EUW", platform: "euw" }]);
	});

	it("returns an empty list for corrupt JSON", () => {
		expect(parseSearchHistory("{not json")).toEqual([]);
	});

	it("returns an empty list for non-array JSON", () => {
		expect(parseSearchHistory('{"a":1}')).toEqual([]);
		expect(parseSearchHistory('"Skaikru#HEAVN"')).toEqual([]);
	});
});
