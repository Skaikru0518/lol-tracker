"use client";

import { type Account, type Summoner } from "@/lib/validators/summoner";
import { getSummonerIcon } from "@/lib/icon-helpers";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import RefreshTimer from "./refresh-timer";

interface ProfileHeaderProps {
	account: Account;
	summoner?: Summoner;
	version?: string;
}

export default function ProfileHeader({
	account,
	summoner,
	version,
}: ProfileHeaderProps) {
	const [copied, setCopied] = useState(false);

	function handleCopy() {
		navigator.clipboard.writeText(`${account.gameName}#${account.tagLine}`);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}

	return (
		<div className="flex items-center gap-5">
			{version && summoner ? (
				<Image
					src={getSummonerIcon(version, summoner.profileIconId)}
					alt={account.gameName}
					width={80}
					height={80}
					className="rounded-2xl border border-border/50"
				/>
			) : (
				<div className="size-20 rounded-2xl bg-muted animate-pulse" />
			)}
			<div>
				<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
					<button
						onClick={handleCopy}
						className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
						title="Copy Riot ID"
					>
						{copied ? (
							<Check className="size-4 text-win" />
						) : (
							<Copy className="size-4" />
						)}
					</button>
					{account.gameName}
					<span className="text-lg font-normal text-muted-foreground">
						#{account.tagLine}
					</span>
				</h1>
				{summoner && (
					<div className="mt-1 flex items-center gap-3">
						<span className="text-base text-muted-foreground">
							Level {summoner.summonerLevel}
						</span>
						<RefreshTimer />
					</div>
				)}
			</div>
		</div>
	);
}
