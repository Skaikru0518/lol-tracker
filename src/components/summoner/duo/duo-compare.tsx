"use client";

import { Crown } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDuoCompare } from "@/hooks/useDuo";
import { CategoryRows } from "./category-rows";
import { CompareHeader } from "./compare-header";
import { SharedGamesList } from "./shared-games-list";

/** The profile next to one duo partner: recent form, categories and the games they shared. */
export function DuoCompare({ puuid, friend, version }: { puuid: string; friend: string; version: string }) {
	const { data, isLoading, isError } = useDuoCompare(puuid, friend);
	if (isLoading) return <Skeleton className="h-96" />;
	if (isError || !data) return <EmptyState title="Comparison unavailable" description="Try again in a moment." />;

	const { player, friend: other, shared, together } = data;
	return (
		<div className="space-y-4">
			<Panel>
				<PanelHeader title={`${player.gameName} vs ${other.gameName}`} actions={<span className="text-xs text-muted-foreground">last 30 ranked games each</span>} />
				<CompareHeader player={player} friend={other} version={version} />
				<CategoryRows player={player} friend={other} />
				{shared.length > 0 && (
					<div className="flex flex-wrap items-center justify-center gap-2 border-t px-4 py-3 text-xs">
						<span className="rounded-full bg-muted/50 px-3 py-1 text-muted-foreground">{shared.length} games together</span>
						<span className="rounded-full bg-muted/50 px-3 py-1 font-semibold">
							<span className="text-win">{together.wins}W</span> <span className="text-loss">{together.losses}L</span>
						</span>
						<span className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1">
							<span className="font-semibold text-team-blue">{together.playerCarried}</span>
							<Crown className="size-3.5 text-gold" aria-label="carried" />
							<span className="font-semibold text-team-red">{together.friendCarried}</span>
						</span>
					</div>
				)}
			</Panel>
			<Panel>
				<PanelHeader title="Shared games" actions={<span className="text-xs text-muted-foreground">higher score wears the crown</span>} />
				{shared.length > 0 ? (
					<SharedGamesList shared={shared} puuid={puuid} version={version} />
				) : (
					<EmptyState title="No shared games" description="No shared games stored yet." />
				)}
			</Panel>
		</div>
	);
}
