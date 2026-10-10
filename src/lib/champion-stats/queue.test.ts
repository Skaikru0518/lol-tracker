import { describe, expect, it } from "vitest";
import { parseQueueFilter, queueSelection } from "./queue";

describe("parseQueueFilter", () => {
	it("defaults to all when missing", () => {
		expect(parseQueueFilter(null)).toBe("all");
	});

	it.each(["all", "solo", "flex", "aram", "normal"])("accepts %s", (value) => {
		expect(parseQueueFilter(value)).toBe(value);
	});

	it.each(["", "urf", "SOLO", "420"])("rejects %j", (value) => {
		expect(parseQueueFilter(value)).toBeNull();
	});
});

describe("queueSelection", () => {
	it("excludes Arena from all", () => {
		expect(queueSelection("all")).toEqual({ mode: "exclude", ids: [1700, 1710] });
	});

	it("maps solo to 420", () => {
		expect(queueSelection("solo")).toEqual({ mode: "include", ids: [420] });
	});

	it("covers draft, blind, swiftplay and quickplay for normal", () => {
		expect(queueSelection("normal")).toEqual({ mode: "include", ids: [400, 430, 480, 490] });
	});
});
