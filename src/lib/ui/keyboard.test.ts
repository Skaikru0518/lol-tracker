import { describe, expect, it } from "vitest";
import { isTypingTarget } from "./keyboard";

describe("isTypingTarget", () => {
	it.each(["INPUT", "TEXTAREA", "SELECT", "input"])(
		"is true for %s elements",
		(tagName) => {
			expect(isTypingTarget({ tagName })).toBe(true);
		},
	);

	it("is true for contenteditable elements", () => {
		expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
	});

	it("is false for regular elements", () => {
		expect(isTypingTarget({ tagName: "BUTTON" })).toBe(false);
		expect(isTypingTarget({ tagName: "BODY", isContentEditable: false })).toBe(false);
	});

	it("is false for a missing target", () => {
		expect(isTypingTarget(null)).toBe(false);
	});
});
