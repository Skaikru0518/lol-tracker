import { isAchievementEligible } from "@/lib/achievements/eligibility";
import { type Baselines, type RoleBaseline } from "@/lib/validators/performance";
import { curveScore } from "./curve";
import { gradeFor, type Grade } from "./grades";
import { playerMetrics, type MetricValues, type ScoringParticipant } from "./metrics";
import { percentileOf } from "./percentile";
import { asRole, type Role } from "./roles";
import { CATEGORIES, CATEGORY_METRICS, LOWER_IS_BETTER, ROLE_WEIGHTS, type CategoryId, type MetricId } from "./weights";

export const MIN_BASELINE_GAMES = 30;
// Scores are cached for good, so only freeze them once every role's baseline has a real sample
export const MIN_CACHE_GAMES = 100;

export interface ScoringMatch {
	info: { queueId: number; gameDuration: number; participants: ScoringParticipant[] };
}

export interface CategoryScore {
	id: CategoryId;
	score: number;
	grade: Grade;
	metrics: { id: MetricId; value: number; percentile: number }[];
}

export interface OpponentDiff {
	championName: string;
	goldDiff: number;
	xpDiff: number | null;
	csDiff: number;
	damageDiff: number;
}

export interface PerformanceScore {
	role: Role;
	score: number;
	grade: Grade;
	baselineGames: number;
	categories: CategoryScore[];
	opponent: OpponentDiff | null;
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const cs = (p: ScoringParticipant) => p.totalMinionsKilled + p.neutralMinionsKilled;

export interface RawScores {
	categories: { id: CategoryId; raw: number; metrics: CategoryScore["metrics"] }[];
	overall: number;
}

/** Mean metric percentiles per category and their role-weighted mean, before calibration. */
export function rawScores(values: MetricValues, baseline: RoleBaseline, role: Role): RawScores | null {
	const categories: RawScores["categories"] = [];
	for (const id of CATEGORIES) {
		const metrics = CATEGORY_METRICS[id].flatMap((metric) => {
			const value = values[metric];
			const quantiles = baseline.metrics[metric];
			if (value === undefined || !quantiles) return [];
			const raw = percentileOf(value, quantiles);
			// Rounded because every score is cached as JSON for good
			return [{ id: metric, value: Math.round(value * 100) / 100, percentile: Math.round(LOWER_IS_BETTER.has(metric) ? 100 - raw : raw) }];
		});
		if (metrics.length > 0) categories.push({ id, raw: mean(metrics.map((m) => m.percentile)), metrics });
	}
	if (categories.length === 0) return null;
	const weights = ROLE_WEIGHTS[role];
	const totalWeight = categories.reduce((s, c) => s + weights[c.id], 0);
	return { categories, overall: categories.reduce((s, c) => s + c.raw * weights[c.id], 0) / totalWeight };
}

// Averaging percentiles pulls every game towards 50, so raw scores are ranked against the role's own raw scores
function calibrated(raw: number, quantiles: number[] | undefined): number {
	return Math.round(quantiles ? curveScore(percentileOf(raw, quantiles)) : raw);
}

export function scorePerformance(match: ScoringMatch, puuid: string, baselines: Baselines | null): PerformanceScore | null {
	const { info } = match;
	if (!baselines || !isAchievementEligible(info.queueId, info.gameDuration)) return null;
	const player = info.participants.find((p) => p.puuid === puuid);
	const role = player ? asRole(player.teamPosition) : null;
	const baseline = role ? baselines.roles[role] : undefined;
	if (!player || !role || !baseline || baseline.games < MIN_BASELINE_GAMES) return null;

	const { values, opponent } = playerMetrics(player, info.participants, info.gameDuration);
	const raw = rawScores(values, baseline, role);
	if (!raw) return null;

	const calibration = baseline.calibration;
	const categories: CategoryScore[] = raw.categories.map(({ id, raw: value, metrics }) => {
		const score = calibrated(value, calibration?.categories[id]);
		return { id, score, grade: gradeFor(score), metrics };
	});
	const score = calibrated(raw.overall, calibration?.overall);

	return {
		role,
		score,
		grade: gradeFor(score),
		baselineGames: baseline.games,
		categories,
		opponent: opponent && {
			championName: opponent.championName,
			goldDiff: player.goldEarned - opponent.goldEarned,
			xpDiff: player.champExperience !== undefined && opponent.champExperience !== undefined ? player.champExperience - opponent.champExperience : null,
			csDiff: cs(player) - cs(opponent),
			damageDiff: player.totalDamageDealtToChampions - opponent.totalDamageDealtToChampions,
		},
	};
}

export function scoreMatch(match: ScoringMatch, baselines: Baselines | null): { scores: Record<string, PerformanceScore>; cacheable: boolean } {
	const { info } = match;
	if (!baselines || !isAchievementEligible(info.queueId, info.gameDuration)) return { scores: {}, cacheable: false };
	const scores: Record<string, PerformanceScore> = {};
	let cacheable = true;
	for (const participant of info.participants) {
		const role = asRole(participant.teamPosition);
		if (!role) continue;
		const baseline = baselines.roles[role];
		if (!baseline?.calibration || baseline.games < MIN_CACHE_GAMES) cacheable = false;
		const score = scorePerformance(match, participant.puuid, baselines);
		if (score) scores[participant.puuid] = score;
	}
	return { scores, cacheable };
}

export type ScoreSummary = Pick<PerformanceScore, "score" | "grade">;

export function summarize(scores: Record<string, PerformanceScore>): Record<string, ScoreSummary> {
	return Object.fromEntries(Object.entries(scores).map(([puuid, s]) => [puuid, { score: s.score, grade: s.grade }]));
}
