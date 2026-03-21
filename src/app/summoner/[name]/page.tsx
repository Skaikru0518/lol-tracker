"use client";

import { use, useCallback, useEffect, useState } from "react";
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
import SidebarSkeleton from "@/components/summoner/sidebar-skeleton";
import StatsSkeleton from "@/components/summoner/stats-skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

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
		10,
	);
	const { data: masteries } = useMastery(account?.puuid);
	const { data: champions } = useChampions();

	const queryClient = useQueryClient();
	const [refreshing, setRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		await queryClient.invalidateQueries({
			predicate: (query) => {
				const key = query.queryKey[0] as string;
				return ["matches", "ranked", "summoner", "mastery"].includes(key);
			},
		});
		toast.success("Data refreshed");
		setRefreshing(false);
	}, [queryClient]);

	if (accountLoading) return <Loader fullScreen />;

	if (accountError || !account) {
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
				<Button
					onClick={() => router.back()}
					size="lg"
					className="h-12 px-8"
				>
					Go Back
				</Button>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-400 px-6 py-8 lg:px-12">
			<button
				onClick={() => router.back()}
				className="mb-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
			>
				← Back
			</button>
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="mb-8 flex items-center justify-between gap-4"
			>
				<div className="flex items-center gap-3">
					<ProfileHeader
						account={account}
						summoner={summoner}
						version={version}
					/>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleRefresh}
						disabled={refreshing}
						className="shrink-0"
					>
						<RefreshCw
							className={`size-4 ${refreshing ? "animate-spin" : ""}`}
						/>
					</Button>
				</div>
				<div className="hidden gap-3 lg:flex">
					<div className="w-56">
						<ChampionSearch
							champions={champions}
							version={version}
							summonerSlug={name}
						/>
					</div>
					<div className="w-80">
						<SummonerSearch />
					</div>
				</div>
			</motion.div>

			{/* Content grid */}
			<div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr_280px]">
				<motion.div
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
					className="space-y-4"
				>
					{!ranked && !masteries ? (
						<SidebarSkeleton />
					) : (
						<>
							<RankedCard entries={ranked} />
							<MasteryList
								masteries={masteries}
								champions={champions}
								version={version}
								summonerSlug={name}
							/>
							<RecentPlayers
								matches={matches}
								puuid={account.puuid}
								version={version}
							/>
						</>
					)}
				</motion.div>

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
					/>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5, delay: 0.3 }}
				>
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
				</motion.div>
			</div>
		</div>
	);
}
