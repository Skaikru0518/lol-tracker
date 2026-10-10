"use client";

import { TabsNav, type TabItem } from "@/components/ui/tabs-nav";

export const SUMMONER_TABS: readonly TabItem[] = [
	{ label: "Overview", segment: null },
	{ label: "Champions", segment: "champions" },
	{ label: "LP History", segment: "lp" },
	{ label: "Achievements", segment: "achievements" },
];

/** Profile tab bar; the active tab follows the route segment. */
export function SummonerTabs({ basePath }: { basePath: string }) {
	return <TabsNav basePath={basePath} tabs={SUMMONER_TABS} />;
}
