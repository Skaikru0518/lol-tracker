import { type Champion } from "@/lib/icon-helpers";
import { decodeSlug } from "@/lib/riot-id";
import { killParticipation } from "@/lib/summoner/match-row";
import { type Match } from "@/lib/validators/match";

/** Champion for a URL slug, matching the DDragon id case-insensitively. */
export function findChampionBySlug(champions: Record<number, Champion> | undefined, slug: string): Champion | null {
	if (!champions) return null;
	const target = decodeSlug(slug).toLowerCase();
	return Object.values(champions).find((c) => c.id.toLowerCase() === target) ?? null;
}

/** New URL for a pre-redesign `/summoner/[name]/[champion]` link. */
export function legacyChampionPath(name: string, champion: string): string {
	return `/summoner/${encodeURIComponent(decodeSlug(name))}/champions/${encodeURIComponent(decodeSlug(champion))}`;
}

/** Mean kill participation of the player across matches, whole percent; `null` without matches. */
export function averageKillParticipation(matches: Match[], puuid: string): number | null {
	const values = matches.flatMap((m) => {
		const me = m.info.participants.find((p) => p.puuid === puuid);
		return me ? [killParticipation(me, m.info.participants)] : [];
	});
	if (values.length === 0) return null;
	return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}
