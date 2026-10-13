import { useQuery } from "@tanstack/react-query";
import { mmrEstimatesSchema, type MmrEstimates } from "@/lib/validators/mmr";

async function fetchMmr(puuid: string): Promise<MmrEstimates> {
	const res = await fetch(`/api/mmr/${encodeURIComponent(puuid)}`);
	if (!res.ok) throw new Error("Failed to fetch MMR estimate");
	return mmrEstimatesSchema.parse(await res.json());
}

// Waits for the match list to store the newest games, so lobby ranks and LP gaps include them
export function useMmrEstimates(puuid: string | undefined, newestMatchId: string | undefined, settled: boolean) {
	return useQuery<MmrEstimates>({
		queryKey: ["mmr", puuid, newestMatchId ?? null],
		queryFn: () => fetchMmr(puuid!),
		enabled: !!puuid && settled,
		staleTime: 5 * 60 * 1000,
	});
}
