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

/** Inputs for one season; `ranked` is null for a closed season (current ranks say nothing about it). */
export interface SeasonalInputs {
	champions: ChampionTotals[];
	wins: boolean[];
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
