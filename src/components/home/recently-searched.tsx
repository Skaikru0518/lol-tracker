"use client";

import Link from "next/link";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDDragonVersion } from "@/hooks/useDDragonVersion";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { recentSearchRank } from "@/lib/home/format";
import { getSummonerIcon, RANK_COLORS } from "@/lib/icon-helpers";
import { toSummonerSlug } from "@/lib/riot-id";

/** Last summoners anyone looked up, with profile icon and solo rank, linking to their profiles. */
export function RecentlySearched() {
	const { data, isLoading, isError } = useRecentSearches();
	const { data: version } = useDDragonVersion();

	return (
		<Panel>
			<PanelHeader title="Recently searched" actions={<span className="text-xs text-muted-foreground">all users</span>} />
			{isLoading ? (
				<div className="space-y-2 p-3">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-9" />
					))}
				</div>
			) : isError || !data || data.length === 0 ? (
				<EmptyState title="No searches yet" description="Profiles show up here once someone looks them up." />
			) : (
				<ul className="divide-y divide-border/50">
					{data.map((r) => (
						<li key={r.puuid}>
							<Link href={`/summoner/${toSummonerSlug(r.gameName, r.tagLine)}`} className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-accent/40">
								{version && r.profileIconId !== null ? (
									<img src={getSummonerIcon(version, r.profileIconId)} alt="" width={28} height={28} className="size-7 rounded-md" />
								) : (
									<span className="size-7 rounded-md bg-muted" />
								)}
								<span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
									{r.gameName}
									<span className="text-muted-foreground">#{r.tagLine}</span>
								</span>
								<span className="text-xs font-medium" style={{ color: r.soloTier ? RANK_COLORS[r.soloTier] : undefined }}>
									{recentSearchRank(r)}
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</Panel>
	);
}
