import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
	matchPerformanceSchema,
	performanceSummariesSchema,
	recentSummarySchema,
	type MatchPerformance,
	type PerformanceSummaries,
	type RecentSummaryPayload,
} from "@/lib/validators/performance";

const RETRY_UNSCORED_MS = 10 * 60 * 1000;

async function fetchSummaries(matchIds: string[], puuid: string): Promise<PerformanceSummaries> {
	const res = await fetch(`/api/performance/summary?${new URLSearchParams({ puuid, matchIds: matchIds.join(",") })}`);
	if (!res.ok) throw new Error("Failed to fetch performance scores");
	return performanceSummariesSchema.parse(await res.json());
}

async function fetchMatchPerformance(matchId: string): Promise<MatchPerformance> {
	const res = await fetch(`/api/performance/${encodeURIComponent(matchId)}`);
	if (!res.ok) throw new Error("Failed to fetch performance score");
	return matchPerformanceSchema.parse(await res.json());
}

// Finished games never change, so scored ones never go stale; unscored ones are asked again later
export function usePerformanceSummaries(matchIds: string[] | undefined, puuid: string) {
	return useQuery<PerformanceSummaries>({
		queryKey: ["performance-summaries", puuid, matchIds],
		queryFn: () => fetchSummaries(matchIds!, puuid),
		enabled: !!matchIds && matchIds.length > 0,
		placeholderData: keepPreviousData,
		staleTime: (query) => (Object.values(query.state.data ?? {}).some((s) => s === null) ? RETRY_UNSCORED_MS : Infinity),
	});
}

export function useMatchPerformance(matchId: string) {
	return useQuery<MatchPerformance>({
		queryKey: ["match-performance", matchId],
		queryFn: () => fetchMatchPerformance(matchId),
		staleTime: (query) => (Object.keys(query.state.data ?? {}).length === 0 ? RETRY_UNSCORED_MS : Infinity),
	});
}

async function fetchRecent(puuid: string): Promise<RecentSummaryPayload> {
	const res = await fetch(`/api/performance/recent?${new URLSearchParams({ puuid })}`);
	if (!res.ok) throw new Error("Failed to fetch recent performance");
	return recentSummarySchema.parse(await res.json());
}

// Keyed by the newest match so the panel refreshes once new games are stored
export function useRecentPerformance(puuid: string | undefined, newestMatchId: string | undefined) {
	return useQuery<RecentSummaryPayload>({
		queryKey: ["recent-performance", puuid, newestMatchId],
		queryFn: () => fetchRecent(puuid!),
		enabled: !!puuid,
		placeholderData: keepPreviousData,
		staleTime: RETRY_UNSCORED_MS,
	});
}
