"use client";

import { getQueueName } from "@/lib/queue-names";
import { getRankEmblem, RANK_COLORS } from "@/lib/icon-helpers";
import { type RankedEntry } from "@/lib/validators/ranked";
import { calculateAvgRank, formatRankLabel } from "@/lib/rank-calculator";
import Image from "next/image";

interface MatchInfoProps {
	queueId: number;
	gameMode: string;
	gameDuration: number;
	gameCreation: number;
	playerRanks?: Record<string, RankedEntry[]>;
}

function formatDuration(seconds: number): string {
	const min = Math.floor(seconds / 60);
	const sec = seconds % 60;
	return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function MatchInfo({
	queueId,
	gameMode,
	gameDuration,
	gameCreation,
	playerRanks,
}: MatchInfoProps) {
	const avgRank = calculateAvgRank(playerRanks, queueId);

	return (
		<div className="rounded-xl border bg-card px-4 py-4 sm:px-8 sm:py-6">
			<div className="flex items-center justify-between">
				{/* Left: Queue name + date */}
				<div>
					<h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
						{getQueueName(queueId, gameMode)}
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{formatDate(gameCreation)}
					</p>
				</div>

				{/* Center: Avg Rank */}
				<div className="flex items-center gap-2">
					{avgRank ? (
						<>
							<Image
								src={getRankEmblem(avgRank.tier)}
								alt={formatRankLabel(avgRank.tier, avgRank.rank)}
								width={40}
								height={40}
								className="shrink-0"
							/>
							<div className="text-center">
								<p
									className="text-base sm:text-lg font-bold"
									style={{
										color: RANK_COLORS[avgRank.tier] ?? "#888",
									}}
								>
									{formatRankLabel(avgRank.tier, avgRank.rank)}
								</p>
								<p className="text-xs text-muted-foreground">
									Avg Lobby Rank
								</p>
							</div>
						</>
					) : (
						<>
							<img
								src={getRankEmblem("unranked")}
								alt="Unranked"
								width={40}
								height={40}
								className="shrink-0 opacity-40"
							/>
							<div className="text-center">
								<p className="text-base sm:text-lg font-bold text-muted-foreground">
									—
								</p>
								<p className="text-xs text-muted-foreground">
									Avg Lobby Rank
								</p>
							</div>
						</>
					)}
				</div>

				{/* Right: Duration */}
				<div className="text-right">
					<p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono">
						{formatDuration(gameDuration)}
					</p>
					<p className="text-sm text-muted-foreground">Duration</p>
				</div>
			</div>
		</div>
	);
}
