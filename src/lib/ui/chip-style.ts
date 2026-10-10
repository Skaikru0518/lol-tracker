const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Normalises a hex color to lowercase `#rrggbb`, or `null` if invalid. */
export function normalizeHex(input: string): string | null {
	const match = HEX_PATTERN.exec(input.trim());
	if (!match) return null;

	const digits = match[1].toLowerCase();
	const full =
		digits.length === 3
			? digits
					.split("")
					.map((digit) => digit + digit)
					.join("")
			: digits;

	return `#${full}`;
}

/** Inline style applied to a colored chip. */
export interface ChipStyle {
	color: string;
	borderColor: string;
	backgroundColor: string;
}

const TOKEN_PATTERN = /^var\(--[a-z0-9-]+\)$/i;

/** Chip style: text color, `44` alpha border, `20` alpha fill (a `var(--token)` is mixed with transparency instead); muted fallback. */
export function chipStyle(color: string): ChipStyle {
	const token = color.trim();
	if (TOKEN_PATTERN.test(token)) {
		return {
			color: token,
			borderColor: `color-mix(in srgb, ${token} 27%, transparent)`,
			backgroundColor: `color-mix(in srgb, ${token} 13%, transparent)`,
		};
	}
	const hex = normalizeHex(color);

	if (!hex) {
		return {
			color: "var(--muted-foreground)",
			borderColor: "var(--border)",
			backgroundColor: "transparent",
		};
	}

	return {
		color: hex,
		borderColor: `${hex}44`,
		backgroundColor: `${hex}20`,
	};
}
