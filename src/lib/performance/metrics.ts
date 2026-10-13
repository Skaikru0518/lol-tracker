import { type Participant } from "@/lib/validators/match";
import { type MetricId } from "./weights";

export type MetricValues = Partial<Record<MetricId, number>>;

export type ScoringParticipant = Pick<
	Participant,
	| "puuid"
	| "teamId"
	| "teamPosition"
	| "championName"
	| "kills"
	| "deaths"
	| "assists"
	| "totalMinionsKilled"
	| "neutralMinionsKilled"
	| "goldEarned"
	| "totalDamageDealtToChampions"
	| "totalDamageTaken"
	| "visionScore"
	| "wardsPlaced"
	| "wardsKilled"
	| "visionWardsBoughtInGame"
	| "turretKills"
	| "inhibitorKills"
	| "dragonKills"
	| "baronKills"
> & {
	// Read by the server's own SQL projection only; older rows may lack them
	champExperience?: number;
	damageDealtToObjectives?: number;
	objectivesStolen?: number;
};

const cs = (p: ScoringParticipant) => p.totalMinionsKilled + p.neutralMinionsKilled;

export function laneOpponent<P extends ScoringParticipant>(player: P, participants: P[]): P | null {
	if (!player.teamPosition) return null;
	const samePosition = participants.filter((p) => p.teamPosition === player.teamPosition);
	const enemies = samePosition.filter((p) => p.teamId !== player.teamId);
	const mates = samePosition.filter((p) => p.teamId === player.teamId);
	return enemies.length === 1 && mates.length === 1 ? enemies[0] : null;
}

export function playerMetrics<P extends ScoringParticipant>(player: P, participants: P[], gameDuration: number): { values: MetricValues; opponent: P | null } {
	const minutes = gameDuration / 60;
	const team = participants.filter((p) => p.teamId === player.teamId);
	const teamKills = team.reduce((s, p) => s + p.kills, 0);
	const teamDamage = team.reduce((s, p) => s + p.totalDamageDealtToChampions, 0);
	const teamTaken = team.reduce((s, p) => s + p.totalDamageTaken, 0);
	const opponent = laneOpponent(player, participants);

	const values: MetricValues = {
		csPerMin: cs(player) / minutes,
		goldPerMin: player.goldEarned / minutes,
		kda: (player.kills + player.assists) / Math.max(player.deaths, 1),
		deathsPerMin: player.deaths / minutes,
		killParticipation: teamKills > 0 ? (player.kills + player.assists) / teamKills : 0,
		damageShare: teamDamage > 0 ? player.totalDamageDealtToChampions / teamDamage : 0,
		damageTakenShare: teamTaken > 0 ? player.totalDamageTaken / teamTaken : 0,
		epicKills: player.dragonKills + player.baronKills,
		structureKills: player.turretKills + player.inhibitorKills,
		visionPerMin: player.visionScore / minutes,
		wardsPlacedPerMin: player.wardsPlaced / minutes,
		wardsKilledPerMin: player.wardsKilled / minutes,
		controlWards: player.visionWardsBoughtInGame,
	};
	if (player.damageDealtToObjectives !== undefined) values.objectiveDamagePerMin = player.damageDealtToObjectives / minutes;
	if (player.objectivesStolen !== undefined) values.steals = player.objectivesStolen;

	if (opponent) {
		values.goldDiffPerMin = (player.goldEarned - opponent.goldEarned) / minutes;
		values.csDiffPerMin = (cs(player) - cs(opponent)) / minutes;
		values.damageDiffPerMin = (player.totalDamageDealtToChampions - opponent.totalDamageDealtToChampions) / minutes;
		if (player.champExperience !== undefined && opponent.champExperience !== undefined) {
			values.xpDiffPerMin = (player.champExperience - opponent.champExperience) / minutes;
		}
	}
	return { values, opponent };
}
