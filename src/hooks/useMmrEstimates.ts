import { useQuery } from "@tanstack/react-query";
import { mmrEstimatesSchema, type MmrEstimates } from "@/lib/validators/mmr";

async function fetchMmr(puuid: string): Promise<MmrEstimates> {
	const res = await fetch(`/api/mmr/${encodeURIComponent(puuid)}`);
	if (!res.ok) throw new Error("Failed to fetch MMR estimate");
	return mmrEstimatesSchema.parse(await res.json());
}

export function useMmrEstimates(puuid: string | undefined) {
	return useQuery<MmrEstimates>({ queryKey: ["mmr", puuid], queryFn: () => fetchMmr(puuid!), enabled: !!puuid, staleTime: 5 * 60 * 1000 });
}
