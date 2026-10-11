"use client";

import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAchievements } from "@/hooks/useAchievements";
import { FormSection } from "./form-section";
import { MilestoneSection } from "./milestone-section";
import { SeasonSection } from "./season-section";

/** Milestones, the season's achievements and the Current form, from one payload. */
export function AchievementsTab() {
	const { puuid } = useSummonerContext();
	const { data } = useAchievements(puuid);
	const progress = data?.progress ?? [];
	const rarity = data?.rarity ?? null;

	return (
		<TooltipProvider delayDuration={200}>
			<div className="space-y-4">
				<MilestoneSection progress={progress} rarity={rarity} />
				<SeasonSection progress={progress} rarity={rarity} />
				<FormSection form={data?.form ?? []} />
			</div>
		</TooltipProvider>
	);
}
