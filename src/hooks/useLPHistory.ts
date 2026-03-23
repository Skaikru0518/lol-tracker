import { useQuery } from "@tanstack/react-query";

export interface LPSnapshot {
	id: string;
	tier: string;
	rank: string;
	lp: number;
	wins: number | null;
	losses: number | null;
	createdAt: string;
}

async function fetchLPHistory(puuid: string, queueType: string) {
	const res = await fetch(
		`/api/lp-history?puuid=${puuid}&queueType=${queueType}`,
	);
	if (!res.ok) throw new Error("Failed to fetch LP history");
	return res.json();
}

export function useLPHistory(
	puuid: string | undefined,
	queueType: string = "RANKED_SOLO_5x5",
) {
	return useQuery<LPSnapshot[]>({
		queryKey: ["lp-history", puuid, queueType],
		queryFn: () => fetchLPHistory(puuid!, queueType),
		staleTime: 1000 * 60 * 5,
		enabled: !!puuid,
	});
}
