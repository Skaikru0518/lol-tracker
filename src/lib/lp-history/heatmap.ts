import { type HeatmapCell } from "@/lib/validators/winrate-heatmap";

export const HEATMAP_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const SLOT_HOURS = 3;
export const SLOT_COUNT = 24 / SLOT_HOURS;

/** Fewest games before a cell shows a win rate. */
export const MIN_CELL_GAMES = 3;
/** Fewest games for a slot to count as the best or worst one. */
export const MIN_EXTREME_GAMES = 5;
/** Games at which a cell reaches full color. */
const FULL_CONFIDENCE_GAMES = 10;

export type { HeatmapCell };

const BUDAPEST = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Budapest", weekday: "short", hour: "2-digit", hourCycle: "h23" });
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Weekday (Monday 0) and 3-hour slot of a timestamp in Budapest time. */
export function budapestSlot(timestamp: number): { day: number; slot: number } {
	const parts = BUDAPEST.formatToParts(timestamp);
	const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
	const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
	return { day: WEEKDAYS.indexOf(weekday), slot: Math.floor((hour % 24) / SLOT_HOURS) };
}

/** Wins and games for every weekday × slot cell (7 × 8), Monday first. */
export function winrateHeatmap(games: { gameCreation: number; win: boolean }[]): HeatmapCell[] {
	const cells: HeatmapCell[] = HEATMAP_DAYS.flatMap((_, day) => Array.from({ length: SLOT_COUNT }, (_, slot) => ({ day, slot, wins: 0, games: 0 })));
	for (const game of games) {
		const { day, slot } = budapestSlot(game.gameCreation);
		if (day < 0) continue;
		const cell = cells[day * SLOT_COUNT + slot];
		cell.games += 1;
		cell.wins += game.win ? 1 : 0;
	}
	return cells;
}

/** Win rate (whole percent) and color confidence (0..1) of a cell; null below the minimum games. */
export function cellTone(cell: HeatmapCell): { winRate: number; confidence: number } | null {
	if (cell.games < MIN_CELL_GAMES) return null;
	return { winRate: Math.round((cell.wins / cell.games) * 100), confidence: Math.min(cell.games / FULL_CONFIDENCE_GAMES, 1) };
}

const rate = (c: HeatmapCell) => c.wins / c.games;

/** Best and worst slot by win rate among cells with enough games (more games wins a tie); null when they don't differ. */
export function heatmapExtremes(cells: HeatmapCell[]): { best: HeatmapCell; worst: HeatmapCell } | null {
	const qualified = cells.filter((c) => c.games >= MIN_EXTREME_GAMES);
	if (qualified.length < 2) return null;
	const best = [...qualified].sort((a, b) => rate(b) - rate(a) || b.games - a.games)[0];
	const worst = [...qualified].sort((a, b) => rate(a) - rate(b) || b.games - a.games)[0];
	return rate(best) === rate(worst) ? null : { best, worst };
}

/** `18–21` for slot 6. */
export function slotLabel(slot: number): string {
	return `${slot * SLOT_HOURS}–${(slot + 1) * SLOT_HOURS}`;
}
