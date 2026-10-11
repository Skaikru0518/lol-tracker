import { highestTierOrdinal, rankTierOrdinal, tierFor } from "../tiers";
import { type GameRow, type ProgressResult, type SeasonalInputs, type TierSnapshot } from "../progress/types";
import { SEASONAL } from "./definitions";

const IRON_WILL_PERCENT = 55;
const STOMP_SECONDS = 20 * 60;
const MARATHON_SECONDS = 40 * 60;
const COMEBACK_LOSSES = 5;
const POSITIONS = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
const BUDAPEST_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Budapest" });
const RANKED_QUEUES = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR", "RANKED_PREMADE_5x5"];

/** Longest run of consecutive wins. */
export function longestWinStreak(wins: boolean[]): number {
	let best = 0;
	let run = 0;
	for (const win of wins) {
		run = win ? run + 1 : 0;
		best = Math.max(best, run);
	}
	return best;
}

/** 1 when a win came right after at least five straight losses. */
function comeback(games: GameRow[]): number {
	let losses = 0;
	for (const game of games) {
		if (game.win && losses >= COMEBACK_LOSSES) return 1;
		losses = game.win ? 0 : losses + 1;
	}
	return 0;
}

/** 1 when any queue ended (or currently is) above the tier of its first snapshot in the season. */
function promoted(snapshots: TierSnapshot[], ranked: SeasonalInputs["ranked"]): number {
	const sorted = [...snapshots].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
	return RANKED_QUEUES.some((queue) => {
		const inQueue = sorted.filter((s) => s.queueType === queue);
		if (inQueue.length === 0) return false;
		const latest = ranked ? ranked.find((r) => r.queueType === queue)?.tier : inQueue[inQueue.length - 1].tier;
		return latest !== undefined && rankTierOrdinal(latest) > rankTierOrdinal(inQueue[0].tier);
	})
		? 1
		: 0;
}

/** Results for one season, in definition order; Triple Threat needs current ranks and is left out otherwise. */
export function evaluateSeasonal(seasonId: string, inputs: SeasonalInputs): ProgressResult[] {
	const { champions, games: played, snapshots, ranked } = inputs;
	const wonGames = played.filter((g) => g.win);
	const games = champions.reduce((s, c) => s + c.games, 0);
	const won = champions.reduce((s, c) => s + c.wins, 0);
	const values: Record<string, number> = {
		"season-grinder": games,
		"season-winner": won,
		"iron-will": games,
		"hot-streak": longestWinStreak(played.map((g) => g.win)),
		"main-character": Math.max(0, ...champions.map((c) => c.games)),
		promoted: promoted(snapshots, ranked),
		"triple-threat": ranked ? RANKED_QUEUES.filter((q) => ranked.some((r) => r.queueType === q)).length : 0,
		"pool-party": champions.filter((c) => c.games > 0).length,
		"role-swap": POSITIONS.filter((p) => wonGames.some((g) => g.teamPosition === p)).length,
		spotless: champions.reduce((s, c) => s + c.deathless, 0),
		stomper: wonGames.filter((g) => g.gameDuration < STOMP_SECONDS).length,
		marathon: wonGames.filter((g) => g.gameDuration > MARATHON_SECONDS).length,
		"comeback-kid": comeback(played),
		"season-penta": champions.reduce((s, c) => s + c.pentas, 0),
		dedication: new Set(played.map((g) => BUDAPEST_DAY.format(g.gameCreation))).size,
		"season-peak": highestTierOrdinal([...snapshots.map((s) => s.tier), ...(ranked ?? []).map((r) => r.tier)]),
	};

	return SEASONAL.filter((def) => ranked !== null || def.id !== "triple-threat").map((def) => {
		const value = values[def.id];
		const tier = def.id === "iron-will" ? (games >= def.thresholds[0] && won * 100 >= games * IRON_WILL_PERCENT ? 1 : 0) : tierFor(value, def.thresholds);
		return { achievementId: def.id, scope: seasonId, value, tier };
	});
}
