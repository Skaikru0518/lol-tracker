import type { Metadata } from "next";
import { AchievementsTab } from "@/components/summoner/achievements/achievements-tab";
import { ALL_TIME_SCOPE } from "@/lib/achievements/progress/types";
import { achievementMetadata } from "@/lib/og/achievement-card";
import { loadAchievementCard, puuidForSlug } from "@/lib/og/achievement-card-data";

type Props = { params: Promise<{ name: string }>; searchParams: Promise<{ a?: string; s?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
	const { a, s = ALL_TIME_SCOPE } = await searchParams;
	const puuid = a ? await puuidForSlug((await params).name) : null;
	const loaded = a && puuid ? await loadAchievementCard(puuid, a, s) : null;
	if (!loaded || !puuid) return {};
	const { card } = loaded;
	const { title, description } = achievementMetadata(card);
	const image = { url: `/og/achievement/${[puuid, card.id, card.scope, card.tier].map((p) => encodeURIComponent(p)).join("/")}`, width: 1200, height: 630 };
	return { title, description, openGraph: { title, description, images: [image] }, twitter: { card: "summary_large_image", title, description, images: [image.url] } };
}

export default function SummonerAchievementsPage() {
	return <AchievementsTab />;
}
