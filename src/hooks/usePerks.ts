import { useQuery } from "@tanstack/react-query";
import { HttpError, retryUnlessNotFound } from "@/lib/shared/http-error";
import { type PerkInfo } from "@/lib/match/runes";

const PERKS_URL = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perks.json";

interface RawPerk {
	id: number;
	name: string;
	shortDesc?: string;
	endOfGameStatDescs?: string[];
}

async function fetchPerks(): Promise<Map<number, PerkInfo>> {
	const res = await fetch(PERKS_URL);
	if (!res.ok) throw new HttpError("Rune data unavailable", res.status);
	const raw = (await res.json()) as RawPerk[];
	return new Map(raw.map((p) => [p.id, { id: p.id, name: p.name, shortDesc: p.shortDesc ?? "", endOfGameStatDescs: p.endOfGameStatDescs ?? [] }]));
}

/** Every rune and stat shard by id, with its short description and end-of-game stat templates (CommunityDragon). */
export function usePerks() {
	return useQuery({ queryKey: ["perks"], queryFn: fetchPerks, staleTime: Infinity, gcTime: Infinity, retry: retryUnlessNotFound });
}
