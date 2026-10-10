import { calculateAvgRank } from "@/lib/game/rank-calculator";
import { rankedQueueForQueueId } from "@/lib/game/ranked-queues";
import { type LiveGameParticipant } from "@/lib/validators/live-game";
import { type RankedEntry } from "@/lib/validators/ranked";

type Row = { blue: LiveGameParticipant | null; red: LiveGameParticipant | null };

/** Blue and red players paired by spectator order; modes with other team ids (Arena) are split into two halves by order. */
export function splitTeams(participants: LiveGameParticipant[]): { rows: Row[]; blue: LiveGameParticipant[]; red: LiveGameParticipant[] } {
	const twoTeams = participants.every((p) => p.teamId === 100 || p.teamId === 200);
	const half = Math.ceil(participants.length / 2);
	const blue = twoTeams ? participants.filter((p) => p.teamId === 100) : participants.slice(0, half);
	const red = twoTeams ? participants.filter((p) => p.teamId === 200) : participants.slice(half);
	const rows = Array.from({ length: Math.max(blue.length, red.length) }, (_, i) => ({ blue: blue[i] ?? null, red: red[i] ?? null }));
	return { rows, blue, red };
}

export interface RankSummary {
	tier: string;
	rank: string;
	leaguePoints: number;
	winRate: number;
	games: number;
}

/** The player's rank in the game's queue (solo for queues without their own) with season WR and games; null when unranked. */
export function playerRankSummary(entries: RankedEntry[] | undefined, queueId: number): RankSummary | null {
	const queueType = rankedQueueForQueueId(queueId) ?? "RANKED_SOLO_5x5";
	const e = entries?.find((x) => x.queueType === queueType);
	if (!e) return null;
	const games = e.wins + e.losses;
	return { tier: e.tier, rank: e.rank, leaguePoints: e.leaguePoints, winRate: games > 0 ? Math.round((e.wins / games) * 100) : 0, games };
}

/** Average rank of one team in the game's queue; null when none of its players are ranked. */
export function teamAvgRank(
	team: LiveGameParticipant[],
	ranks: Record<string, RankedEntry[]> | undefined,
	queueId: number,
): { tier: string; rank: string } | null {
	if (!ranks) return null;
	const own = Object.fromEntries(team.filter((p) => ranks[p.puuid]).map((p) => [p.puuid, ranks[p.puuid]]));
	return calculateAvgRank(own, queueId);
}

const MAPS: Record<number, string> = { 11: "Summoner's Rift", 12: "Howling Abyss", 30: "Rings of Wrath" };

/** Display name of a live game's map. */
export function mapName(mapId: number | undefined): string {
	return (mapId !== undefined && MAPS[mapId]) || "Custom map";
}

export type LiveViewState = "loading" | "error" | "idle" | "live";

/** What the live page shows; the last known game wins over a failed background refetch. */
export function liveViewState({
	data,
	isLoading,
	isError,
}: {
	data: { inGame: boolean; participants?: LiveGameParticipant[] } | undefined;
	isLoading: boolean;
	isError: boolean;
}): LiveViewState {
	if (data?.inGame && data.participants) return "live";
	if (isLoading) return "loading";
	if (isError && !data) return "error";
	return "idle";
}

/** The profile's live banner links to the live page, so it is hidden there. */
export function showLiveBanner(segment: string | null): boolean {
	return segment !== "live";
}
