"use client";

import { getQueueName } from "@/lib/queue-names";

interface MatchInfoProps {
	queueId: number;
	gameMode: string;
	gameDuration: number;
	gameCreation: number;
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
}: MatchInfoProps) {
	return (
		<div className="flex items-center justify-between rounded-xl border bg-card px-8 py-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">
					{getQueueName(queueId, gameMode)}
				</h1>
				<p className="mt-1 text-base text-muted-foreground">
					{formatDate(gameCreation)}
				</p>
			</div>
			<div className="text-right">
				<p className="text-3xl font-bold font-mono">
					{formatDuration(gameDuration)}
				</p>
				<p className="text-base text-muted-foreground">Duration</p>
			</div>
		</div>
	);
}
