import { isArenaMatch, isArenaWin } from "@/lib/game/arena-helpers";
import { isRemake } from "@/lib/match/remake";
import { getQueueName } from "@/lib/game/queue-names";
import { RANKED_QUEUE_TITLES, rankedQueueForQueueId } from "@/lib/game/ranked-queues";
import { getRuneIcon, type RuneData, type RuneStyle } from "@/lib/game/icon-helpers";
import { type Participant } from "@/lib/validators/match";

export type RuneMaps = { runes: Map<number, RuneData>; styles: Map<number, RuneStyle> };

/** The seven item slots, trinket last. */
export function participantItems(p: Participant): number[] {
	return [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6];
}

/** Queue label for a match row. */
export function shortQueueName(queueId: number, gameMode: string): string {
	const ranked = rankedQueueForQueueId(queueId);
	if (ranked) return RANKED_QUEUE_TITLES[ranked];
	return getQueueName(queueId, gameMode);
}

/** Kills + assists as a whole percent of the team's kills; 0 when the team has none. */
export function killParticipation(player: Participant, participants: Participant[]): number {
	const teamKills = participants.filter((p) => p.teamId === player.teamId).reduce((sum, p) => sum + p.kills, 0);
	if (teamKills === 0) return 0;
	return Math.round(((player.kills + player.assists) / teamKills) * 100);
}

/** Keystone and secondary-tree icon URLs, `null` where unknown. */
export function runeIcons(p: Participant, runeData?: RuneMaps): [string | null, string | null] {
	if (!runeData) return [null, null];
	const [primary, secondary] = p.perks.styles;
	const keystone = primary?.selections[0] ? runeData.runes.get(primary.selections[0].perk) : undefined;
	const tree = secondary ? runeData.styles.get(secondary.style) : undefined;
	return [keystone ? getRuneIcon(keystone.icon) : null, tree ? getRuneIcon(tree.icon) : null];
}

export type RowResult = "win" | "loss" | "remake";

/** Result a match row shows: remakes first, then Arena top four or the win flag. */
export function rowResult(queueId: number, durationSeconds: number, player: Participant): RowResult {
	if (isRemake(durationSeconds)) return "remake";
	const won = isArenaMatch(queueId) ? isArenaWin(player.placement ?? (player.win ? 1 : 5)) : player.win;
	return won ? "win" : "loss";
}
