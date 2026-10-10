import { describe, expect, it } from "vitest";
import { parseQueueFilter, queueSelection, RIFT_QUEUE_IDS } from "./queue-filters";

describe("parseQueueFilter", () => {
	it("defaults to all when missing", () => {
		expect(parseQueueFilter(null)).toBe("all");
	});

	it.each(["all", "solo", "flex", "premade", "normal", "aram", "mayhem", "arena", "event"])("accepts %s", (value) => {
		expect(parseQueueFilter(value)).toBe(value);
	});

	it.each(["", "urf", "SOLO", "420"])("rejects %j", (value) => {
		expect(parseQueueFilter(value)).toBeNull();
	});
});

describe("queueSelection", () => {
	it("excludes Arena from all", () => {
		expect(queueSelection("all")).toEqual({ mode: "exclude", ids: [1700, 1710, 1750] });
	});

	it("maps solo to 420", () => {
		expect(queueSelection("solo")).toEqual({ mode: "include", ids: [420] });
	});

	it("covers draft, blind, swiftplay and quickplay for normal", () => {
		expect(queueSelection("normal")).toEqual({ mode: "include", ids: [400, 430, 480, 490] });
	});
});

describe("new queue groups", () => {
	it("maps premade to Ranked 5s", () => {
		expect(queueSelection("premade")).toEqual({ mode: "include", ids: [710] });
	});

	it("keeps ARAM Clash with ARAM and Mayhem separate", () => {
		expect(queueSelection("aram")).toEqual({ mode: "include", ids: [450, 720] });
		expect(queueSelection("mayhem")).toEqual({ mode: "include", ids: [2400] });
	});

	it("groups rotating modes under event", () => {
		expect(queueSelection("event")).toEqual({ mode: "include", ids: [900, 1010, 1020, 1300, 1400, 1900, 2300] });
	});
});

describe("RIFT_QUEUE_IDS", () => {
	it("holds normals, ranked and Clash on Summoner's Rift only", () => {
		expect(RIFT_QUEUE_IDS).toEqual([400, 420, 430, 440, 480, 490, 700, 710]);
	});
});
