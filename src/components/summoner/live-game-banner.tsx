"use client";

import { useLiveGame } from "@/hooks/useLiveGame";
import { getQueueName } from "@/lib/queue-names";
import { getChampionIcon, type Champion } from "@/lib/icon-helpers";
import { motion } from "framer-motion";
import Image from "next/image";

interface LiveGameBannerProps {
	puuid: string;
	version?: string;
	champions?: Record<number, Champion>;
}

function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function LiveGameBanner({
	puuid,
	version,
	champions,
}: LiveGameBannerProps) {
	const { data, isLoading } = useLiveGame(puuid);

	if (isLoading || !data?.inGame) return null;

	const blueTeam =
		data.participants?.filter((p) => p.teamId === 100) ?? [];
	const redTeam =
		data.participants?.filter((p) => p.teamId === 200) ?? [];

	return (
		<motion.div
			initial={{ opacity: 0, y: -10, height: 0 }}
			animate={{ opacity: 1, y: 0, height: "auto" }}
			transition={{ duration: 0.4, ease: "easeOut" }}
			className="mb-4 overflow-hidden rounded-xl border border-green-500/30 bg-green-500/5 px-4 py-3"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<span className="relative flex size-3">
						<span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
						<span className="relative inline-flex size-3 rounded-full bg-green-500" />
					</span>
					<span className="font-semibold text-green-400">
						Currently In Game
					</span>
					{data.gameQueueConfigId !== undefined && (
						<span className="text-sm text-muted-foreground">
							{getQueueName(data.gameQueueConfigId)}
						</span>
					)}
					{data.gameLength !== undefined && (
						<span className="text-sm text-muted-foreground">
							· {formatDuration(data.gameLength)}
						</span>
					)}
				</div>

				{version && champions && (
					<div className="flex items-center gap-4">
						<div className="flex items-center gap-0.5">
							{blueTeam.map((p) => {
								const champ = champions[p.championId];
								if (!champ) return null;
								return (
									<Image
										key={p.puuid}
										src={getChampionIcon(version, champ.id)}
										alt={champ.name}
										width={24}
										height={24}
										className="rounded-sm"
										title={champ.name}
									/>
								);
							})}
						</div>
						<span className="text-xs text-muted-foreground">vs</span>
						<div className="flex items-center gap-0.5">
							{redTeam.map((p) => {
								const champ = champions[p.championId];
								if (!champ) return null;
								return (
									<Image
										key={p.puuid}
										src={getChampionIcon(version, champ.id)}
										alt={champ.name}
										width={24}
										height={24}
										className="rounded-sm"
										title={champ.name}
									/>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</motion.div>
	);
}
