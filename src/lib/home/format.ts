import { type Champion } from "@/lib/game/icon-helpers";
import { formatRankLabel } from "@/lib/game/rank-calculator";
import { type RecentSearch } from "@/lib/validators/recent-searches";

/** Solo rank of a recently searched summoner, e.g. `Emerald I · 42 LP`; `Unranked` without one. */
export function recentSearchRank(r: RecentSearch): string {
	if (!r.soloTier) return "Unranked";
	const label = formatRankLabel(r.soloTier, r.soloRank ?? "I");
	return r.soloLp === null ? label : `${label} · ${r.soloLp} LP`;
}

/** Free-rotation champion ids as champions, sorted by name; ids the map doesn't know yet are skipped. */
export function rotationChampions(ids: number[], champions: Record<number, Champion> | undefined): Champion[] {
	if (!champions) return [];
	return ids
		.map((id) => champions[id])
		.filter((c): c is Champion => !!c)
		.sort((a, b) => a.name.localeCompare(b.name));
}
