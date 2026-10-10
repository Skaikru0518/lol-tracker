import { useQuery } from "@tanstack/react-query";
import { type LPSnapshot } from "@/lib/validators/lp-history";
import { type LpRange } from "@/lib/lp-history/range";

export type { LPSnapshot };

async function fetchLPHistory(
	puuid: string,
	queueType: string,
	range?: LpRange,
): Promise<LPSnapshot[]> {
	const params = new URLSearchParams({ puuid, queueType });
	if (range) params.set("range", range);
	const res = await fetch(`/api/lp-history?${params}`);
	if (!res.ok) throw new Error("Failed to fetch LP history");
	return res.json();
}

/** LP snapshots oldest first; without `range` the last 100 are returned. */
export function useLPHistory(
	puuid: string | undefined,
	queueType: string = "RANKED_SOLO_5x5",
	range?: LpRange,
) {
	return useQuery<LPSnapshot[]>({
		queryKey: ["lp-history", puuid, queueType, range ?? "legacy"],
		queryFn: () => fetchLPHistory(puuid!, queueType, range),
		staleTime: 1000 * 60 * 5,
		enabled: !!puuid,
	});
}
