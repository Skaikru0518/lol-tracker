import { Match } from "@/lib/validators/match";
import { useQuery } from "@tanstack/react-query";

async function fetchMatches(
	puuid: string,
	count: number = 20,
	championId?: number,
	start: number = 0,
) {
	const params = new URLSearchParams({ puuid, count: count.toString() });
	if (championId) params.set("championId", championId.toString());
	if (start > 0) params.set("start", start.toString());
	const res = await fetch(`/api/matches?${params}`);
	if (!res.ok) throw new Error("Failed to fetch matches");
	return res.json();
}

export function useMatches(
	puuid: string | undefined,
	count: number = 20,
	championId?: number,
	start: number = 0,
) {
	return useQuery<Match[]>({
		queryKey: ["matches", puuid, count, championId, start],
		queryFn: () => fetchMatches(puuid!, count, championId, start),
		staleTime: 1000 * 60 * 5,
		enabled: !!puuid,
	});
}
