import { describe, expect, it } from "vitest";
import { sameText } from "./account";

describe("sameText", () => {
	it("matches case-insensitively with LIKE wildcards taken literally", () => {
		expect(sameText("Sk_ai%ru\\b")).toEqual({ equals: "Sk\\_ai\\%ru\\\\b", mode: "insensitive" });
		expect(sameText("Skaikru")).toEqual({ equals: "Skaikru", mode: "insensitive" });
	});
});
