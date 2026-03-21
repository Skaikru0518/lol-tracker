import { useQuery } from "@tanstack/react-query";
import { useDDragonVersion } from "./useDDragonVersion";
import { type RuneData, type RuneStyle, getRuneMap } from "@/lib/icon-helpers";

export function useRunes() {
	const { data: version } = useDDragonVersion();

	return useQuery<{ runes: Map<number, RuneData>; styles: Map<number, RuneStyle> }>({
		queryKey: ["runes", version],
		queryFn: () => getRuneMap(version!),
		staleTime: Infinity,
		enabled: !!version,
	});
}
