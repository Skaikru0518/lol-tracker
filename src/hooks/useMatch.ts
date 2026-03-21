import { useQuery } from "@tanstack/react-query";
import { type Match } from "@/lib/validators/match";

async function fetchMatch(matchId: string) {
	const res = await fetch(`/api/matches/${matchId}`);
	if (!res.ok) throw new Error("Match not found");
	return res.json();
}

export function useMatch(matchId: string | undefined) {
	return useQuery<Match>({
		queryKey: ["match", matchId],
		queryFn: () => fetchMatch(matchId!),
		staleTime: Infinity,
		enabled: !!matchId,
	});
}
