"use client";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { RankEmblem } from "@/components/ui/rank-emblem";
import { useLPHistory } from "@/hooks/useLPHistory";
import { RANK_COLORS } from "@/lib/icon-helpers";
import { formatRankLabel } from "@/lib/rank-calculator";
import { type RankedEntry } from "@/lib/validators/ranked";
import { LpSparkline } from "./lp-sparkline";

const TITLES: Record<string, string> = {
	RANKED_SOLO_5x5: "Ranked Solo",
	RANKED_FLEX_SR: "Ranked Flex",
};

/** Rank card for one queue with a 30-day LP sparkline; shows Unranked without an entry. */
export function RankedPanel({
	puuid,
	queueType,
	entry,
}: {
	puuid: string;
	queueType: "RANKED_SOLO_5x5" | "RANKED_FLEX_SR";
	entry?: RankedEntry;
}) {
	const { data: snapshots } = useLPHistory(entry ? puuid : undefined, queueType, "30d");

	return (
		<Panel>
			<PanelHeader title={TITLES[queueType]} />
			<PanelBody>
				{entry ? (
					<>
						<div className="flex items-center gap-4">
							<RankEmblem tier={entry.tier} size={64} />
							<div className="min-w-0">
								<p className="text-lg font-bold" style={{ color: RANK_COLORS[entry.tier] }}>
									{formatRankLabel(entry.tier, entry.rank)}
									<span className="ml-1.5 text-sm font-medium text-muted-foreground">{entry.leaguePoints} LP</span>
								</p>
								<p className="text-sm">
									<span className="text-win">{entry.wins}W</span>{" "}
									<span className="text-loss">{entry.losses}L</span>
									<span className="text-muted-foreground">
										{" "}· {Math.round((entry.wins / Math.max(entry.wins + entry.losses, 1)) * 100)}%
									</span>
								</p>
							</div>
						</div>
						<LpSparkline snapshots={snapshots} />
					</>
				) : (
					<div className="flex items-center gap-4">
						<RankEmblem tier={null} size={48} />
						<p className="text-sm text-muted-foreground">Unranked</p>
					</div>
				)}
			</PanelBody>
		</Panel>
	);
}
