import { useQuery } from "@tanstack/react-query";
import { type ChampionStat } from "@/lib/validators/champion-stats";
import { type QueueFilter } from "@/lib/champion-stats/queue";

async function fetchChampionStats(puuid: string, queue: QueueFilter): Promise<ChampionStat[]> {
	const params = new URLSearchParams({ puuid, queue });
	const res = await fetch(`/api/champion-stats?${params}`);
	if (!res.ok) throw new Error("Failed to fetch champion stats");
	return res.json();
}

/** Per-champion stats over the player's stored matches. */
export function useChampionStats(puuid: string | undefined, queue: QueueFilter = "all") {
	return useQuery<ChampionStat[]>({
		queryKey: ["champion-stats", puuid, queue],
		queryFn: () => fetchChampionStats(puuid!, queue),
		staleTime: 1000 * 60 * 5,
		enabled: !!puuid,
	});
}
