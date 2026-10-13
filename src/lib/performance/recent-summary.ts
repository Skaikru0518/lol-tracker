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
	lobby: { teamId: number; score: number }[];
}

export interface RecentSummary {
	games: number;
	wins: number;
	losses: number;
	winRate: number;
	champions: { championName: string; games: number; wins: number; winRate: number; kda: number }[];
	scoredGames: number;
	score: { average: number; grade: Grade } | null;
	mvp: number;
	ace: number;
	categories: { id: CategoryId; score: number; grade: Grade }[];
}

const TOP_CHAMPIONS = 3;
const ratio = (kills: number, deaths: number, assists: number) => Math.round(((kills + assists) / Math.max(deaths, 1)) * 100) / 100;
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

export function summarizeRecent(games: RecentGame[]): RecentSummary {
	const wins = games.filter((g) => g.win).length;

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

	let mvp = 0;
	let ace = 0;
	for (const g of scored) {
		if (g.lobby.length === 0) continue;
		const mine = g.score.score;
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
		champions,
		scoredGames: scored.length,
		score: scored.length ? { average, grade: gradeFor(average) } : null,
		mvp,
		ace,
		categories,
	};
}
