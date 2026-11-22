import { isAchievementEligible } from "@/lib/achievements/eligibility";
import { type Participant } from "@/lib/validators/match";

/** Participant fields badge detection reads. */
export type BadgeParticipant = Pick<
	Participant,
	| "puuid"
	| "teamId"
	| "win"
	| "championId"
	| "kills"
	| "deaths"
	| "assists"
	| "totalDamageDealtToChampions"
	| "totalDamageTaken"
	| "visionScore"
	| "totalMinionsKilled"
	| "neutralMinionsKilled"
	| "goldEarned"
	| "timeCCingOthers"
	| "totalHealsOnTeammates"
	| "turretKills"
	| "firstBloodKill"
	| "pentaKills"
	| "quadraKills"
	| "damageSelfMitigated"
	| "totalDamageShieldedOnTeammates"
	| "objectivesStolen"
	| "damageDealtToBuildings"
	| "wardsKilled"
	| "largestKillingSpree"
	| "longestTimeSpentLiving"
	| "totalTimeSpentDead"
	| "gameEndedInSurrender"
>;

interface BadgeAssignment {
	puuid: string;
	badgeId: string;
}

const YASUO = 157;
const TEEMO = 17;

/** The one player with the highest value of at least `min`; null on a tie or when nobody reaches it. */
function soleLeader(players: BadgeParticipant[], value: (p: BadgeParticipant) => number, min = Number.MIN_VALUE): BadgeParticipant | null {
	if (players.length === 0) return null;
	const best = Math.max(...players.map(value));
	const leaders = players.filter((p) => value(p) === best);
	return leaders.length === 1 && best >= min ? leaders[0] : null;
}

/** Badges are stored for good, so a match is only saved once its scores (which decide MVP and ACE) exist. */
export function scoresReady(scores: Record<string, number> | undefined): scores is Record<string, number> {
	return !!scores && Object.keys(scores).length > 0;
}

const killsAndAssists = (p: BadgeParticipant) => p.kills + p.assists;
const cs = (p: BadgeParticipant) => p.totalMinionsKilled + p.neutralMinionsKilled;
const sum = (players: BadgeParticipant[], value: (p: BadgeParticipant) => number) => players.reduce((s, p) => s + value(p), 0);

/** Badges for every player of a ranked game; other queues and remakes get none. `scores` (performance score by puuid) decides MVP and ACE. */
export function detectMatchBadges(
	info: { queueId: number; gameDuration: number; participants: BadgeParticipant[] },
	scores: Record<string, number> = {},
): BadgeAssignment[] {
	const { participants } = info;
	const badges: BadgeAssignment[] = [];
	if (participants.length === 0 || !isAchievementEligible(info.queueId, info.gameDuration)) return badges;

	const award = (player: BadgeParticipant | null, badgeId: string) => {
		if (player) badges.push({ puuid: player.puuid, badgeId });
	};
	const winners = participants.filter((p) => p.win);
	const losers = participants.filter((p) => !p.win);
	const minutes = info.gameDuration / 60;
	const score = (p: BadgeParticipant) => scores[p.puuid] ?? -1;

	// --- Best in the match ---
	award(soleLeader(winners, score, 0), "mvp");
	award(soleLeader(losers, score, 0), "ace");
	award(soleLeader(participants, (p) => p.totalDamageDealtToChampions), "damage-king");
	award(soleLeader(participants, (p) => p.visionScore, 1.5 * minutes), "vision-king");
	award(soleLeader(participants, cs, 8 * minutes), "cs-king");
	award(soleLeader(participants, (p) => p.timeCCingOthers), "cc-machine");
	award(soleLeader(participants, (p) => p.totalHealsOnTeammates + p.totalDamageShieldedOnTeammates, 10000), "healer");
	award(soleLeader(participants, (p) => p.turretKills, 2), "tower-destroyer");
	award(soleLeader(participants, (p) => p.damageDealtToBuildings, 8000), "siege-master");
	award(soleLeader(participants, (p) => p.wardsKilled, 10), "sweeper");
	award(soleLeader(participants, (p) => p.longestTimeSpentLiving, 900), "survivor");

	// Damage taken mostly follows deaths, so feeders are left out of Tank God
	const sturdy = participants.filter((p) => {
		const team = participants.filter((t) => t.teamId === p.teamId);
		return p.deaths <= sum(team, (t) => t.deaths) / team.length;
	});
	award(soleLeader(sturdy, (p) => p.totalDamageTaken + p.damageSelfMitigated), "tank-god");

	const mostDamage = soleLeader(participants, (p) => p.totalDamageDealtToChampions);
	const mostDeaths = soleLeader(participants, (p) => p.deaths, 5);
	if (mostDamage && mostDamage === mostDeaths) award(mostDamage, "glass-cannon");

	// --- Per player ---
	for (const p of participants) {
		if (p.firstBloodKill) award(p, "first-blood");
		if (p.pentaKills > 0) award(p, "pentakill");
		else if (p.quadraKills > 0) award(p, "quadrakill");
		if (p.deaths === 0 && killsAndAssists(p) >= 3) award(p, "unkillable");
		if (p.championId === YASUO && p.deaths >= 10) award(p, "powerspike");
		if (p.championId === TEEMO) award(p, "soulless");
		if (cs(p) >= 200 && p.kills === 0 && p.assists === 0) award(p, "afk-farmer");
		if (p.objectivesStolen > 0) award(p, "thief");
		if (p.largestKillingSpree >= 8) award(p, "rampage");
		if (p.totalTimeSpentDead >= info.gameDuration / 4) award(p, "grey-screen");
		if (p.gameEndedInSurrender && !p.win && p.deaths >= 10) award(p, "surrendered");
	}

	// --- Within a team ---
	const winningDamage = sum(winners, (p) => p.totalDamageDealtToChampions);
	award(soleLeader(winners, (p) => p.totalDamageDealtToChampions, 0.35 * winningDamage), "solo-carry");

	return badges;
}
