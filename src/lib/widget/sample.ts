import { type WidgetData, type WidgetGame } from "@/lib/validators/widget";

const HOUR = 60 * 60 * 1000;

const SAMPLE_GAMES: WidgetGame[] = [
	["Ahri", true, 7, 2, 9],
	["Ahri", true, 11, 4, 6],
	["Sylas", false, 3, 6, 4],
	["Ahri", true, 8, 1, 12],
	["Orianna", true, 4, 2, 15],
	["Ahri", false, 5, 7, 3],
	["Ahri", true, 9, 3, 7],
].map(([championName, win, kills, deaths, assists], i) => ({
	matchId: `sample-${i}`,
	championName: championName as string,
	win: win as boolean,
	kills: kills as number,
	deaths: deaths as number,
	assists: assists as number,
	start: i * HOUR,
	end: i * HOUR + HOUR / 2,
}));

export const SAMPLE_WIDGET: WidgetData = {
	gameName: "Skaikru",
	tagLine: "HEAVN",
	platform: "eune",
	rank: { tier: "EMERALD", division: "II", leaguePoints: 54 },
	scope: "session",
	record: { wins: 5, losses: 2 },
	games: SAMPLE_GAMES,
	lpChange: 38,
	liveChampion: "Ahri",
};

/** The generator preview needs games to judge the strip and dots; an empty real session gets sample ones. */
export function withSampleSession(data: WidgetData): { data: WidgetData; sample: boolean } {
	if (data.games.length) return { data, sample: false };
	const games = { games: SAMPLE_GAMES, liveChampion: SAMPLE_WIDGET.liveChampion };
	// A season view keeps its real record; only the game icons are samples
	if (data.scope === "season") return { data: { ...data, ...games }, sample: true };
	return { data: { ...data, ...games, record: SAMPLE_WIDGET.record, lpChange: SAMPLE_WIDGET.lpChange }, sample: true };
}
