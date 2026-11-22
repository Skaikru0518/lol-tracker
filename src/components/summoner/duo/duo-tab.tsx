"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDuoPartners } from "@/hooks/useDuo";
import { DuoCompare } from "./duo-compare";
import { DuoHighlights } from "./duo-highlights";
import { PartnerGrid } from "./partner-grid";

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

	if (isLoading) {
		return (
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }, (_, i) => (
					<Skeleton key={i} className="h-32" />
				))}
			</div>
		);
	}

	if (!partners || partners.length === 0) {
		return (
			<Panel>
				<EmptyState title="No duo partners yet" description="No one played 3+ games with you in your last 50 stored games." />
			</Panel>
		);
	}

	return (
		<div className="space-y-4">
			<DuoHighlights partners={partners} basePath={basePath} version={version} />
			<div className="flex items-baseline justify-between gap-3">
				<h2 className="text-sm font-semibold text-foreground">Played with</h2>
				<span className="hidden text-xs text-muted-foreground sm:inline">3+ games on your team in your last 50 · tap one to compare</span>
			</div>
			<PartnerGrid partners={partners} basePath={basePath} version={version} />
		</div>
	);
}
