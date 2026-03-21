import { useQuery } from "@tanstack/react-query";
import { type ChampionMastery } from "@/lib/validators/mastery";

async function fetchMasteries(puuid: string, count: number = 5) {
	const res = await fetch(`/api/mastery?puuid=${puuid}&count=${count}`);
	if (!res.ok) throw new Error("Failed to fetch masteries");
	return res.json();
}

export function useMastery(puuid: string | undefined, count: number = 5) {
	return useQuery<ChampionMastery[]>({
		queryKey: ["mastery", puuid, count],
		queryFn: () => fetchMasteries(puuid!, count),
		staleTime: 1000 * 60 * 30,
		enabled: !!puuid,
	});
}
