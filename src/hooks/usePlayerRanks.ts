import { type RankedEntry } from "@/lib/validators/ranked";
import { useQuery } from "@tanstack/react-query";

async function fetchPlayerRanks(puuids: string[]) {
	const res = await fetch(`/api/ranked/batch?puuids=${puuids.join(",")}`);
	if (!res.ok) throw new Error("Failed to fetch player ranks");
	return res.json();
}

export function usePlayerRanks(puuids: string[] | undefined) {
	return useQuery<Record<string, RankedEntry[]>>({
		queryKey: ["playerRanks", puuids],
		queryFn: () => fetchPlayerRanks(puuids!),
		staleTime: 1000 * 60 * 5,
		enabled: !!puuids && puuids.length > 0,
	});
}
