import { useMemo } from "react";
import { useLPHistory } from "@/hooks/useLPHistory";
import { type LpHistories } from "@/lib/game/ranked-queues";

/** Last 100 LP snapshots of each ranked queue, for match-row LP changes. */
export function useRankedLpHistories(puuid: string | undefined): LpHistories {
	const { data: solo } = useLPHistory(puuid, "RANKED_SOLO_5x5");
	const { data: flex } = useLPHistory(puuid, "RANKED_FLEX_SR");
	const { data: premade } = useLPHistory(puuid, "RANKED_PREMADE_5x5");
	return useMemo(() => ({ RANKED_SOLO_5x5: solo, RANKED_FLEX_SR: flex, RANKED_PREMADE_5x5: premade }), [solo, flex, premade]);
}
