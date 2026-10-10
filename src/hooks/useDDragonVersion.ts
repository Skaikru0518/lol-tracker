import { useQuery } from "@tanstack/react-query";
import { resolveDDragonVersion } from "@/lib/game/ddragon-version";
import { getDDragonVersion } from "@/lib/game/icon-helpers";

function browserStorage() {
	try {
		return typeof window === "undefined" ? null : window.localStorage;
	} catch {
		return null;
	}
}

/** Current DDragon version; falls back to the remembered or build-time version, so it always resolves. */
export function useDDragonVersion() {
	return useQuery<string>({
		queryKey: ["ddragon-version"],
		queryFn: () => resolveDDragonVersion(getDDragonVersion, browserStorage()),
		staleTime: 1000 * 60 * 60,
	});
}
