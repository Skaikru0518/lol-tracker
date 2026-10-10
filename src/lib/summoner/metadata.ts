import { formatRankLabel } from "@/lib/rank-calculator";
import { type SummonerProfile } from "@/lib/summoner/get-profile";

/** Page title and description for a summoner profile. */
export function buildProfileMetadata(profile: SummonerProfile): { title: string; description: string } {
	const riotId = `${profile.account.gameName}#${profile.account.tagLine}`;
	const solo = profile.ranked.find((entry) => entry.queueType === "RANKED_SOLO_5x5");
	const rankLabel = solo ? formatRankLabel(solo.tier, solo.rank) : "Unranked";
	const soloLine = solo
		? ` Ranked Solo: ${rankLabel} ${solo.leaguePoints} LP, ${solo.wins}W ${solo.losses}L.`
		: "";

	return {
		title: `${riotId} — ${rankLabel}`,
		description: `${riotId} (EUNE) — Level ${profile.summoner.summonerLevel}.${soloLine} Match history, LP history and champion stats on Summon.gg.`,
	};
}
