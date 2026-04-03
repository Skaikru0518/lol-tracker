import { type Match, type Participant } from "@/lib/validators/match";

export interface SummonerStats {
	totalGames: number;
	wins: number;
	losses: number;
	winRate: number;
	avgKills: number;
	avgDeaths: number;
	avgAssists: number;
	avgKDA: number;
	avgCS: number;
	avgGold: number;
	avgDamage: number;
	avgVisionScore: number;
	roles: Record<string, number>;
	champStats: ChampStat[];
	recentTrend: boolean[];
}

export interface ChampStat {
	championName: string;
	championId: number;
	games: number;
	wins: number;
	avgKills: number;
	avgDeaths: number;
	avgAssists: number;
}

const ROLE_LABELS: Record<string, string> = {
	TOP: "Top",
	JUNGLE: "Jungle",
	MIDDLE: "Mid",
	BOTTOM: "ADC",
	UTILITY: "Support",
	"": "Unknown",
};

export function calculateStats(
	matches: Match[],
	puuid: string,
): SummonerStats {
	const players: Participant[] = [];

	// Filter out ARAM (450) and Arena (1700, 1710)
	const filtered = matches.filter(
		(m) => ![450, 1700, 1710].includes(m.info.queueId),
	);

	for (const match of filtered) {
		const p = match.info.participants.find((p) => p.puuid === puuid);
		if (p) players.push(p);
	}

	const totalGames = players.length;
	const wins = players.filter((p) => p.win).length;
	const losses = totalGames - wins;

	const sum = (fn: (p: Participant) => number) =>
		players.reduce((acc, p) => acc + fn(p), 0);

	const avgKills = totalGames ? sum((p) => p.kills) / totalGames : 0;
	const avgDeaths = totalGames ? sum((p) => p.deaths) / totalGames : 0;
	const avgAssists = totalGames ? sum((p) => p.assists) / totalGames : 0;
	const avgKDA = avgDeaths === 0 ? avgKills + avgAssists : (avgKills + avgAssists) / avgDeaths;

	const avgCS = totalGames
		? sum((p) => p.totalMinionsKilled + p.neutralMinionsKilled) / totalGames
		: 0;
	const avgGold = totalGames ? sum((p) => p.goldEarned) / totalGames : 0;
	const avgDamage = totalGames
		? sum((p) => p.totalDamageDealtToChampions) / totalGames
		: 0;
	const avgVisionScore = totalGames
		? sum((p) => p.visionScore) / totalGames
		: 0;

	// Role distribution (skip empty/unknown positions)
	const roles: Record<string, number> = {};
	for (const p of players) {
		if (!p.teamPosition) continue;
		const role = ROLE_LABELS[p.teamPosition] ?? p.teamPosition;
		roles[role] = (roles[role] || 0) + 1;
	}

	// Champion stats
	const champMap = new Map<
		string,
		{ championId: number; games: number; wins: number; kills: number; deaths: number; assists: number }
	>();
	for (const p of players) {
		const existing = champMap.get(p.championName) ?? {
			championId: p.championId,
			games: 0,
			wins: 0,
			kills: 0,
			deaths: 0,
			assists: 0,
		};
		existing.games++;
		if (p.win) existing.wins++;
		existing.kills += p.kills;
		existing.deaths += p.deaths;
		existing.assists += p.assists;
		champMap.set(p.championName, existing);
	}

	const champStats: ChampStat[] = [...champMap.entries()]
		.map(([name, s]) => ({
			championName: name,
			championId: s.championId,
			games: s.games,
			wins: s.wins,
			avgKills: s.kills / s.games,
			avgDeaths: s.deaths / s.games,
			avgAssists: s.assists / s.games,
		}))
		.sort((a, b) => b.games - a.games);

	// Recent trend (newest first)
	const recentTrend = players.map((p) => p.win);

	return {
		totalGames,
		wins,
		losses,
		winRate: totalGames ? Math.round((wins / totalGames) * 100) : 0,
		avgKills: parseFloat(avgKills.toFixed(1)),
		avgDeaths: parseFloat(avgDeaths.toFixed(1)),
		avgAssists: parseFloat(avgAssists.toFixed(1)),
		avgKDA: parseFloat(avgKDA.toFixed(2)),
		avgCS: Math.round(avgCS),
		avgGold: Math.round(avgGold),
		avgDamage: Math.round(avgDamage),
		avgVisionScore: parseFloat(avgVisionScore.toFixed(1)),
		roles,
		champStats,
		recentTrend,
	};
}
