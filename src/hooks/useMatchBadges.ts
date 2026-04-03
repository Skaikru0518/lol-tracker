import { useQuery } from "@tanstack/react-query";

interface MatchBadge {
	puuid: string;
	badgeId: string;
}

async function fetchMatchBadges(matchId: string): Promise<MatchBadge[]> {
	const res = await fetch(`/api/match-badges?matchId=${matchId}`);
	if (!res.ok) throw new Error("Failed to fetch match badges");
	return res.json();
}

export function useMatchBadges(matchId: string | undefined) {
	return useQuery<MatchBadge[]>({
		queryKey: ["matchBadges", matchId],
		queryFn: () => fetchMatchBadges(matchId!),
		staleTime: Infinity,
		enabled: !!matchId,
	});
}
