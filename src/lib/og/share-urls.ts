import { toSummonerSlug } from "@/lib/game/riot-id";

export function matchShareUrl(matchId: string, puuid: string): string {
	return `/match/${encodeURIComponent(matchId)}?${new URLSearchParams({ puuid })}`;
}

export function promoShareUrl(gameName: string, tagLine: string, snapshotId: string): string {
	return `/summoner/${toSummonerSlug(gameName, tagLine)}/lp?${new URLSearchParams({ promo: snapshotId })}`;
}

export function achievementShareUrl(gameName: string, tagLine: string, achievementId: string, scope: string): string {
	return `/summoner/${toSummonerSlug(gameName, tagLine)}/achievements?${new URLSearchParams({ a: achievementId, s: scope })}`;
}
