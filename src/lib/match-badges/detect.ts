import { type Participant } from "@/lib/validators/match";

interface BadgeAssignment {
	puuid: string;
	badgeId: string;
}

/** Detect badges for all 10 players in a match
 * @returns puuid + badgeId
 */
export function detectMatchBadges(
	participants: Participant[],
	gameDuration?: number,
): BadgeAssignment[] {
	const badges: BadgeAssignment[] = [];

	// Skip badge detection for short games (< 5 minutes)
	if (participants.length === 0) return badges;
	if (gameDuration !== undefined && gameDuration < 300) return badges;

	// Helper: find player with max value
	function maxBy(fn: (p: Participant) => number): Participant {
		return participants.reduce((best, p) => (fn(p) > fn(best) ? p : best));
	}

	// MVP - most kills + assists on the winning team
	const winners = participants.filter((p) => p.win);
	if (winners.length > 0) {
		const mvp = winners.reduce((best, p) =>
			p.kills + p.assists > best.kills + best.assists ? p : best,
		);

		badges.push({ puuid: mvp.puuid, badgeId: "mvp" });
	}

	// Damage King — most damage to champions
	const dmgKing = maxBy((p) => p.totalDamageDealtToChampions);
	badges.push({ puuid: dmgKing.puuid, badgeId: "damage-king" });

	// Tank God — most damage taken
	const tankGod = maxBy((p) => p.totalDamageTaken);
	badges.push({ puuid: tankGod.puuid, badgeId: "tank-god" });

	// Vision King — highest vision score
	const visionKing = maxBy((p) => p.visionScore);
	badges.push({ puuid: visionKing.puuid, badgeId: "vision-king" });

	// CS King — most CS
	const csKing = maxBy((p) => p.totalMinionsKilled + p.neutralMinionsKilled);
	badges.push({ puuid: csKing.puuid, badgeId: "cs-king" });

	// Gold Lead — most gold
	const goldLead = maxBy((p) => p.goldEarned);
	badges.push({ puuid: goldLead.puuid, badgeId: "gold-lead" });

	// CC Machine — most CC time
	const ccMachine = maxBy((p) => p.timeCCingOthers);
	badges.push({ puuid: ccMachine.puuid, badgeId: "cc-machine" });

	// First Blood — per player
	for (const p of participants) {
		if (p.firstBloodKill) {
			badges.push({ puuid: p.puuid, badgeId: "first-blood" });
		}
	}

	// Pentakill — per player
	for (const p of participants) {
		if (p.pentaKills > 0) {
			badges.push({ puuid: p.puuid, badgeId: "pentakill" });
		}
	}

	// Unkillable — per player (0 deaths, 3+ K+A)
	for (const p of participants) {
		if (p.deaths === 0 && p.kills + p.assists >= 3) {
			badges.push({ puuid: p.puuid, badgeId: "unkillable" });
		}
	}

	// Quadrakill — per player
	for (const p of participants) {
		if (p.quadraKills > 0) {
			badges.push({ puuid: p.puuid, badgeId: "quadrakill" });
		}
	}

	// Solo Carry — most kills + fewest deaths on their team
	const teams = [
		participants.filter((p) => p.teamId === 100),
		participants.filter((p) => p.teamId === 200),
	];
	for (const team of teams) {
		const mostKills = Math.max(...team.map((p) => p.kills));
		const killLeaders = team.filter((p) => p.kills === mostKills);
		if (killLeaders.length === 1) {
			const leader = killLeaders[0];
			const fewestDeaths = Math.min(...team.map((p) => p.deaths));
			if (leader.deaths === fewestDeaths && leader.kills >= 5) {
				badges.push({ puuid: leader.puuid, badgeId: "solo-carry" });
			}
		}
	}

	// Healer — most healing on teammates (min 5k)
	const healer = maxBy((p) => p.totalHealsOnTeammates);
	if (healer.totalHealsOnTeammates >= 5000) {
		badges.push({ puuid: healer.puuid, badgeId: "healer" });
	}

	// Tower Destroyer — most turret kills (min 2)
	const towerKing = maxBy((p) => p.turretKills);
	if (towerKing.turretKills >= 2) {
		badges.push({ puuid: towerKing.puuid, badgeId: "tower-destroyer" });
	}

	// Bad Luck — solo carry on the losing team
	const losers = participants.filter((p) => !p.win);
	if (losers.length > 0) {
		const bestLoser = losers.reduce((best, p) =>
			p.kills + p.assists > best.kills + best.assists ? p : best,
		);
		const fewestDeathsLosing = Math.min(...losers.map((p) => p.deaths));
		if (bestLoser.deaths === fewestDeathsLosing && bestLoser.kills >= 5) {
			badges.push({ puuid: bestLoser.puuid, badgeId: "bad-luck" });
		}
	}

	return badges;
}
