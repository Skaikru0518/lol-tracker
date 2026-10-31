import { type WidgetRank, type WidgetSession, type WidgetShow, type WidgetStyle } from "@/lib/validators/widget";

const APEX = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);
const SHORT_TIER: Record<string, string> = { IRON: "I", BRONZE: "B", SILVER: "S", GOLD: "G", PLATINUM: "P", EMERALD: "E", DIAMOND: "D", MASTER: "M", GRANDMASTER: "GM", CHALLENGER: "C" };
const DIVISION_NUMBER: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };

const STYLE_PARTS: Record<WidgetStyle, WidgetShow[]> = {
	bar: ["id", "server", "lp", "wr"],
	square: ["id", "server", "lp", "wr"],
	strip: ["id", "server", "lp", "wr"],
	pill: ["lp", "wr"],
};

export const STYLE_SIZES: Record<WidgetStyle, { width: number; height: number }> = {
	bar: { width: 460, height: 88 },
	square: { width: 240, height: 290 },
	strip: { width: 520, height: 130 },
	pill: { width: 300, height: 36 },
};

const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function rankLabel(rank: WidgetRank | null): string {
	if (!rank) return "Unranked";
	return APEX.has(rank.tier) ? title(rank.tier) : `${title(rank.tier)} ${rank.division}`;
}

export function shortRank(rank: WidgetRank | null): string {
	if (!rank) return "—";
	const tier = SHORT_TIER[rank.tier] ?? rank.tier;
	return APEX.has(rank.tier) ? tier : `${tier}${DIVISION_NUMBER[rank.division] ?? ""}`;
}

export function winRate(wins: number, losses: number): number | null {
	const games = wins + losses;
	return games ? Math.round((wins / games) * 100) : null;
}

export function winRateLabel(wins: number, losses: number): string | null {
	const rate = winRate(wins, losses);
	return rate === null ? null : `(${rate}%)`;
}

export function lpChangeLabel(change: number): string {
	if (change > 0) return `+${change}`;
	if (change < 0) return `−${-change}`;
	return "±0";
}

/** The `since` the widget sends: none for auto (the server finds the session), local midnight, or page load. */
export function sessionSince(session: WidgetSession, loadedAt: number): number | undefined {
	if (session === "today") {
		const midnight = new Date(loadedAt);
		midnight.setHours(0, 0, 0, 0);
		return midnight.getTime();
	}
	return session === "load" ? loadedAt : undefined;
}

export function showsPart(style: WidgetStyle, show: WidgetShow[], part: WidgetShow): boolean {
	return STYLE_PARTS[style].includes(part) && show.includes(part);
}

export function styleParts(style: WidgetStyle): WidgetShow[] {
	return STYLE_PARTS[style];
}
