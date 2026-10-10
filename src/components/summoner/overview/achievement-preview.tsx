"use client";

import { useEffect } from "react";
import Link from "next/link";
import { tierColor } from "@/components/summoner/achievements/tier-frame";
import { Chip } from "@/components/ui/chip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAchievements, useDetectAchievements } from "@/hooks/useAchievements";
import { tierLabel, topMilestones } from "@/lib/achievements/display";
import { getMilestone } from "@/lib/achievements/milestones/definitions";
import { ACHIEVEMENTS } from "@/lib/achievements/profile/definitions";

const PREVIEW_COUNT = 6;

/** The three best milestones, then earned Current form chips, above the Overview columns; detection runs once per profile visit. */
export function AchievementPreview({ puuid, basePath }: { puuid: string; basePath: string }) {
	const { data: saved } = useAchievements(puuid);
	const { mutate: detect } = useDetectAchievements();

	useEffect(() => {
		detect({ puuid });
	}, [puuid, detect]);

	const top = topMilestones(saved?.progress ?? [], saved?.rarity ?? null);
	const earnedIds = new Set(saved?.form.map((a) => a.achievementId) ?? []);
	const earned = ACHIEVEMENTS.filter((a) => earnedIds.has(a.id));
	const formShown = earned.slice(0, Math.max(0, PREVIEW_COUNT - top.length));
	const hidden = earned.length - formShown.length;
	if (top.length === 0 && earned.length === 0) return null;

	return (
		<TooltipProvider delayDuration={200}>
			<div className="mb-4 flex flex-wrap items-center gap-1.5">
				{top.map((row) => {
					const def = getMilestone(row.achievementId);
					if (!def) return null;
					return (
						<Tooltip key={row.achievementId}>
							<TooltipTrigger asChild>
								<Chip color={tierColor(row.tier, def.thresholds.length)} className="h-6 px-2 text-xs">
									{def.name} · {tierLabel(def, row.tier)}
								</Chip>
							</TooltipTrigger>
							<TooltipContent>
								<p>{def.description}</p>
							</TooltipContent>
						</Tooltip>
					);
				})}
				{formShown.map((a) => (
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
					{hidden > 0 ? `+${hidden} more` : "See all"} &rarr;
				</Link>
			</div>
		</TooltipProvider>
	);
}
