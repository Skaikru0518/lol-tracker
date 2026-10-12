import { gradeFor, type Grade } from "./grades";
import { type PerformanceScore } from "./score";
import { CATEGORIES, type CategoryId } from "./weights";

export interface RecentGame {
	championName: string;
	win: boolean;
	kills: number;
	deaths: number;
	assists: number;
	teamId: number;
	score: PerformanceScore | null;
	lobby: { puuid: string; teamId: number; win: boolean; score: number }[];
}

export interface RecentSummary {
	games: number;
	wins: number;
	losses: number;
	winRate: number;
	kills: number;
	deaths: number;
	assists: number;
	kda: number;
	champions: { championName: string; games: number; wins: number; winRate: number; kda: number }[];
	scoredGames: number;
	score: { average: number; grade: Grade } | null;
	lobbyRank: number | null;
	mvp: number;
	ace: number;
	categories: { id: CategoryId; score: number; grade: Grade }[];
}

const TOP_CHAMPIONS = 3;
const round1 = (x: number) => Math.round(x * 10) / 10;
const ratio = (kills: number, deaths: number, assists: number) => Math.round(((kills + assists) / Math.max(deaths, 1)) * 100) / 100;
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

export function summarizeRecent(puuid: string, games: RecentGame[]): RecentSummary {
	const wins = games.filter((g) => g.win).length;
	const total = (key: "kills" | "deaths" | "assists") => games.reduce((s, g) => s + g[key], 0);

	const byChampion = new Map<string, RecentGame[]>();
	for (const g of games) byChampion.set(g.championName, [...(byChampion.get(g.championName) ?? []), g]);
	const champions = [...byChampion.entries()]
		.map(([championName, list]) => {
			const won = list.filter((g) => g.win).length;
			const sum = (key: "kills" | "deaths" | "assists") => list.reduce((s, g) => s + g[key], 0);
			return { championName, games: list.length, wins: won, winRate: Math.round((won / list.length) * 100), kda: ratio(sum("kills"), sum("deaths"), sum("assists")) };
		})
		.sort((a, b) => b.games - a.games || b.wins - a.wins)
		.slice(0, TOP_CHAMPIONS);

	const scored = games.filter((g): g is RecentGame & { score: PerformanceScore } => g.score !== null);
	const average = Math.round(avg(scored.map((g) => g.score.score)));

	const ranks: number[] = [];
	let mvp = 0;
	let ace = 0;
	for (const g of scored) {
		if (g.lobby.length === 0) continue;
		const mine = g.score.score;
		ranks.push(1 + g.lobby.filter((p) => p.puuid !== puuid && p.score > mine).length);
		const best = Math.max(...g.lobby.filter((p) => p.teamId === g.teamId).map((p) => p.score));
		if (mine < best) continue;
		if (g.win) mvp++;
		else ace++;
	}

	const categories = CATEGORIES.flatMap((id) => {
		const values = scored.flatMap((g) => g.score.categories.filter((c) => c.id === id).map((c) => c.score));
		if (values.length === 0) return [];
		const score = Math.round(avg(values));
		return [{ id, score, grade: gradeFor(score) }];
	});

	return {
		games: games.length,
		wins,
		losses: games.length - wins,
		winRate: games.length ? Math.round((wins / games.length) * 100) : 0,
		kills: round1(avg(games.map((g) => g.kills))),
		deaths: round1(avg(games.map((g) => g.deaths))),
		assists: round1(avg(games.map((g) => g.assists))),
		kda: ratio(total("kills"), total("deaths"), total("assists")),
		champions,
		scoredGames: scored.length,
		score: scored.length ? { average, grade: gradeFor(average) } : null,
		lobbyRank: ranks.length ? round1(avg(ranks)) : null,
		mvp,
		ace,
		categories,
	};
}
