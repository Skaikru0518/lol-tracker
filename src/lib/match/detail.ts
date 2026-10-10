import { csPerMinute, formatDuration } from "@/lib/format";
import { killParticipation } from "@/lib/summoner/match-row";
import { isRemake } from "./remake";
import { type Match, type Participant } from "@/lib/validators/match";
import { type Timeline } from "@/lib/validators/timeline";

export type MatchResult = "Victory" | "Defeat" | "Remake";

/** The participant with `puuid`, if that player is in the match. */
export function findParticipant(match: Match, puuid: string | undefined): Participant | undefined {
	return puuid ? match.info.participants.find((p) => p.puuid === puuid) : undefined;
}

/** Player the selector starts on: `?puuid` when they played, else the first participant. */
export function defaultSelectedPuuid(match: Match, puuid: string | undefined): string {
	return findParticipant(match, puuid)?.puuid ?? match.info.participants[0]?.puuid ?? "";
}

/** Timeline participant id (1-10): position in `info.participants` plus one; null when absent. */
export function participantIdOf(match: Match, puuid: string): number | null {
	const index = match.info.participants.findIndex((p) => p.puuid === puuid);
	return index === -1 ? null : index + 1;
}

/** One player's result; games under five minutes are remakes. */
export function matchResult(match: Match, player: Participant): MatchResult {
	if (isRemake(match.info.gameDuration)) return "Remake";
	return player.win ? "Victory" : "Defeat";
}

export interface PlayerShares {
	damageShare: number;
	goldShare: number;
	killParticipation: number;
	csPerMin: number;
	visionScore: number;
}

const percentOf = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

/** Share of the player's team damage and gold, kill participation, CS per minute and vision score. */
export function playerShares(match: Match, player: Participant): PlayerShares {
	const team = match.info.participants.filter((p) => p.teamId === player.teamId);
	const total = (pick: (p: Participant) => number) => team.reduce((sum, p) => sum + pick(p), 0);
	return {
		damageShare: percentOf(player.totalDamageDealtToChampions, total((p) => p.totalDamageDealtToChampions)),
		goldShare: percentOf(player.goldEarned, total((p) => p.goldEarned)),
		killParticipation: killParticipation(player, match.info.participants),
		csPerMin: csPerMinute(player.totalMinionsKilled + player.neutralMinionsKilled, match.info.gameDuration),
		visionScore: player.visionScore,
	};
}

export interface StatLine {
	label: string;
	value: string;
}

export type StatGroupKey = "damage" | "survivability" | "income" | "vision" | "combat";

const number = (n: number) => n.toLocaleString("en-US");

/** The player's detailed stats grouped for the player tabs; per-minute values are 0 for a zero duration. */
export function playerStatGroups(player: Participant, durationSeconds: number): Record<StatGroupKey, StatLine[]> {
	const minutes = durationSeconds / 60;
	const perMinute = (n: number) => (minutes > 0 ? number(Math.round(n / minutes)) : "0");
	const cs = player.totalMinionsKilled + player.neutralMinionsKilled;
	const multikills = [
		[player.doubleKills, "Double"],
		[player.tripleKills, "Triple"],
		[player.quadraKills, "Quadra"],
		[player.pentaKills, "Penta"],
	]
		.filter(([count]) => (count as number) > 0)
		.map(([count, name]) => `${count}× ${name}`);

	return {
		damage: [
			{ label: "To champions", value: number(player.totalDamageDealtToChampions) },
			{ label: "Physical", value: number(player.physicalDamageDealtToChampions) },
			{ label: "Magic", value: number(player.magicDamageDealtToChampions) },
			{ label: "True", value: number(player.trueDamageDealtToChampions) },
			{ label: "DPM", value: perMinute(player.totalDamageDealtToChampions) },
		],
		survivability: [
			{ label: "Damage taken", value: number(player.totalDamageTaken) },
			{ label: "Self mitigated", value: number(player.damageSelfMitigated) },
			{ label: "Healing", value: number(player.totalHeal) },
			{ label: "Shielded allies", value: number(player.totalDamageShieldedOnTeammates) },
			{ label: "Healed allies", value: number(player.totalHealsOnTeammates) },
		],
		income: [
			{ label: "Gold", value: number(player.goldEarned) },
			{ label: "Gold/min", value: perMinute(player.goldEarned) },
			{ label: "CS", value: number(cs) },
			{ label: "CS/min", value: String(csPerMinute(cs, durationSeconds)) },
		],
		vision: [
			{ label: "Vision score", value: number(player.visionScore) },
			{ label: "Wards placed", value: number(player.wardsPlaced) },
			{ label: "Wards killed", value: number(player.wardsKilled) },
			{ label: "Control wards", value: number(player.visionWardsBoughtInGame) },
		],
		combat: [
			{ label: "Largest spree", value: number(player.largestKillingSpree) },
			...(multikills.length > 0 ? [{ label: "Multikills", value: multikills.join(", ") }] : []),
			{ label: "Turrets", value: number(player.turretKills) },
			{ label: "Dragons", value: number(player.dragonKills) },
			{ label: "Barons", value: number(player.baronKills) },
			{ label: "CC time", value: formatDuration(player.timeCCingOthers) },
			{ label: "Time dead", value: formatDuration(player.totalTimeSpentDead) },
			...(player.firstBloodKill ? [{ label: "First blood", value: "Yes" }] : []),
			...(player.firstTowerKill ? [{ label: "First tower", value: "Yes" }] : []),
		],
	};
}

export type TimelineState = "loading" | "missing" | "ready";

/** Whether timeline-based views should show a skeleton, an empty state or the data. */
export function timelineState({ data, isLoading }: { data: Timeline | undefined; isLoading: boolean }): TimelineState {
	if (data) return "ready";
	return isLoading ? "loading" : "missing";
}

/** Arena placement (1-8); falls back to 1 or 5 from the win flag like the match row does. */
export function arenaPlacement(player: Participant): number {
	return player.placement ?? (player.win ? 1 : 5);
}

/** Badge ids one player earned in a match. */
export function badgeIdsFor(badges: { puuid: string; badgeId: string }[] | undefined, puuid: string): string[] {
	return (badges ?? []).filter((b) => b.puuid === puuid).map((b) => b.badgeId);
}
