import { RankedEntry } from "@/lib/validators/ranked";
import { useQuery } from "@tanstack/react-query";

async function fetchRanked(puuid: string) {
	const res = await fetch(`/api/ranked?puuid=${puuid}`);
	if (!res.ok) throw new Error("Failed to fetch ranked data");
	return res.json();
}

export function useRanked(puuid: string | undefined) {
	return useQuery<RankedEntry[]>({
		queryKey: ["ranked", puuid],
		queryFn: () => fetchRanked(puuid!),
		staleTime: 1000 * 60 * 5,
		enabled: !!puuid,
	});
}
