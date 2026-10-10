import { useQuery } from "@tanstack/react-query";
import { type Match } from "@/lib/validators/match";

const RIFT_MATCH_COUNT = 50;

/** Last 50 stored Summoner's Rift matches (normals, ranked, Clash), newest first. */
export function useRiftMatches(puuid: string | undefined) {
	return useQuery<Match[]>({
		queryKey: ["matches", puuid, "rift"],
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
