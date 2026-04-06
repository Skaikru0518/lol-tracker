"use client";

import { use } from "react";
import { useAccount } from "@/hooks/useAccount";
import { useSummoner } from "@/hooks/useSummoner";
import { useRanked } from "@/hooks/useRanked";
import { useMatches } from "@/hooks/useMatches";
import { useMastery } from "@/hooks/useMastery";
import { useDDragonVersion } from "@/hooks/useDDragonVersion";
import { useChampions } from "@/hooks/useChampions";
import toast from "react-hot-toast";
import Loader from "@/components/ui/loader";
import ProfileHeader from "@/components/summoner/profile-header";
import { MatchList } from "@/components/summoner/match-history";
import RankedCard from "@/components/summoner/ranked-card";
import MasteryList from "@/components/summoner/mastery-list";
import SummonerSearch from "@/components/search/summoner-search";
import StatsCard from "@/components/summoner/stats-card";
import RecentPlayers from "@/components/summoner/recent-players";
import ChampionSearch from "@/components/summoner/champion-search";
import { useRunes } from "@/hooks/useRunes";
import LiveGameBanner from "@/components/summoner/live-game-banner";
import StatsSkeleton from "@/components/summoner/stats-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import BackButton from "@/components/ui/back-button";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLPHistory } from "@/hooks/useLPHistory";
import LPHistoryChart from "@/components/summoner/lp-history-chart";
import AchievementBar from "@/components/summoner/achievement-bar";
import RolesCard from "@/components/summoner/roles-card";

export default function SummonerPage({
	params,
}: {
	params: Promise<{ name: string }>;
}) {
	const { name } = use(params);
	const [gameName, tagLine] = name.split("-");
	const router = useRouter();

	const { data: version } = useDDragonVersion();
	const {
		data: account,
		isLoading: accountLoading,
		error: accountError,
	} = useAccount(gameName, tagLine);
	const { data: summoner } = useSummoner(account?.puuid);
	const { data: ranked } = useRanked(account?.puuid);
	const { data: matches, isLoading: matchesLoading } = useMatches(
		account?.puuid,
		50,
	);
	const { data: masteries } = useMastery(account?.puuid);
	const { data: champions } = useChampions();
	const { data: runeData } = useRunes();
	const { data: soloHistory } = useLPHistory(account?.puuid, "RANKED_SOLO_5x5");
	const { data: flexHistory } = useLPHistory(account?.puuid, "RANKED_FLEX_SR");

	if (accountError) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
				<div className="text-center">
					<h1 className="text-5xl font-bold text-destructive">Error</h1>
					<p className="mt-3 text-lg text-muted-foreground">
						Summoner not found
					</p>
					<p className="mt-1 text-sm text-muted-foreground/70">
						Could not find &quot;{gameName}#{tagLine}&quot;
					</p>
				</div>
				<Button onClick={() => router.back()} size="lg" className="h-12 px-8">
					Go Back
				</Button>
			</div>
		);
	}

	const coreLoaded = account && summoner && version && champions;
	if (accountLoading || !coreLoaded) return <Loader fullScreen />;

	return (
		<div className="mx-auto max-w-425 px-4 py-6 sm:px-6 lg:px-12 lg:py-8">
			<BackButton />
			<LiveGameBanner
				puuid={account.puuid}
				summonerSlug={name}
				version={version}
				champions={champions}
			/>
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="mb-6 lg:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 lg:sticky lg:top-14 lg:z-30 lg:py-4 lg:backdrop-blur-md lg:bg-background/60"
			>
				<ProfileHeader
					account={account}
					summoner={summoner}
					version={version}
				/>
			</motion.div>

			<AchievementBar
				puuid={account.puuid}
				matches={matches}
				ranked={ranked}
			/>

			{/* Content grid */}
			<div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-[320px_1fr_280px]">
				{/* Left sidebar: Ranked, Overview, Most Played */}
				<motion.div
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="space-y-4 lg:sticky lg:top-[180px] lg:self-start"
				>
					{ranked ? (
						<RankedCard entries={ranked} />
					) : (
						<Card>
							<CardHeader>
								<Skeleton className="h-4 w-16" />
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center gap-4">
									<Skeleton className="size-16 rounded-2xl" />
									<div className="space-y-2 flex-1">
										<Skeleton className="h-5 w-24" />
										<Skeleton className="h-4 w-16" />
									</div>
								</div>
							</CardContent>
						</Card>
					)}
					{matchesLoading ? (
						<StatsSkeleton />
					) : (
						<StatsCard
							matches={matches}
							puuid={account.puuid}
							champions={champions}
							version={version}
						/>
					)}
					{masteries && champions ? (
						<MasteryList
							masteries={masteries}
							champions={champions}
							version={version}
						/>
					) : (
						<Card>
							<CardHeader>
								<Skeleton className="h-4 w-24" />
							</CardHeader>
							<CardContent className="space-y-4">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="flex items-center gap-4">
										<Skeleton className="size-12 rounded-xl" />
										<div className="space-y-1.5 flex-1">
											<Skeleton className="h-4 w-20" />
											<Skeleton className="h-3 w-28" />
										</div>
									</div>
								))}
							</CardContent>
						</Card>
					)}
				</motion.div>

				{/* Center: Match History */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					<MatchList
						matches={matches}
						puuid={account.puuid}
						version={version}
						isLoading={matchesLoading}
						runeData={runeData}
						soloHistory={soloHistory}
						flexHistory={flexHistory}
					/>
				</motion.div>

				{/* Right sidebar: LP History, Recently Played */}
				<motion.div
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5, delay: 0.3 }}
					className="space-y-4 lg:sticky lg:top-[180px] lg:self-start"
				>
					<LPHistoryChart
						soloHistory={soloHistory}
						flexHistory={flexHistory}
						ranked={ranked}
					/>
					{!matchesLoading && matches && (
						<RolesCard matches={matches} puuid={account.puuid} />
					)}
					{matches ? (
						<RecentPlayers
							matches={matches}
							puuid={account.puuid}
							version={version}
						/>
					) : (
						<Card>
							<CardHeader>
								<Skeleton className="h-4 w-32" />
							</CardHeader>
							<CardContent className="space-y-3">
								{Array.from({ length: 3 }).map((_, i) => (
									<div key={i} className="flex items-center gap-3">
										<Skeleton className="size-9 rounded-lg" />
										<div className="space-y-1.5 flex-1">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-3 w-16" />
										</div>
									</div>
								))}
							</CardContent>
						</Card>
					)}
				</motion.div>
			</div>
		</div>
	);
}
