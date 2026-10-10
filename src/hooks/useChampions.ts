import { useQuery } from "@tanstack/react-query";
import { useDDragonVersion } from "./useDDragonVersion";
import { type Champion, getChampionMap } from "@/lib/game/icon-helpers";

export function useChampions() {
	const { data: version } = useDDragonVersion();

	return useQuery<Record<number, Champion>>({
		queryKey: ["champions", version],
		queryFn: () => getChampionMap(version!),
		staleTime: Infinity,
		enabled: !!version,
	});
}
