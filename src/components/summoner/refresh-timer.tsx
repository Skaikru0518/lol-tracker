"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import IconTooltip from "@/components/ui/icon-tooltip";
import toast from "react-hot-toast";

const REFRESH_INTERVAL = 300;
const COOLDOWN = 180;

interface RefreshTimerProps {
	puuid?: string;
	className?: string;
}

async function forceRefreshData(puuid: string) {
	// Force ranked refresh (bypasses SWR, waits for Riot API)
	await fetch(`/api/ranked?puuid=${puuid}&force=true`);
	// Force match IDs refresh
	await fetch(`/api/matches?puuid=${puuid}&count=50`);
}

export default function RefreshTimer({ puuid, className }: RefreshTimerProps) {
	const queryClient = useQueryClient();
	const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
	const [cooldown, setCooldown] = useState(0);
	const [refreshing, setRefreshing] = useState(false);

	const invalidateAll = useCallback(() => {
		queryClient.invalidateQueries({
			predicate: (query) => {
				const key = query.queryKey[0] as string;
				return [
					"matches",
					"ranked",
					"summoner",
					"mastery",
					"lp-history",
				].includes(key);
			},
		});
	}, [queryClient]);

	// Auto countdown
	useEffect(() => {
		const interval = setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) {
					// Auto refresh — force ranked, then invalidate all
					if (puuid) {
						forceRefreshData(puuid).then(() => invalidateAll());
					} else {
						invalidateAll();
					}
					return REFRESH_INTERVAL;
				}
				return prev - 1;
			});

			setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
		}, 1000);

		return () => clearInterval(interval);
	}, [queryClient, puuid, invalidateAll]);

	// Manual refresh
	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		if (puuid) {
			await forceRefreshData(puuid);
		}
		invalidateAll();
		toast.success("Data refreshed");
		setRefreshing(false);
		setCountdown(REFRESH_INTERVAL);
		setCooldown(COOLDOWN);
	}, [puuid, invalidateAll]);

	const isDisabled = refreshing || cooldown > 0;
	const minutes = Math.floor(countdown / 60);
	const seconds = countdown % 60;

	return (
		<div className={`flex items-center gap-2 ${className ?? ""}`}>
			<span className="text-sm text-muted-foreground font-mono tabular-nums">
				{minutes}:{seconds.toString().padStart(2, "0")}
			</span>
			{isDisabled && cooldown > 0 ? (
				<IconTooltip label="Chill down...">
					<Button
						variant="ghost"
						size="icon"
						disabled
						className="shrink-0 opacity-50"
						title="Chill down..."
					>
						<RefreshCw className="size-4" />
					</Button>
				</IconTooltip>
			) : (
				<Button
					variant="ghost"
					size="icon"
					onClick={handleRefresh}
					disabled={isDisabled}
					className="shrink-0"
					title="Refresh data"
				>
					<RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
				</Button>
			)}
		</div>
	);
}
