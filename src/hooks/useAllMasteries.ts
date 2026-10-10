import { useQuery } from "@tanstack/react-query";
import { type MasteryEntry } from "@/lib/summoner/mastery";

async function fetchAllMasteries(puuid: string): Promise<MasteryEntry[]> {
	const res = await fetch(`/api/mastery?${new URLSearchParams({ puuid, all: "true" })}`);
	if (!res.ok) throw new Error("Failed to fetch masteries");
	return res.json();
}

/** Mastery for every champion the player has played. */
export function useAllMasteries(puuid: string | undefined) {
	return useQuery<MasteryEntry[]>({
		queryKey: ["mastery", puuid, "all"],
		queryFn: () => fetchAllMasteries(puuid!),
		staleTime: 1000 * 60 * 30,
		enabled: !!puuid,
	});
}
