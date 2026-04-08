import { z } from "zod";

export const participantSchema = z.object({
	puuid: z.string(),
	summonerName: z.string(),
	riotIdGameName: z.string(),
	riotIdTagline: z.string(),
	championName: z.string(),
	championId: z.number(),
	champLevel: z.number(),
	profileIcon: z.number(),
	kills: z.number(),
	deaths: z.number(),
	assists: z.number(),
	win: z.boolean(),
	totalMinionsKilled: z.number(),
	neutralMinionsKilled: z.number(),
	item0: z.number(),
	item1: z.number(),
	item2: z.number(),
	item3: z.number(),
	item4: z.number(),
	item5: z.number(),
	item6: z.number(),
	// Damage
	totalDamageDealtToChampions: z.number(),
	physicalDamageDealtToChampions: z.number(),
	magicDamageDealtToChampions: z.number(),
	trueDamageDealtToChampions: z.number(),
	totalDamageTaken: z.number(),
	damageSelfMitigated: z.number(),
	totalDamageShieldedOnTeammates: z.number(),
	totalHeal: z.number(),
	totalHealsOnTeammates: z.number(),
	// Vision
	visionScore: z.number(),
	wardsPlaced: z.number(),
	wardsKilled: z.number(),
	visionWardsBoughtInGame: z.number(),
	// Gold
	goldEarned: z.number(),
	goldSpent: z.number(),
	// Multikills
	doubleKills: z.number(),
	tripleKills: z.number(),
	quadraKills: z.number(),
	pentaKills: z.number(),
	killingSprees: z.number(),
	largestKillingSpree: z.number(),
	largestMultiKill: z.number(),
	// Objectives
	turretKills: z.number(),
	inhibitorKills: z.number(),
	dragonKills: z.number(),
	baronKills: z.number(),
	// Other
	firstBloodKill: z.boolean(),
	firstTowerKill: z.boolean(),
	totalTimeSpentDead: z.number(),
	longestTimeSpentLiving: z.number(),
	timeCCingOthers: z.number(),
	summoner1Id: z.number(),
	summoner2Id: z.number(),
	perks: z.object({
		statPerks: z.object({
			defense: z.number(),
			flex: z.number(),
			offense: z.number(),
		}),
		styles: z.array(z.object({
			description: z.string(),
			selections: z.array(z.object({
				perk: z.number(),
				var1: z.number(),
				var2: z.number(),
				var3: z.number(),
			})),
			style: z.number(),
		})),
	}),
	teamPosition: z.string(),
	individualPosition: z.string(),
	teamId: z.number(),
	// Arena
	placement: z.number().optional(),
	playerSubteamId: z.number().optional(),
	subteamPlacement: z.number().optional(),
});

export const matchSchema = z.object({
	metadata: z.object({
		matchId: z.string(),
	}),
	info: z.object({
		gameCreation: z.number(),
		gameDuration: z.number(),
		gameMode: z.string(),
		queueId: z.number(),
		participants: z.array(participantSchema),
		teams: z.array(z.object({
			teamId: z.number(),
			win: z.boolean(),
			bans: z.array(z.object({
				championId: z.number(),
				pickTurn: z.number(),
			})),
		})),
	}),
});

export type Participant = z.infer<typeof participantSchema>;

export type Match = z.infer<typeof matchSchema>;
