import { type Platform } from "@/lib/game/platforms";
import { type RankedEntry } from "@/lib/validators/ranked";
import { useQuery } from "@tanstack/react-query";

async function fetchPlayerRanks(puuids: string[], platform: Platform) {
	const res = await fetch(`/api/ranked/batch?${new URLSearchParams({ puuids: puuids.join(","), platform })}`);
	if (!res.ok) throw new Error("Failed to fetch player ranks");
	return res.json();
}

export function usePlayerRanks(puuids: string[] | undefined, platform: Platform) {
	return useQuery<Record<string, RankedEntry[]>>({
		queryKey: ["playerRanks", platform, puuids],
		queryFn: () => fetchPlayerRanks(puuids!, platform),
		staleTime: 1000 * 60 * 5,
		enabled: !!puuids && puuids.length > 0,
	});
}
