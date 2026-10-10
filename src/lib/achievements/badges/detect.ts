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

const killsAndAssists = (p: BadgeParticipant) => p.kills + p.assists;
const cs = (p: BadgeParticipant) => p.totalMinionsKilled + p.neutralMinionsKilled;

/** Badges for every player of a ranked game; other queues and remakes get none. */
export function detectMatchBadges(info: { queueId: number; gameDuration: number; participants: BadgeParticipant[] }): BadgeAssignment[] {
	const { participants } = info;
	const badges: BadgeAssignment[] = [];
	if (participants.length === 0 || !isAchievementEligible(info.queueId, info.gameDuration)) return badges;

	const award = (player: BadgeParticipant | null, badgeId: string) => {
		if (player) badges.push({ puuid: player.puuid, badgeId });
	};
	const winners = participants.filter((p) => p.win);
	const losers = participants.filter((p) => !p.win);

	// --- Best in the match ---
	award(soleLeader(winners, killsAndAssists, 5), "mvp");
	award(soleLeader(participants, (p) => p.totalDamageDealtToChampions), "damage-king");
	award(soleLeader(participants, (p) => p.totalDamageTaken), "tank-god");
	award(soleLeader(participants, (p) => p.visionScore), "vision-king");
	award(soleLeader(participants, cs), "cs-king");
	award(soleLeader(participants, (p) => p.goldEarned), "gold-lead");
	award(soleLeader(participants, (p) => p.timeCCingOthers), "cc-machine");
	award(soleLeader(participants, (p) => p.totalHealsOnTeammates, 10000), "healer");
	award(soleLeader(participants, (p) => p.turretKills, 2), "tower-destroyer");

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
	}

	// --- Within a team ---
	for (const teamId of [100, 200]) {
		const team = participants.filter((p) => p.teamId === teamId);
		const leader = soleLeader(team, (p) => p.kills, 5);
		if (leader && leader.deaths === Math.min(...team.map((p) => p.deaths))) award(leader, "solo-carry");
	}

	// The losing side's best K+A gets Bad Luck when they also died the least, Honorable otherwise
	const bestLoser = soleLeader(losers, killsAndAssists, 5);
	if (bestLoser) {
		const diedLeast = bestLoser.deaths === Math.min(...losers.map((p) => p.deaths));
		award(bestLoser, diedLeast && bestLoser.kills >= 5 ? "bad-luck" : "honorable");
	}

	return badges;
}
