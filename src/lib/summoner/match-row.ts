import { getQueueName } from "@/lib/queue-names";
import { getRuneIcon, type RuneData, type RuneStyle } from "@/lib/icon-helpers";
import { type Participant } from "@/lib/validators/match";

export type RuneMaps = { runes: Map<number, RuneData>; styles: Map<number, RuneStyle> };

/** The seven item slots, trinket last. */
export function participantItems(p: Participant): number[] {
	return [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6];
}

/** Queue label for a match row. */
export function shortQueueName(queueId: number, gameMode: string): string {
	if (queueId === 420) return "Ranked Solo";
	if (queueId === 440) return "Ranked Flex";
	if (queueId === 710) return "Ranked 5s";
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
