"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import IconTooltip from "@/components/ui/icon-tooltip";
import toast from "react-hot-toast";

const REFRESH_INTERVAL = 300; // 5 minutes in seconds
const COOLDOWN = 180; // 3 minutes cooldown after manual refresh

interface RefreshTimerProps {
	className?: string;
}

export default function RefreshTimer({ className }: RefreshTimerProps) {
	const queryClient = useQueryClient();
	const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
	const [cooldown, setCooldown] = useState(0);
	const [refreshing, setRefreshing] = useState(false);

	// Countdown timer
	useEffect(() => {
		const interval = setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) {
					// Auto refresh
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
					return REFRESH_INTERVAL;
				}
				return prev - 1;
			});

			setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
		}, 1000);

		return () => clearInterval(interval);
	}, [queryClient]);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		await queryClient.invalidateQueries({
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
		toast.success("Data refreshed");
		setRefreshing(false);
		setCountdown(REFRESH_INTERVAL);
		setCooldown(COOLDOWN);
	}, [queryClient]);

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
