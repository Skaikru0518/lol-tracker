"use client";

import { type Participant } from "@/lib/validators/match";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TeamSummaryProps {
	blueTeam: Participant[];
	redTeam: Participant[];
}

function sumStat(team: Participant[], fn: (p: Participant) => number): number {
	return team.reduce((acc, p) => acc + fn(p), 0);
}

interface CompareRowProps {
	label: string;
	blue: number;
	red: number;
	format?: (v: number) => string;
}

function CompareRow({ label, blue, red, format }: CompareRowProps) {
	const fmt = format ?? ((v) => v.toLocaleString());
	const total = blue + red || 1;
	const bluePercent = (blue / total) * 100;

	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between text-sm">
				<span className="font-medium text-blue-400">{fmt(blue)}</span>
				<span className="text-xs text-muted-foreground uppercase tracking-wider">
					{label}
				</span>
				<span className="font-medium text-red-400">{fmt(red)}</span>
			</div>
			<div className="flex h-1.5 overflow-hidden rounded-full bg-red-500/30">
				<div
					className="bg-blue-500 rounded-full transition-all"
					style={{ width: `${bluePercent}%` }}
				/>
			</div>
		</div>
	);
}

export default function TeamSummary({ blueTeam, redTeam }: TeamSummaryProps) {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<span className="text-sm font-bold text-blue-400">
						Blue Team
					</span>
					<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
						Team Stats
					</CardTitle>
					<span className="text-sm font-bold text-red-400">
						Red Team
					</span>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<CompareRow
					label="Kills"
					blue={sumStat(blueTeam, (p) => p.kills)}
					red={sumStat(redTeam, (p) => p.kills)}
				/>
				<CompareRow
					label="Deaths"
					blue={sumStat(blueTeam, (p) => p.deaths)}
					red={sumStat(redTeam, (p) => p.deaths)}
				/>
				<CompareRow
					label="Assists"
					blue={sumStat(blueTeam, (p) => p.assists)}
					red={sumStat(redTeam, (p) => p.assists)}
				/>
				<CompareRow
					label="Gold"
					blue={sumStat(blueTeam, (p) => p.goldEarned)}
					red={sumStat(redTeam, (p) => p.goldEarned)}
					format={(v) => `${(v / 1000).toFixed(1)}k`}
				/>
				<CompareRow
					label="Damage"
					blue={sumStat(
						blueTeam,
						(p) => p.totalDamageDealtToChampions,
					)}
					red={sumStat(
						redTeam,
						(p) => p.totalDamageDealtToChampions,
					)}
					format={(v) => `${(v / 1000).toFixed(1)}k`}
				/>
				<CompareRow
					label="CS"
					blue={sumStat(
						blueTeam,
						(p) => p.totalMinionsKilled + p.neutralMinionsKilled,
					)}
					red={sumStat(
						redTeam,
						(p) => p.totalMinionsKilled + p.neutralMinionsKilled,
					)}
				/>
				<CompareRow
					label="Vision"
					blue={sumStat(blueTeam, (p) => p.visionScore)}
					red={sumStat(redTeam, (p) => p.visionScore)}
				/>
				<CompareRow
					label="Wards"
					blue={sumStat(blueTeam, (p) => p.wardsPlaced)}
					red={sumStat(redTeam, (p) => p.wardsPlaced)}
				/>
				<CompareRow
					label="Towers"
					blue={sumStat(blueTeam, (p) => p.turretKills)}
					red={sumStat(redTeam, (p) => p.turretKills)}
				/>
				<CompareRow
					label="Dragons"
					blue={sumStat(blueTeam, (p) => p.dragonKills)}
					red={sumStat(redTeam, (p) => p.dragonKills)}
				/>
				<CompareRow
					label="Barons"
					blue={sumStat(blueTeam, (p) => p.baronKills)}
					red={sumStat(redTeam, (p) => p.baronKills)}
				/>
			</CardContent>
		</Card>
	);
}
