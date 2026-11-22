"use client";

import { useEffect } from "react";
import Link from "next/link";
import { tierColor } from "@/components/summoner/achievements/tier-frame";
import { Chip } from "@/components/ui/chip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAchievements, useDetectAchievements } from "@/hooks/useAchievements";
import { tierLabel, topMilestones } from "@/lib/achievements/display";
import { getMilestone } from "@/lib/achievements/milestones/definitions";
import { earnedForm } from "@/lib/achievements/profile/form-id";

const PREVIEW_COUNT = 8;

/** Earned Current form chips first (they reflect recent games), then up to five best milestones, above the Overview columns; detection runs once per profile visit. */
export function AchievementPreview({ puuid, basePath }: { puuid: string; basePath: string }) {
	const { data: saved } = useAchievements(puuid);
	const { mutate: detect } = useDetectAchievements();

	useEffect(() => {
		detect({ puuid });
	}, [puuid, detect]);

	const earned = [...earnedForm(saved?.form.map((a) => a.achievementId) ?? []).values()];
	const formShown = earned.slice(0, PREVIEW_COUNT);
	const top = topMilestones(saved?.progress ?? [], saved?.rarity ?? null, Math.min(5, PREVIEW_COUNT - formShown.length));
	const hidden = earned.length - formShown.length;
	if (top.length === 0 && earned.length === 0) return null;

	return (
		<TooltipProvider delayDuration={200}>
			<div className="mb-4 flex flex-wrap items-center gap-1.5">
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
				<Link href={`${basePath}/achievements`} className="ml-1 text-xs font-medium text-primary hover:underline">
					{hidden > 0 ? `+${hidden} more` : "See all"} &rarr;
				</Link>
			</div>
		</TooltipProvider>
	);
}
