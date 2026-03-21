import { useQuery } from "@tanstack/react-query";
import { type LiveGame } from "@/lib/validators/live-game";

interface LiveGameResponse {
	inGame: boolean;
	gameId?: number;
	gameMode?: string;
	gameType?: string;
	gameLength?: number;
	mapId?: number;
	participants?: LiveGame["participants"];
	gameQueueConfigId?: number;
}

async function fetchLiveGame(puuid: string) {
	const res = await fetch(`/api/live-game?puuid=${puuid}`);
	if (!res.ok) throw new Error("Failed to check live game");
	return res.json();
}

export function useLiveGame(puuid: string | undefined) {
	return useQuery<LiveGameResponse>({
		queryKey: ["live-game", puuid],
		queryFn: () => fetchLiveGame(puuid!),
		staleTime: 1000 * 30,
		refetchInterval: 1000 * 60,
		enabled: !!puuid,
	});
}
