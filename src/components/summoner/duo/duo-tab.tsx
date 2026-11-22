"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDuoPartners } from "@/hooks/useDuo";
import { DuoCompare } from "./duo-compare";
import { PlayedWithList } from "./played-with-list";

/** Duo partners, or the comparison with one of them when `?with=` names a puuid. */
export function DuoTab() {
	const { puuid, basePath, version } = useSummonerContext();
	const friend = useSearchParams().get("with");
	const { data: partners, isLoading } = useDuoPartners(puuid);

	if (friend) {
		return (
			<div className="space-y-3">
				<Link href={`${basePath}/duo`} className="text-sm font-medium text-primary hover:underline">
					&larr; All duo partners
				</Link>
				<DuoCompare puuid={puuid} friend={friend} version={version} />
			</div>
		);
	}

	return (
		<Panel>
			<PanelHeader title="Played with" actions={<span className="text-xs text-muted-foreground">last 50 games</span>} />
			{isLoading ? (
				<div className="space-y-2 p-3">
					{Array.from({ length: 4 }, (_, i) => (
						<Skeleton key={i} className="h-11" />
					))}
				</div>
			) : partners && partners.length > 0 ? (
				<>
					<PlayedWithList partners={partners} basePath={basePath} version={version} />
					<p className="border-t px-4 py-2 text-xs text-muted-foreground">Win rate together · difference from your win rate without them. Click a row to compare.</p>
				</>
			) : (
				<EmptyState title="No duo partners yet" description="No one played 3+ games with you in your last 50 stored games." />
			)}
		</Panel>
	);
}
