"use client";

import Link from "next/link";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PlayedWithList } from "@/components/summoner/duo/played-with-list";
import { useDuoPartners } from "@/hooks/useDuo";

const SHOWN = 5;

/** The first duo partners, the same list and numbers as the Duo tab. */
export function RecentlyPlayedPanel({ puuid, basePath, version }: { puuid: string; basePath: string; version: string }) {
	const { data: partners, isLoading } = useDuoPartners(puuid);

	return (
		<Panel>
			<PanelHeader
				title="Recently played with"
				actions={
					<Link href={`${basePath}/duo`} className="text-xs font-medium text-primary hover:underline">
						See all &rarr;
					</Link>
				}
			/>
			{isLoading ? (
				<div className="space-y-2 p-3">
					{Array.from({ length: 3 }, (_, i) => (
						<Skeleton key={i} className="h-10" />
					))}
				</div>
			) : partners && partners.length > 0 ? (
				<PlayedWithList partners={partners} basePath={basePath} version={version} limit={SHOWN} />
			) : (
				<EmptyState title="No duo partners yet" description="Players with 3+ games on your team in your last 50 games show up here." />
			)}
		</Panel>
	);
}
