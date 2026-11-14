import { getChampionDisplayName } from "@/lib/game/icon-helpers";
import { getQueueName } from "@/lib/game/queue-names";
import { formatRankLabel } from "@/lib/game/rank-calculator";
import { isRemake } from "@/lib/match/remake";
import { type Grade } from "@/lib/performance/grades";
import { ROLE_LABELS, type Role } from "@/lib/performance/roles";
import { type PerformanceScore } from "@/lib/performance/score";
import { type CategoryId } from "@/lib/performance/weights";
import { csPerMinute, formatDuration, kdaRatio } from "@/lib/shared/format";
import { type Match } from "@/lib/validators/match";

const RANK_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface MatchCard {
	result: "win" | "loss" | "remake";
	queue: string;
	duration: string;
	role: string | null;
	championName: string;
	kills: number;
	deaths: number;
	assists: number;
	kda: string;
	csPerMin: string;
	killShare: number;
	score: { value: number; grade: Grade; categories: { id: CategoryId; score: number; grade: Grade }[] } | null;
	badgeIds: string[];
	riotId: string;
	rank: { tier: string; division: string; lp: number } | null;
}

export function buildMatchCard(match: Match, puuid: string, score: PerformanceScore | null, badgeIds: string[], rank: MatchCard["rank"]): MatchCard | null {
	const { info } = match;
	const p = info.participants.find((x) => x.puuid === puuid);
	if (!p) return null;

	const remake = isRemake(info.gameDuration);
	const teamKills = info.participants.filter((x) => x.teamId === p.teamId).reduce((s, x) => s + x.kills, 0);
	const kda = kdaRatio(p.kills, p.deaths, p.assists);
	return {
		result: remake ? "remake" : p.win ? "win" : "loss",
		queue: getQueueName(info.queueId),
		duration: formatDuration(info.gameDuration),
		role: ROLE_LABELS[p.teamPosition as Role] ?? null,
		championName: p.championName,
		kills: p.kills,
		deaths: p.deaths,
		assists: p.assists,
		kda: kda === null ? "Perfect" : kda.toFixed(1),
		csPerMin: csPerMinute(p.totalMinionsKilled + p.neutralMinionsKilled, info.gameDuration).toFixed(1),
		killShare: teamKills > 0 ? Math.round(((p.kills + p.assists) / teamKills) * 100) / 100 : 0,
		score:
			score && !remake
				? { value: score.score, grade: score.grade, categories: score.categories.map(({ id, score: s, grade }) => ({ id, score: s, grade })) }
				: null,
		badgeIds,
		riotId: `${p.riotIdGameName}#${p.riotIdTagline}`,
		rank,
	};
}

// The image is cached for a year, so the rank must be the one the game produced, not today's
export function pickRankAtMatch(snapshots: { tier: string; rank: string; lp: number; createdAt: Date }[], gameEndMs: number): MatchCard["rank"] {
	const after = snapshots
		.filter((s) => s.createdAt.getTime() >= gameEndMs && s.createdAt.getTime() < gameEndMs + RANK_WINDOW_MS)
		.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
	return after ? { tier: after.tier, division: after.rank, lp: after.lp } : null;
}

const RESULT_LABEL = { win: "Victory", loss: "Defeat", remake: "Remake" } as const;

export function matchMetadata(card: MatchCard): { title: string; description: string } {
	const title = [`${card.riotId}`, `${getChampionDisplayName(card.championName)} ${card.kills}/${card.deaths}/${card.assists}`, card.score && `${card.score.grade} ${card.score.value}`];
	const description = [`${RESULT_LABEL[card.result]} in ${card.queue}`, card.rank && `${formatRankLabel(card.rank.tier, card.rank.division)} ${card.rank.lp} LP`];
	return { title: title.filter(Boolean).join(" · "), description: description.filter(Boolean).join(" · ") };
}
