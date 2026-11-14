import type { Metadata } from "next";
import { LpHistoryTab } from "@/components/summoner/lp-history/lp-history-tab";
import { promoMetadata } from "@/lib/og/promo-card";
import { loadPromoCard } from "@/lib/og/promo-card-data";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ promo?: string }> }): Promise<Metadata> {
	const { promo } = await searchParams;
	const loaded = promo ? await loadPromoCard(promo) : null;
	if (!loaded || !promo) return {};
	const { title, description } = promoMetadata(loaded.card);
	const image = { url: `/og/promo/${encodeURIComponent(promo)}`, width: 1200, height: 630 };
	return { title, description, openGraph: { title, description, images: [image] }, twitter: { card: "summary_large_image", title, description, images: [image.url] } };
}

export default function SummonerLpPage() {
	return <LpHistoryTab />;
}
