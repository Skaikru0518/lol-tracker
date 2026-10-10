"use client";

import { useMemo } from "react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { calculateStats } from "@/lib/match/stats";
import { donutGradient, roleShares } from "@/lib/summoner/matches/roles";
import { formatThousands } from "@/lib/shared/format";
import { type Match } from "@/lib/validators/match";

const ROLE_COLORS = ["var(--primary)", "var(--team-blue)", "var(--win)", "var(--gold)", "var(--loss)"] as const;

/** Role donut plus average KDA, CS, gold, damage and vision over the last Summoner's Rift games, one dot per game. */
export function RolesPerformancePanel({ matches, puuid }: { matches: Match[]; puuid: string }) {
	const stats = useMemo(() => calculateStats(matches, puuid), [matches, puuid]);
	const shares = useMemo(() => roleShares(stats.roles), [stats.roles]);

	return (
		<Panel>
			<PanelHeader
				title="Roles & Performance"
				actions={<span className="text-xs text-muted-foreground">Last {stats.totalGames}</span>}
			/>
			{stats.totalGames === 0 ? (
				<EmptyState title="No Summoner's Rift games yet" />
			) : (
				<PanelBody className="space-y-4">
					<div className="flex items-center gap-4">
						<div className="grid size-20 shrink-0 place-items-center rounded-full" style={{ background: donutGradient(shares, ROLE_COLORS) }}>
							<div className="grid size-14 place-items-center rounded-full bg-card text-2xs font-semibold text-foreground">
								{shares[0]?.role ?? "-"}
							</div>
						</div>
						<ul className="min-w-0 flex-1 space-y-1 text-sm">
							{shares.slice(0, 4).map((share, index) => (
								<li key={share.role} className="flex items-center gap-2">
									<span className="size-2 rounded-sm" style={{ background: ROLE_COLORS[index % ROLE_COLORS.length] }} />
									<span className="flex-1 text-foreground">{share.role}</span>
									<span className="text-muted-foreground">{share.share}%</span>
								</li>
							))}
						</ul>
					</div>

					<div>
						<p className="text-xl font-bold">
							<span className="text-win">{stats.avgKills}</span> / <span className="text-loss">{stats.avgDeaths}</span> /{" "}
							<span className="text-gold">{stats.avgAssists}</span>
							<span className="ml-2 text-sm font-medium text-muted-foreground">{stats.avgKDA} KDA</span>
						</p>
						<p className="text-sm text-muted-foreground">
							<span className={stats.winRate >= 50 ? "text-win" : "text-loss"}>{stats.winRate}%</span> · {stats.wins}W {stats.losses}L
						</p>
					</div>

					<dl className="grid grid-cols-4 gap-2 text-center">
						{[
							["CS", String(stats.avgCS)],
							["Gold", formatThousands(stats.avgGold)],
							["Damage", formatThousands(stats.avgDamage)],
							["Vision", String(stats.avgVisionScore)],
						].map(([label, value]) => (
							<div key={label}>
								<dd className="text-sm font-semibold text-foreground">{value}</dd>
								<dt className="text-2xs text-muted-foreground">{label}</dt>
							</div>
						))}
					</dl>

					<div className="flex gap-0.5">
						{stats.recentTrend.map((win, index) => (
							<span key={index} className={`h-3 flex-1 rounded-sm ${win ? "bg-win" : "bg-loss"}`} />
						))}
					</div>
				</PanelBody>
			)}
		</Panel>
	);
}
