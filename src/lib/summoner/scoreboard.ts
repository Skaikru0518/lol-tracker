import { type Match, type Participant } from "@/lib/validators/match";

export interface TeamObjectives {
	towers: number;
	dragons: number;
	barons: number;
	heralds: number;
	grubs: number;
}

export interface TeamSummary {
	teamId: number;
	win: boolean;
	kills: number;
	deaths: number;
	assists: number;
	bans: number[];
	objectives: TeamObjectives;
}

export interface ScoreboardRowPair {
	blue: Participant | null;
	red: Participant | null;
}

export interface ScoreboardData {
	blue: TeamSummary;
	red: TeamSummary;
	rows: ScoreboardRowPair[];
}

const POSITION_ORDER = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

function positionRank(p: Participant): number {
	const index = POSITION_ORDER.indexOf(p.teamPosition);
	return index === -1 ? POSITION_ORDER.length : index;
}

function teamPlayers(match: Match, teamId: number): Participant[] {
	return match.info.participants
		.filter((p) => p.teamId === teamId)
		.map((p, index) => ({ p, index }))
		.sort((a, b) => positionRank(a.p) - positionRank(b.p) || a.index - b.index)
		.map(({ p }) => p);
}

function summarize(match: Match, teamId: number, players: Participant[]): TeamSummary {
	const team = match.info.teams.find((t) => t.teamId === teamId);
	const objective = (key: string) => team?.objectives?.[key]?.kills ?? 0;

	return {
		teamId,
		win: team?.win ?? players[0]?.win ?? false,
		kills: players.reduce((sum, p) => sum + p.kills, 0),
		deaths: players.reduce((sum, p) => sum + p.deaths, 0),
		assists: players.reduce((sum, p) => sum + p.assists, 0),
		bans: (team?.bans ?? []).map((b) => b.championId).filter((id) => id > 0),
		objectives: {
			towers: objective("tower"),
			dragons: objective("dragon"),
			barons: objective("baron"),
			heralds: objective("riftHerald"),
			grubs: objective("horde"),
		},
	};
}

/** Blue (100) vs red (200) summary with lane opponents paired by position; missing players are `null`. */
export function buildScoreboard(match: Match): ScoreboardData {
	const blue = teamPlayers(match, 100);
	const red = teamPlayers(match, 200);
	const rows = Array.from({ length: Math.max(blue.length, red.length) }, (_, i) => ({
		blue: blue[i] ?? null,
		red: red[i] ?? null,
	}));

	return { blue: summarize(match, 100, blue), red: summarize(match, 200, red), rows };
}
