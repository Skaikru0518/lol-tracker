import { useQuery } from "@tanstack/react-query";
import { useDDragonVersion } from "./useDDragonVersion";
import { getItemMap } from "@/lib/icon-helpers";

export function useItems() {
	const { data: version } = useDDragonVersion();

	return useQuery<Map<number, string>>({
		queryKey: ["items", version],
		queryFn: () => getItemMap(version!),
		staleTime: Infinity,
		enabled: !!version,
	});
}
