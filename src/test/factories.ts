import { type Match, type Participant } from "@/lib/validators/match";

/** A complete participant with neutral defaults; override only what a test cares about. */
export function makeParticipant(overrides: Partial<Participant> = {}): Participant {
	return {
		puuid: "p1",
		summonerName: "",
		riotIdGameName: "Player",
		riotIdTagline: "EUNE",
		championName: "Nami",
		championId: 267,
		champLevel: 14,
		profileIcon: 1,
		kills: 0,
		deaths: 0,
		assists: 0,
		win: true,
		totalMinionsKilled: 0,
		neutralMinionsKilled: 0,
		item0: 0,
		item1: 0,
		item2: 0,
		item3: 0,
		item4: 0,
		item5: 0,
		item6: 0,
		totalDamageDealtToChampions: 0,
		physicalDamageDealtToChampions: 0,
		magicDamageDealtToChampions: 0,
		trueDamageDealtToChampions: 0,
		totalDamageTaken: 0,
		damageSelfMitigated: 0,
		totalDamageShieldedOnTeammates: 0,
		totalHeal: 0,
		totalHealsOnTeammates: 0,
		visionScore: 0,
		wardsPlaced: 0,
		wardsKilled: 0,
		visionWardsBoughtInGame: 0,
		goldEarned: 0,
		goldSpent: 0,
		doubleKills: 0,
		tripleKills: 0,
		quadraKills: 0,
		pentaKills: 0,
		killingSprees: 0,
		largestKillingSpree: 0,
		largestMultiKill: 0,
		turretKills: 0,
		inhibitorKills: 0,
		dragonKills: 0,
		baronKills: 0,
		firstBloodKill: false,
		firstTowerKill: false,
		totalTimeSpentDead: 0,
		longestTimeSpentLiving: 0,
		timeCCingOthers: 0,
		summoner1Id: 4,
		summoner2Id: 7,
		perks: { statPerks: { defense: 0, flex: 0, offense: 0 }, styles: [] },
		teamPosition: "",
		individualPosition: "",
		teamId: 100,
		...overrides,
	};
}

/** A match with two empty teams unless participants or teams are given. */
export function makeMatch(
	overrides: {
		matchId?: string;
		queueId?: number;
		gameDuration?: number;
		gameCreation?: number;
		participants?: Participant[];
		teams?: Match["info"]["teams"];
	} = {},
): Match {
	return {
		metadata: { matchId: overrides.matchId ?? "EUN1_1" },
		info: {
			gameCreation: overrides.gameCreation ?? 0,
			gameDuration: overrides.gameDuration ?? 1800,
			gameMode: "CLASSIC",
			queueId: overrides.queueId ?? 420,
			participants: overrides.participants ?? [],
			teams: overrides.teams ?? [
				{ teamId: 100, win: true, bans: [] },
				{ teamId: 200, win: false, bans: [] },
			],
		},
	};
}
