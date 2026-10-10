import { useQuery } from "@tanstack/react-query";
import { HttpError, retryUnlessNotFound } from "@/lib/http-error";
import { ddragonChampionId } from "@/lib/icon-helpers";

interface ChampionJson {
	data: Record<string, { spells: { image: { full: string } }[] }>;
}

async function fetchSpells(version: string, championName: string): Promise<{ spells: string[] }> {
	const id = ddragonChampionId(championName);
	const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion/${id}.json`);
	if (!res.ok) throw new HttpError("Champion data unavailable", res.status);
	const json = (await res.json()) as ChampionJson;
	const champion = json.data[id] ?? Object.values(json.data)[0];
	return { spells: champion.spells.map((s) => s.image.full) };
}

/** Q, W, E and R icon file names of one champion from Data Dragon. */
export function useChampionSpells(version: string | undefined, championName: string | undefined) {
	return useQuery({
		queryKey: ["champion-spells", version, championName],
		queryFn: () => fetchSpells(version!, championName!),
		staleTime: Infinity,
		enabled: !!version && !!championName,
		retry: retryUnlessNotFound,
	});
}
