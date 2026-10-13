import { type LPSnapshot } from "@/lib/validators/lp-history";
import { toAbsoluteLp } from "./lp-change";

export interface GameResult {
	id: string;
	end: number;
	win: boolean;
}

interface Gap {
	at: number;
	delta: number;
	games: GameResult[];
}

function gaps(snapshots: LPSnapshot[], games: GameResult[]): Gap[] {
	const sorted = [...snapshots].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
	const result: Gap[] = [];
	for (let i = 1; i < sorted.length; i++) {
		const before = sorted[i - 1];
		const after = sorted[i];
		const from = Date.parse(before.createdAt);
		const to = Date.parse(after.createdAt);
		const inGap = games.filter((g) => g.end >= from && g.end < to);
		if (inGap.length === 0) continue;
		const counted = before.wins !== null && before.losses !== null && after.wins !== null && after.losses !== null;
		// A gap whose W/L counters disagree with the stored games has games we don't know about
		if (counted && after.wins! + after.losses! - (before.wins! + before.losses!) !== inGap.length) continue;
		result.push({ at: to, delta: toAbsoluteLp(after.tier, after.rank, after.lp) - toAbsoluteLp(before.tier, before.rank, before.lp), games: inGap });
	}
	return result;
}

export function exactLpChanges(snapshots: LPSnapshot[] | undefined, games: GameResult[]): Map<string, number> {
	if (!snapshots || snapshots.length < 2) return new Map();
	return new Map(gaps(snapshots, games).flatMap((g) => (g.games.length === 1 ? [[g.games[0].id, g.delta] as const] : [])));
}

/** LP change per game id; gaps with several games are split using the player's nearest known win gain. */
export function lpChangesForGames(snapshots: LPSnapshot[] | undefined, games: GameResult[]): Map<string, number> {
	const changes = new Map<string, number>();
	if (!snapshots || snapshots.length < 2) return changes;
	const all = gaps(snapshots, games);
	const exactWins = all.filter((g) => g.games.length === 1 && g.games[0].win);

	for (const { at, delta, games: inGap } of all) {
		// LP gains drift with MMR, so the closest exact win says the most about this session
		const nearest = exactWins.reduce<Gap | null>((best, g) => (!best || Math.abs(g.at - at) < Math.abs(best.at - at) ? g : best), null);
		const winGain = nearest?.delta ?? null;
		const wins = inGap.filter((g) => g.win).length;
		const losses = inGap.length - wins;
		let perWin: number | null = null;
		let perLoss: number | null = null;
		if (inGap.length === 1 || wins === 0 || losses === 0) {
			perWin = perLoss = Math.round(delta / inGap.length);
		} else if (winGain !== null && delta - wins * winGain < 0) {
			perWin = winGain;
			perLoss = Math.round((delta - wins * winGain) / losses);
		} else if (wins !== losses && delta / (wins - losses) > 0) {
			perWin = Math.round(delta / (wins - losses));
			perLoss = -perWin;
		}
		if (perWin === null || perLoss === null) continue;
		for (const g of inGap) changes.set(g.id, g.win ? perWin : perLoss);
	}
	return changes;
}
