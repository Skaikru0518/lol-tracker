import { useQuery } from "@tanstack/react-query";
import { getDDragonVersion } from "@/lib/icon-helpers";

export function useDDragonVersion() {
	return useQuery<string>({
		queryKey: ["ddragon-version"],
		queryFn: getDDragonVersion,
		staleTime: 1000 * 60 * 60,
		retry: 3,
		retryDelay: 1000,
	});
}
