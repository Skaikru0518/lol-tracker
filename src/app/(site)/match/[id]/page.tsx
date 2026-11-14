import type { Metadata } from "next";
import { MatchDetail } from "@/components/match/match-detail";
import { matchMetadata } from "@/lib/og/match-card";
import { loadMatchCard } from "@/lib/og/match-card-data";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ puuid?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
	const { id } = await params;
	const { puuid } = await searchParams;
	const loaded = puuid ? await loadMatchCard(id, puuid) : null;
	if (!loaded || !puuid) return {};
	const { title, description } = matchMetadata(loaded.card);
	const image = { url: `/og/match/${encodeURIComponent(id)}/${encodeURIComponent(puuid)}`, width: 1200, height: 630 };
	return { title, description, openGraph: { title, description, images: [image] }, twitter: { card: "summary_large_image", title, description, images: [image.url] } };
}

/** Match detail: the route only unwraps params; the page is one client island. */
export default async function MatchPage({ params, searchParams }: Props) {
	const { id } = await params;
	const { puuid } = await searchParams;
	return <MatchDetail matchId={id} puuid={puuid} />;
}
