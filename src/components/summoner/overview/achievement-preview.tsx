"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAchievements, useDetectAchievements } from "@/hooks/useAchievements";
import { ACHIEVEMENTS } from "@/lib/achievements/definitions";

const PREVIEW_COUNT = 4;

/** Up to four earned achievements above the Overview columns; detection runs once per profile visit. */
export function AchievementPreview({ puuid, basePath }: { puuid: string; basePath: string }) {
	const { data: saved } = useAchievements(puuid);
	const { mutate: detect } = useDetectAchievements();

	useEffect(() => {
		detect({ puuid });
	}, [puuid, detect]);

	const earnedIds = new Set(saved?.map((a) => a.achievementId) ?? []);
	const earned = ACHIEVEMENTS.filter((a) => earnedIds.has(a.id));
	if (earned.length === 0) return null;

	return (
		<TooltipProvider delayDuration={200}>
			<div className="mb-4 flex flex-wrap items-center gap-1.5">
				{earned.slice(0, PREVIEW_COUNT).map((a) => (
					<Tooltip key={a.id}>
						<TooltipTrigger asChild>
							<Chip color={a.color} className="h-6 px-2 text-xs">
								{a.name}
							</Chip>
						</TooltipTrigger>
						<TooltipContent>
							<p>{a.description}</p>
						</TooltipContent>
					</Tooltip>
				))}
				<Link href={`${basePath}/achievements`} className="ml-1 text-xs font-medium text-primary hover:underline">
					{earned.length > PREVIEW_COUNT ? `+${earned.length - PREVIEW_COUNT} more` : "See all"} &rarr;
				</Link>
			</div>
		</TooltipProvider>
	);
}
