import { useQuery } from "@tanstack/react-query";
import { HttpError, retryUnlessNotFound } from "@/lib/http-error";
import { type Match } from "@/lib/validators/match";

async function fetchMatch(matchId: string) {
	const res = await fetch(`/api/matches/${matchId}`);
	if (!res.ok) throw new HttpError("Match not found", res.status);
	return res.json();
}

export function useMatch(matchId: string | undefined) {
	return useQuery<Match>({
		queryKey: ["match", matchId],
		queryFn: () => fetchMatch(matchId!),
		staleTime: Infinity,
		enabled: !!matchId,
		retry: retryUnlessNotFound,
	});
}
