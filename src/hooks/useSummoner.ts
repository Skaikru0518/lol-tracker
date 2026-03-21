import { Summoner } from "@/lib/validators/summoner";
import { useQuery } from "@tanstack/react-query";

async function fetchSummoner(puuid: string) {
	const res = await fetch(`/api/summoner?puuid=${puuid}`);
	if (!res.ok) throw new Error("Summoner not found");
	return res.json();
}

export function useSummoner(puuid: string | undefined) {
	return useQuery<Summoner>({
		queryKey: ["summoner", puuid],
		queryFn: () => fetchSummoner(puuid!),
		staleTime: 1000 * 60 * 30,
		enabled: !!puuid,
	});
}
