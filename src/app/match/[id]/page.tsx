"use client";

import { use, useEffect } from "react";
import { useMatch } from "@/hooks/useMatch";
import { useTimeline } from "@/hooks/useTimeline";
import { useDDragonVersion } from "@/hooks/useDDragonVersion";
import { useRunes } from "@/hooks/useRunes";
import { useItems } from "@/hooks/useItems";
import { useChampions } from "@/hooks/useChampions";
import { usePlayerRanks } from "@/hooks/usePlayerRanks";
import MatchInfo from "@/components/match/match-info";
import TeamTable from "@/components/match/team-table";
import TeamSummary from "@/components/match/team-summary";
import GoldChart from "@/components/match/gold-chart";
import DamageChart from "@/components/match/damage-chart";
import VisionChart from "@/components/match/vision-chart";
import ObjectivesTimeline from "@/components/match/objectives-timeline";
import KillTimeline from "@/components/match/kill-timeline";
import CsGoldChart from "@/components/match/cs-gold-chart";
import Loader from "@/components/ui/loader";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import BackButton from "@/components/ui/back-button";

export default function MatchPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	const router = useRouter();
	const { data: match, isLoading, error } = useMatch(id);
	const { data: timeline } = useTimeline(id);
	const { data: version } = useDDragonVersion();
	const { data: runeData } = useRunes();
	const { data: itemNames } = useItems();
	const { data: champions } = useChampions();

	const puuids = match?.info.participants.map(p => p.puuid);
	const { data: playerRanks } = usePlayerRanks(puuids);

	useEffect(() => {
		if (error) toast.error("Match not found");
	}, [error]);

	const allLoaded = match && version && runeData && champions && playerRanks;
	if (isLoading || !allLoaded) return <Loader fullScreen />;
	if (!match) return null;

	const blueTeam = match.info.participants.slice(0, 5);
	const redTeam = match.info.participants.slice(5, 10);
	const blueWon = blueTeam[0]?.win ?? false;

	return (
		<div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
			<BackButton />
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
			>
				<MatchInfo
					queueId={match.info.queueId}
					gameMode={match.info.gameMode}
					gameDuration={match.info.gameDuration}
					gameCreation={match.info.gameCreation}
					playerRanks={playerRanks}
				/>
			</motion.div>

			{/* Teams */}
			<div className="mt-6 space-y-6">
				<motion.div
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
				>
					<TeamTable
						participants={blueTeam}
						teamLabel="Blue Team"
						won={blueWon}
						version={version}
						gameDuration={match.info.gameDuration}
						runeData={runeData}
						timeline={timeline}
						itemNames={itemNames}
						bans={match.info.teams[0].bans}
						champions={champions}
						playerRanks={playerRanks}
						queueId={match.info.queueId}
					/>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.15 }}
				>
					<TeamTable
						participants={redTeam}
						teamLabel="Red Team"
						won={!blueWon}
						version={version}
						gameDuration={match.info.gameDuration}
						runeData={runeData}
						timeline={timeline}
						itemNames={itemNames}
						bans={match.info.teams[1].bans}
						champions={champions}
						playerRanks={playerRanks}
						queueId={match.info.queueId}
					/>
				</motion.div>
			</div>

			{/* Details section */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.5, delay: 0.25 }}
				className="mt-10"
			>
				<h2 className="mb-6 text-lg font-bold tracking-tight">
					Details
				</h2>

				<div className="space-y-6">
					{/* Gold Advantage */}
					<GoldChart timeline={timeline} />

					{/* Damage + Vision side by side */}
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<DamageChart
							participants={match.info.participants}
						/>
						<VisionChart
							participants={match.info.participants}
						/>
					</div>

					{/* Kill Timeline + Team Summary side by side */}
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
						<KillTimeline
							timeline={timeline}
							participants={match.info.participants}
						/>
						<TeamSummary
							blueTeam={blueTeam}
							redTeam={redTeam}
						/>
					</div>

					{/* CS & Gold over time */}
					<CsGoldChart timeline={timeline} />

					{/* Objectives */}
					<ObjectivesTimeline timeline={timeline} participants={match.info.participants} version={version} />
				</div>
			</motion.div>
		</div>
	);
}
