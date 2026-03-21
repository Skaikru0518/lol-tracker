"use client";

import { type Account, type Summoner } from "@/lib/validators/summoner";
import { getSummonerIcon } from "@/lib/icon-helpers";
import Image from "next/image";

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
				<h1 className="text-3xl font-bold tracking-tight">
					{account.gameName}
					<span className="ml-2 text-lg font-normal text-muted-foreground">
						#{account.tagLine}
					</span>
				</h1>
				{summoner && (
					<p className="mt-1 text-base text-muted-foreground">
						Level {summoner.summonerLevel}
					</p>
				)}
			</div>
		</div>
	);
}
