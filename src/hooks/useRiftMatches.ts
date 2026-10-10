import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { type Match } from "@/lib/validators/match";

const RIFT_MATCH_COUNT = 50;

/** Query key for the Rift list; it carries the match list's newest game so a new game refetches it. */
export function riftMatchesKey(puuid: string | undefined, newestMatchId: string | undefined) {
	return ["matches", puuid, "rift", newestMatchId ?? null] as const;
}

/** Last 50 stored Summoner's Rift matches (normals, ranked, Clash), newest first; refetches when `newestMatchId` changes. */
export function useRiftMatches(puuid: string | undefined, newestMatchId: string | undefined) {
	return useQuery<Match[]>({
		queryKey: riftMatchesKey(puuid, newestMatchId),
		placeholderData: keepPreviousData,
		queryFn: async () => {
			const params = new URLSearchParams({ puuid: puuid!, count: String(RIFT_MATCH_COUNT), rift: "true" });
			const res = await fetch(`/api/matches?${params}`);
			if (!res.ok) throw new Error("Failed to fetch matches");
			return res.json();
		},
		staleTime: 1000 * 60 * 5,
		enabled: !!puuid,
	});
}
