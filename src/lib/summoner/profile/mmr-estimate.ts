import { seasonFor } from "@/lib/achievements/seasons";
import { type RankedQueueType } from "@/lib/game/ranked-queues";
import { baseRankAt } from "@/lib/performance/performance-rank";
import { type ApexCutoff } from "@/lib/validators/apex";
import { type LPSnapshot } from "@/lib/validators/lp-history";
import { type MmrEstimate } from "@/lib/validators/mmr";
import { fromAbsoluteLp, toAbsoluteLp } from "./lp-change";

const LP_PER_DIVISION_DIFF = 5;
const MAX_OFFSET = 4;
// Aegis of Valor doubles a win; demotion shields and consolation LP show up as 0
const MAX_CHANGE = 40;
const MIN_LP_GAMES = 5;
const MIN_KNOWN = 3;
const HALF_LIFE_GAMES = 10;
const STALE_ENTRY_MS = 30 * 24 * 60 * 60 * 1000;

export interface MmrInput {
	queueType: RankedQueueType;
	current: { tier: string; rank: string; lp: number };
	/** Newest first. */
	lpChanges: { win: boolean; change: number }[];
	lobbies: number[][];
	cutoff: ApexCutoff | null | undefined;
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const clamp = (x: number, max: number) => Math.min(Math.max(x, -max), max);
const weightedMean = (xs: { value: number; weight: number }[]) => xs.reduce((s, x) => s + x.value * x.weight, 0) / xs.reduce((s, x) => s + x.weight, 0);

function lpSignal(changes: MmrInput["lpChanges"]) {
	const valid = changes
		.filter((c) => c.change !== 0 && Math.abs(c.change) <= MAX_CHANGE && c.change > 0 === c.win)
		.map((c, i) => ({ ...c, weight: 0.5 ** (i / HALF_LIFE_GAMES) }));
	const gains = valid.filter((c) => c.win).map((c) => ({ value: c.change, weight: c.weight }));
	const losses = valid.filter((c) => !c.win).map((c) => ({ value: -c.change, weight: c.weight }));
	if (gains.length === 0 || losses.length === 0) return null;
	const winGain = weightedMean(gains);
	const lossLoss = weightedMean(losses);
	return {
		offset: clamp((winGain - lossLoss) / LP_PER_DIVISION_DIFF, MAX_OFFSET),
		games: valid.length,
		weight: valid.reduce((s, c) => s + c.weight, 0),
		winGain,
		lossLoss,
	};
}

function lobbySignal(lobbies: number[][]) {
	const usable = lobbies.filter((l) => l.length >= MIN_KNOWN);
	if (usable.length === 0) return null;
	return { value: mean(usable.map(mean)), players: usable.reduce((s, l) => s + l.length, 0) };
}

function confidenceOf(lpGames: number, lobbyPlayers: number, disagreement: number | null): MmrEstimate["confidence"] {
	if ((lpGames < 8 && lobbyPlayers < 15) || (disagreement !== null && disagreement > 4)) return "low";
	if (lpGames >= 15 && (disagreement === null || disagreement <= 2)) return "high";
	return "medium";
}

export function estimateMmr({ queueType, current, lpChanges, lobbies, cutoff }: MmrInput): MmrEstimate | null {
	const currentAbsolute = toAbsoluteLp(current.tier, current.rank, current.lp);
	const lp = lpSignal(lpChanges);
	const lobby = lobbySignal(lobbies);
	if ((!lp || lp.games < MIN_LP_GAMES) && !lobby) return null;

	const lpValue = lp ? currentAbsolute + lp.offset * 100 : null;
	const absolute = Math.round(
		weightedMean([
			...(lp && lpValue !== null ? [{ value: lpValue, weight: lp.weight }] : []),
			...(lobby ? [{ value: lobby.value, weight: lobby.players / MIN_KNOWN }] : []),
		]),
	);
	const estimated = fromAbsoluteLp(absolute, cutoff);
	const shown = fromAbsoluteLp(currentAbsolute, cutoff);
	const same = estimated.tier === shown.tier && estimated.rank === shown.rank;
	const disagreement = lpValue !== null && lobby ? Math.abs(lpValue - lobby.value) / 100 : null;

	return {
		queueType,
		...estimated,
		absolute,
		direction: same ? "equal" : absolute > currentAbsolute ? "above" : "below",
		confidence: confidenceOf(lp?.games ?? 0, lobby?.players ?? 0, disagreement),
		lpGames: lp?.games ?? 0,
		winGain: lp ? Math.round(lp.winGain) : null,
		lossLoss: lp ? Math.round(lp.lossLoss) : null,
		lobbyPlayers: lobby?.players ?? 0,
	};
}

// LP gains drift with MMR, so only the newest exact games count, however far back they had to be found
export function pickLpChanges(newestFirst: { id: string; win: boolean }[], changes: Map<string, number>, limit: number): MmrInput["lpChanges"] {
	return newestFirst.flatMap((g) => (changes.has(g.id) ? [{ win: g.win, change: changes.get(g.id)! }] : [])).slice(0, limit);
}

// A lobby player's rank when the game ended; a current entry only counts while it is fresh and from the game's season
export function lobbyRankAt(
	snapshots: LPSnapshot[] | undefined,
	end: number,
	entry: { tier: string; rank: string; leaguePoints: number; updatedAt: Date } | undefined,
	now: number,
): number | null {
	const base = baseRankAt(snapshots, end, undefined, now);
	if (base) return toAbsoluteLp(base.tier, base.rank, base.lp);
	if (!entry) return null;
	const updated = entry.updatedAt.getTime();
	if (now - updated > STALE_ENTRY_MS || seasonFor(entry.updatedAt)?.id !== seasonFor(new Date(end))?.id) return null;
	return toAbsoluteLp(entry.tier, entry.rank, entry.leaguePoints);
}

const CONFIDENCE_LABELS: Record<MmrEstimate["confidence"], string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

export function mmrTooltipLines(e: MmrEstimate): string[] {
	return [
		CONFIDENCE_LABELS[e.confidence],
		e.lpGames > 0 && e.winGain !== null && e.lossLoss !== null ? `${e.lpGames} games · +${e.winGain} / −${e.lossLoss} LP` : null,
		e.lobbyPlayers > 0 ? `${e.lobbyPlayers} known lobby players` : null,
	].filter((line) => line !== null);
}
