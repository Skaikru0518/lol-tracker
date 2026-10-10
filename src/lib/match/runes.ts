export interface PerkInfo {
	id: number;
	name: string;
	shortDesc: string;
	endOfGameStatDescs: string[];
}

/** Rune text without markup: tags removed, line breaks as spaces, whitespace collapsed. */
export function plainText(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, " ")
		.replace(/<[^>]+>/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

/** A rune's end-of-game stat lines with `@eogvarN@` replaced by the match values. */
export function runeStatLines(perk: PerkInfo | undefined, vars: [number, number, number]): string[] {
	if (!perk) return [];
	return perk.endOfGameStatDescs.map((line) =>
		plainText(line.replace(/@eogvar([123])@/g, (_, n: string) => vars[Number(n) - 1].toLocaleString("en-US"))),
	);
}
