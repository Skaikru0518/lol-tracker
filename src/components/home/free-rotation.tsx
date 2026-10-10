"use client";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useChampions } from "@/hooks/useChampions";
import { useDDragonVersion } from "@/hooks/useDDragonVersion";
import { useRotation } from "@/hooks/useRotation";
import { rotationChampions } from "@/lib/home/format";

/** This week's free champions as icons with their names on hover. */
export function FreeRotation() {
	const { data: rotation, isLoading, isError } = useRotation();
	const { data: champions } = useChampions();
	const { data: version } = useDDragonVersion();
	const list = rotationChampions(rotation?.freeChampionIds ?? [], champions);

	return (
		<Panel>
			<PanelHeader title="Free rotation" />
			{isLoading || (rotation && !champions) || !version ? (
				<PanelBody className="grid grid-cols-5 gap-2">
					{Array.from({ length: 10 }).map((_, i) => (
						<Skeleton key={i} className="aspect-square" />
					))}
				</PanelBody>
			) : isError || list.length === 0 ? (
				<EmptyState title="Rotation unavailable" description="Riot did not return this week's free champions." />
			) : (
				<TooltipProvider delayDuration={150}>
					<PanelBody className="grid grid-cols-5 gap-2">
						{list.map((c) => (
							<Tooltip key={c.key}>
								<TooltipTrigger asChild>
									<span className="cursor-pointer">
										<ChampionIcon version={version} championName={c.id} size={44} className="w-full" />
									</span>
								</TooltipTrigger>
								<TooltipContent>{c.name}</TooltipContent>
							</Tooltip>
						))}
					</PanelBody>
				</TooltipProvider>
			)}
		</Panel>
	);
}
