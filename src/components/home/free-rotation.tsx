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
import { queryFailed } from "@/lib/query-state";

/** This week's free champions as icons with their names on hover. */
export function FreeRotation() {
	const { data: rotation, isLoading, isError } = useRotation();
	const { data: champions, isError: championsError } = useChampions();
	const { data: version } = useDDragonVersion();
	const list = rotationChampions(rotation?.freeChampionIds ?? [], champions);

	return (
		<Panel>
			<PanelHeader title="Free rotation" />
			{queryFailed({ isError, data: rotation }) || queryFailed({ isError: championsError, data: champions }) ? (
				<EmptyState title="Rotation unavailable" description="This week's free champions could not be loaded." />
			) : isLoading || (rotation && !champions) || !version ? (
				<PanelBody className="grid grid-cols-5 gap-2">
					{Array.from({ length: 10 }).map((_, i) => (
						<Skeleton key={i} className="aspect-square" />
					))}
				</PanelBody>
			) : list.length === 0 ? (
				<EmptyState title="No free champions listed" description="Riot returned an empty rotation." />
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
