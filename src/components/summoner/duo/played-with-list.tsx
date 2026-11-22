import Link from "next/link";
import { getSummonerIcon } from "@/lib/game/icon-helpers";
import { asRole, ROLE_LABELS } from "@/lib/performance/roles";
import { cn } from "@/lib/utils";
import { type DuoPartnerPayload } from "@/lib/validators/duo";

/** Duo partners as rows linking to the comparison. */
export function PlayedWithList({ partners, basePath, version, limit }: { partners: DuoPartnerPayload[]; basePath: string; version: string; limit?: number }) {
	return (
		<ul className="space-y-1 p-2">
			{partners.slice(0, limit).map((p) => {
				const role = p.role && asRole(p.role);
				return (
					<li key={p.puuid}>
						<Link href={`${basePath}/duo?with=${encodeURIComponent(p.puuid)}`} className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent">
							<img src={getSummonerIcon(version, p.profileIcon)} alt="" width={32} height={32} className="size-8 shrink-0 rounded-md" />
							<div className="min-w-0 flex-1 text-sm">
								<p className="truncate font-medium text-foreground">
									{p.gameName}
									<span className="ml-1 text-muted-foreground">#{p.tagLine}</span>
								</p>
								<p className="text-xs text-muted-foreground">
									{p.games} games{role ? ` · ${ROLE_LABELS[role]}` : ""}
								</p>
							</div>
							<div className="shrink-0 text-right leading-tight">
								<p className={cn("text-sm font-semibold", p.winRate >= 50 ? "text-win" : "text-loss")}>{p.winRate}%</p>
								{p.difference !== null && (
									<p className={cn("text-3xs", p.difference >= 0 ? "text-win" : "text-loss")}>
										{p.difference >= 0 ? "+" : "−"}
										{Math.abs(p.difference)}%
									</p>
								)}
							</div>
						</Link>
					</li>
				);
			})}
		</ul>
	);
}
