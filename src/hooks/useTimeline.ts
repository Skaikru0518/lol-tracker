import { useQuery } from "@tanstack/react-query";
import { HttpError, retryUnlessNotFound } from "@/lib/shared/http-error";
import { type Timeline } from "@/lib/validators/timeline";

async function fetchTimeline(matchId: string) {
	const res = await fetch(`/api/matches/${matchId}/timeline`);
	if (!res.ok) throw new HttpError("Failed to fetch timeline", res.status);
	return res.json();
}

export function useTimeline(matchId: string | undefined) {
	return useQuery<Timeline>({
		queryKey: ["timeline", matchId],
		queryFn: () => fetchTimeline(matchId!),
		staleTime: Infinity,
		enabled: !!matchId,
		retry: retryUnlessNotFound,
	});
}
