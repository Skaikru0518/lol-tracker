import { useQuery } from "@tanstack/react-query";
import { type LpRange } from "@/lib/lp-history/range";
import { winrateHeatmapSchema, type WinrateHeatmap } from "@/lib/validators/winrate-heatmap";

async function fetchWinrateHeatmap(puuid: string, range: LpRange): Promise<WinrateHeatmap> {
	const res = await fetch(`/api/winrate-heatmap?${new URLSearchParams({ puuid, range })}`);
	if (!res.ok) throw new Error("Failed to fetch win rate heatmap");
	return winrateHeatmapSchema.parse(await res.json());
}

/** Ranked win rate by weekday and time of day for the LP history range. */
export function useWinrateHeatmap(puuid: string | undefined, range: LpRange) {
	return useQuery<WinrateHeatmap>({
		queryKey: ["winrate-heatmap", puuid, range],
		queryFn: () => fetchWinrateHeatmap(puuid!, range),
		staleTime: 1000 * 60 * 5,
		enabled: !!puuid,
	});
}
