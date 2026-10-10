import { describe, expect, it } from "vitest";
import { chipStyle, normalizeHex } from "./chip-style";

describe("normalizeHex", () => {
	it("keeps a lowercase 6-digit hex", () => {
		expect(normalizeHex("#e74c3c")).toBe("#e74c3c");
	});

	it("lowercases and adds the missing hash", () => {
		expect(normalizeHex("E74C3C")).toBe("#e74c3c");
	});

	it("expands 3-digit shorthand", () => {
		expect(normalizeHex("#FfF")).toBe("#ffffff");
	});

	it("trims surrounding whitespace", () => {
		expect(normalizeHex("  #2ecc71 ")).toBe("#2ecc71");
	});

	it.each(["red", "", "#12345", "#gggggg", "#e74c3c80"])(
		"rejects %j",
		(input) => {
			expect(normalizeHex(input)).toBeNull();
		},
	);
});

describe("chipStyle", () => {
	it("builds text, 44-alpha border and 20-alpha background", () => {
		expect(chipStyle("#e74c3c")).toEqual({
			color: "#e74c3c",
			borderColor: "#e74c3c44",
			backgroundColor: "#e74c3c20",
		});
	});

	it("uses the expanded hex for shorthand input", () => {
		expect(chipStyle("#fff").borderColor).toBe("#ffffff44");
	});

	it("falls back to muted tokens for invalid colors", () => {
		expect(chipStyle("red")).toEqual({
			color: "var(--muted-foreground)",
			borderColor: "var(--border)",
			backgroundColor: "transparent",
		});
	});
});

describe("chipStyle with tokens", () => {
	it("mixes a CSS variable color with transparency so chips follow the theme", () => {
		expect(chipStyle("var(--primary)")).toEqual({
			color: "var(--primary)",
			borderColor: "color-mix(in srgb, var(--primary) 27%, transparent)",
			backgroundColor: "color-mix(in srgb, var(--primary) 13%, transparent)",
		});
	});
});
