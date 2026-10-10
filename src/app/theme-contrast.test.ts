import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./globals.css", import.meta.url)), "utf-8");

/** Hex tokens declared in the first `selector { ... }` block of globals.css. */
function tokens(selector: string): Record<string, string> {
	const start = css.indexOf(`${selector} {`);
	const block = css.slice(start, css.indexOf("\n}", start));
	return Object.fromEntries(
		[...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1], m[2]]),
	);
}

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const c = parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

const TEXT_TOKENS = ["foreground", "muted-foreground", "win", "loss", "gold"];
const SURFACES = ["background", "card"];

describe.each([":root", ".dark"])("%s text tokens", (selector) => {
	const t = tokens(selector);

	it.each(TEXT_TOKENS.flatMap((text) => SURFACES.map((surface) => [text, surface])))(
		"%s on %s meets WCAG AA (4.5:1)",
		(text, surface) => {
			expect(contrast(t[text], t[surface])).toBeGreaterThanOrEqual(4.5);
		},
	);
});
