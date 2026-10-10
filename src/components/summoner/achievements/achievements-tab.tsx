"use client";

import { cn } from "@/lib/utils";
import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { useAchievements } from "@/hooks/useAchievements";
import { ACHIEVEMENTS, type AchievementDef } from "@/lib/achievements/definitions";

const CATEGORIES: { id: AchievementDef["category"]; label: string }[] = [
	{ id: "combat", label: "Combat" },
	{ id: "playstyle", label: "Playstyle" },
	{ id: "mastery", label: "Mastery" },
	{ id: "rank", label: "Rank" },
];

/** Placeholder grid of earned and locked achievements, grouped by category, until the system rework. */
export function AchievementsTab() {
	const { puuid } = useSummonerContext();
	const { data: saved } = useAchievements(puuid);
	const earned = new Map(saved?.map((a) => [a.achievementId, a.earnedAt]) ?? []);

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				{earned.size} of {ACHIEVEMENTS.length} earned. The achievement system is being reworked; this view is temporary.
			</p>
			{CATEGORIES.map((category) => (
				<Panel key={category.id}>
					<PanelHeader title={category.label} />
					<div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
						{ACHIEVEMENTS.filter((a) => a.category === category.id).map((a) => {
							const earnedAt = earned.get(a.id);
							return (
								<div key={a.id} className={cn("flex items-start gap-3 rounded-md border p-3", !earnedAt && "opacity-50 grayscale")}>
									<img src={`/achi/${a.icon}.svg`} alt="" width={32} height={32} className="size-8 shrink-0" />
									<div className="min-w-0">
										<p className="text-sm font-semibold" style={{ color: earnedAt ? a.color : undefined }}>
											{a.name}
										</p>
										<p className="text-xs text-muted-foreground">{a.description}</p>
										<p className="mt-1 text-2xs text-muted-foreground">
											{earnedAt ? `Earned ${new Date(earnedAt).toLocaleDateString()}` : "Locked"}
										</p>
									</div>
								</div>
							);
						})}
					</div>
				</Panel>
			))}
		</div>
	);
}
