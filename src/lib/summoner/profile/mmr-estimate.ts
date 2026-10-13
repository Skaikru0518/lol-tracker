import { type RankedQueueType } from "@/lib/game/ranked-queues";
import { type ApexCutoff } from "@/lib/validators/apex";
import { type MmrEstimate } from "@/lib/validators/mmr";
import { fromAbsoluteLp, toAbsoluteLp } from "./lp-change";

const LP_PER_DIVISION_DIFF = 5;
const MAX_OFFSET = 4;
// Aegis of Valor doubles a win; demotion shields and consolation LP show up as 0
const MAX_CHANGE = 40;
const MIN_LP_GAMES = 5;
const MIN_KNOWN = 3;

export interface MmrInput {
	queueType: RankedQueueType;
	current: { tier: string; rank: string; lp: number };
	lpChanges: { win: boolean; change: number }[];
	lobbies: number[][];
	cutoff: ApexCutoff | null | undefined;
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const clamp = (x: number, max: number) => Math.min(Math.max(x, -max), max);

function lpSignal(changes: MmrInput["lpChanges"]) {
	const valid = changes.filter((c) => c.change !== 0 && Math.abs(c.change) <= MAX_CHANGE && c.change > 0 === c.win);
	const gains = valid.filter((c) => c.win).map((c) => c.change);
	const losses = valid.filter((c) => !c.win).map((c) => -c.change);
	if (gains.length === 0 || losses.length === 0) return null;
	const winGain = mean(gains);
	const lossLoss = mean(losses);
	return { offset: clamp((winGain - lossLoss) / LP_PER_DIVISION_DIFF, MAX_OFFSET), games: valid.length, winGain, lossLoss };
}

function lobbySignal(lobbies: number[][]) {
	const usable = lobbies.filter((l) => l.length >= MIN_KNOWN);
	if (usable.length === 0) return null;
	return { value: mean(usable.map(mean)), players: usable.reduce((s, l) => s + l.length, 0) };
}

export function estimateMmr({ queueType, current, lpChanges, lobbies, cutoff }: MmrInput): MmrEstimate | null {
	const currentAbsolute = toAbsoluteLp(current.tier, current.rank, current.lp);
	const lp = lpSignal(lpChanges);
	const lobby = lobbySignal(lobbies);
	if ((!lp || lp.games < MIN_LP_GAMES) && !lobby) return null;

	const parts = [
		...(lp ? [{ value: currentAbsolute + lp.offset * 100, weight: lp.games }] : []),
		...(lobby ? [{ value: lobby.value, weight: lobby.players / MIN_KNOWN }] : []),
	];
	const absolute = Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0) / parts.reduce((s, p) => s + p.weight, 0));
	const estimated = fromAbsoluteLp(absolute, cutoff);
	const shown = fromAbsoluteLp(currentAbsolute, cutoff);
	const same = estimated.tier === shown.tier && estimated.rank === shown.rank;

	return {
		queueType,
		...estimated,
		absolute,
		direction: same ? "equal" : absolute > currentAbsolute ? "above" : "below",
		lpGames: lp?.games ?? 0,
		winGain: lp ? Math.round(lp.winGain) : null,
		lossLoss: lp ? Math.round(lp.lossLoss) : null,
		lobbyPlayers: lobby?.players ?? 0,
	};
}

export function mmrTooltip(e: MmrEstimate): string {
	return [
		e.lpGames > 0 && e.winGain !== null && e.lossLoss !== null ? `${e.lpGames} games · +${e.winGain} / −${e.lossLoss} LP` : null,
		e.lobbyPlayers > 0 ? `${e.lobbyPlayers} known lobby players` : null,
	]
		.filter(Boolean)
		.join(" · ");
}
