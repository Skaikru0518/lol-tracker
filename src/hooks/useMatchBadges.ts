import { useQuery } from "@tanstack/react-query";

interface MatchBadge {
	puuid: string;
	badgeId: string;
}

async function fetchMatchBadgesBatch(
	matchIds: string[],
): Promise<Record<string, MatchBadge[]>> {
	const res = await fetch(
		`/api/match-badges/batch?matchIds=${matchIds.join(",")}`,
	);
	if (!res.ok) throw new Error("Failed to fetch match badges");
	return res.json();
}

export function useMatchBadgesBatch(matchIds: string[] | undefined) {
	return useQuery<Record<string, MatchBadge[]>>({
		queryKey: ["matchBadgesBatch", matchIds],
		queryFn: () => fetchMatchBadgesBatch(matchIds!),
		staleTime: Infinity,
		enabled: !!matchIds && matchIds.length > 0,
	});
}
