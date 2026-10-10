"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { refreshTick } from "@/lib/summoner/profile/refresh-tick";

const REFRESH_INTERVAL = 300;
const COOLDOWN = 180;
const REFRESHED_KEYS = ["matches", "ranked", "summoner", "mastery", "lp-history", "champion-stats"];

async function forceRefreshData(puuid: string) {
	await fetch(`/api/ranked?puuid=${puuid}&force=true`);
	await fetch(`/api/matches?puuid=${puuid}&count=50`);
}

/** Update button with an auto-refresh countdown; refetches client data and the server shell. */
export function RefreshButton({ puuid }: { puuid: string }) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
	const [cooldown, setCooldown] = useState(0);
	const [refreshing, setRefreshing] = useState(false);
	const deadline = useRef(0);

	const refreshAll = useCallback(async () => {
		await forceRefreshData(puuid);
		await queryClient.invalidateQueries({
			predicate: (query) => REFRESHED_KEYS.includes(query.queryKey[0] as string),
		});
		router.refresh();
	}, [puuid, queryClient, router]);

	useEffect(() => {
		if (deadline.current === 0) deadline.current = Date.now() + REFRESH_INTERVAL * 1000;
		const id = setInterval(() => {
			const tick = refreshTick(Date.now(), deadline.current, REFRESH_INTERVAL * 1000);
			deadline.current = tick.deadline;
			setCountdown(tick.secondsLeft);
			setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
			if (tick.due) void refreshAll();
		}, 1000);
		return () => clearInterval(id);
	}, [refreshAll]);

	async function handleClick() {
		setRefreshing(true);
		await refreshAll();
		toast.success("Data refreshed");
		setRefreshing(false);
		deadline.current = Date.now() + REFRESH_INTERVAL * 1000;
		setCountdown(REFRESH_INTERVAL);
		setCooldown(COOLDOWN);
	}

	const minutes = Math.floor(countdown / 60);
	const seconds = countdown % 60;

	return (
		<div className="flex items-center gap-2">
			<span className="font-mono text-xs tabular-nums text-muted-foreground">
				{minutes}:{seconds.toString().padStart(2, "0")}
			</span>
			<Button
				size="sm"
				variant="outline"
				onClick={handleClick}
				disabled={refreshing || cooldown > 0}
				title={cooldown > 0 ? "Chill down..." : "Refresh data"}
			>
				<RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
				Update
			</Button>
		</div>
	);
}
