/** One eligible game of a player, reduced to what achievements count. */
export interface GameRow {
	championName: string;
	gameCreation: number;
	gameDuration: number;
	teamPosition: string;
	win: boolean;
	pentas: number;
	quadras: number;
	kills: number;
	deaths: number;
	assists: number;
	vision: number;
	turrets: number;
	epics: number;
	gold: number;
	cs: number;
	damage: number;
	wardsPlaced: number;
	wardsKilled: number;
	support: number;
	firstBlood: boolean;
	largestSpree: number;
}

/** Per-champion sums over a player's eligible games in some time range. */
export interface ChampionTotals {
	championName: string;
	games: number;
	wins: number;
	pentas: number;
	quadras: number;
	kills: number;
	assists: number;
	vision: number;
	turrets: number;
	epics: number;
	gold: number;
	cs: number;
	damage: number;
	wardsPlaced: number;
	wardsKilled: number;
	support: number;
	firstBloods: number;
	deathless: number;
	legendary: number;
	seconds: number;
}

/** One stored LP snapshot, reduced to its tier. */
export interface TierSnapshot {
	queueType: string;
	tier: string;
	createdAt: Date;
}

/** A current ranked entry, reduced to its tier. */
export interface CurrentRank {
	queueType: string;
	tier: string;
}

export interface MasteryPoint {
	championLevel: number;
	championPoints: number;
}

export interface MilestoneInputs {
	champions: ChampionTotals[];
	snapshots: TierSnapshot[];
	ranked: CurrentRank[];
	masteries: MasteryPoint[];
}

/** Inputs for one season; `games` are oldest first, `ranked` is null for a closed season (current ranks say nothing about it). */
export interface SeasonalInputs {
	champions: ChampionTotals[];
	games: GameRow[];
	snapshots: TierSnapshot[];
	ranked: CurrentRank[] | null;
}

export interface ProgressResult {
	achievementId: string;
	scope: string;
	value: number;
	tier: number;
}

/** A saved row: `reachedAt[i]` is when tier i+1 was first detected. */
export interface StoredProgress extends ProgressResult {
	reachedAt: Date[];
}

export type ProgressDisplay = "count" | "points" | "rank";

export interface ProgressDef {
	id: string;
	name: string;
	description: string;
	icon: string;
	color: string;
	thresholds: readonly number[];
	display: ProgressDisplay;
}

/** Scope of all-time milestone rows; seasonal rows use the season id. */
export const ALL_TIME_SCOPE = "all";
