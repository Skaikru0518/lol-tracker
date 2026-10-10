import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSummonerProfile } from "@/lib/summoner/get-profile";
import { buildProfileMetadata } from "@/lib/summoner/metadata";
import { getChampionMap, getDDragonVersion } from "@/lib/icon-helpers";
import { toSummonerSlug } from "@/lib/riot-id";
import { SummonerProvider } from "@/components/summoner/shell/summoner-provider";
import { SummonerHero } from "@/components/summoner/shell/summoner-hero";
import { SummonerTabs } from "@/components/summoner/shell/summoner-tabs";
import { LiveBanner } from "@/components/summoner/shell/live-banner";

type Params = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const profile = await getSummonerProfile((await params).name);
	if (!profile) return { title: "Summoner not found" };

	const { title, description } = buildProfileMetadata(profile);
	const slug = toSummonerSlug(profile.account.gameName, profile.account.tagLine);
	return { title, description, alternates: { canonical: `/summoner/${slug}` } };
}

/** DDragon id of the splash champion, or `null` when it cannot be resolved. */
async function resolveSplashChampion(version: string, championId: number | null): Promise<string | null> {
	if (!championId) return null;
	const champions = await getChampionMap(version).catch(() => null);
	return champions?.[championId]?.id ?? null;
}

export default async function SummonerLayout({ children, params }: Params & { children: React.ReactNode }) {
	const profile = await getSummonerProfile((await params).name);
	if (!profile) notFound();

	const version = await getDDragonVersion();
	const splashChampion = await resolveSplashChampion(version, profile.topMasteryChampionId);
	const { puuid, gameName, tagLine } = profile.account;
	const basePath = `/summoner/${toSummonerSlug(gameName, tagLine)}`;

	return (
		<SummonerProvider value={{ puuid, gameName, tagLine, basePath, version }}>
			<SummonerHero profile={profile} version={version} splashChampion={splashChampion} />
			<div className="mx-auto max-w-7xl px-4 sm:px-6">
				<LiveBanner puuid={puuid} basePath={basePath} />
				<SummonerTabs basePath={basePath} />
				<div className="py-4 lg:py-6">{children}</div>
			</div>
		</SummonerProvider>
	);
}
