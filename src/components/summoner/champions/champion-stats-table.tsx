"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { Chip } from "@/components/ui/chip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPoints, formatThousands } from "@/lib/shared/format";
import { getChampionDisplayName } from "@/lib/game/icon-helpers";
import { type ChampionTableRow } from "@/lib/summoner/champions/champion-rows";

const MASTERY_COLOR = "var(--primary)";

function WinRateBar({ value }: { value: number }) {
	return (
		<div className="flex items-center gap-2">
			<div className="h-1.5 w-16 overflow-hidden rounded-full bg-loss/60">
				<div className="h-full bg-win" style={{ width: `${value}%` }} />
			</div>
			<span className={value >= 50 ? "text-win" : "text-loss"}>{Math.round(value)}%</span>
		</div>
	);
}

/** Per-champion stats with mastery; rows link to the champion sub-page. */
export function ChampionStatsTable({ rows, version, basePath }: { rows: ChampionTableRow[]; version: string; basePath: string }) {
	const router = useRouter();
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-8">#</TableHead>
					<TableHead>Champion</TableHead>
					<TableHead className="text-right">Games</TableHead>
					<TableHead>Winrate</TableHead>
					<TableHead>KDA</TableHead>
					<TableHead className="hidden text-right sm:table-cell">CS/min</TableHead>
					<TableHead className="hidden text-right md:table-cell">Avg dmg</TableHead>
					<TableHead className="hidden lg:table-cell">Mastery</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map(({ stat, mastery }, index) => (
					<TableRow
						key={stat.championId}
						className="cursor-pointer"
						onClick={(e) => {
							// The champion name is a real link; let it handle its own (and modifier) clicks
							if ((e.target as Element).closest("a")) return;
							router.push(`${basePath}/champions/${stat.championName}`);
						}}
					>
						<TableCell className="text-muted-foreground">{index + 1}</TableCell>
						<TableCell>
							<Link href={`${basePath}/champions/${stat.championName}`} className="flex items-center gap-2 font-semibold text-foreground hover:text-primary">
								<ChampionIcon version={version} championName={stat.championName} size={26} />
								{getChampionDisplayName(stat.championName)}
							</Link>
						</TableCell>
						<TableCell className="text-right">{stat.games}</TableCell>
						<TableCell>
							<WinRateBar value={stat.winRate} />
						</TableCell>
						<TableCell>
							<span className="font-semibold text-foreground">{stat.kda}</span>{" "}
							<span className="text-xs text-muted-foreground">
								{stat.kills}/{stat.deaths}/{stat.assists}
							</span>
						</TableCell>
						<TableCell className="hidden text-right sm:table-cell">{stat.csPerMin}</TableCell>
						<TableCell className="hidden text-right md:table-cell">{formatThousands(stat.avgDamage)}</TableCell>
						<TableCell className="hidden lg:table-cell">
							{mastery ? (
								<Chip color={MASTERY_COLOR}>
									{formatPoints(mastery.championPoints)}
								</Chip>
							) : (
								<span className="text-muted-foreground">—</span>
							)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
