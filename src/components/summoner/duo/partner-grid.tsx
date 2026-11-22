import Link from "next/link";
import { getSummonerIcon } from "@/lib/game/icon-helpers";
import { asRole, ROLE_LABELS } from "@/lib/performance/roles";
import { cn } from "@/lib/utils";
import { type DuoPartnerPayload } from "@/lib/validators/duo";

function PartnerCard({ partner, basePath, version }: { partner: DuoPartnerPayload; basePath: string; version: string }) {
	const role = partner.role && asRole(partner.role);
	const winning = partner.winRate >= 50;
	return (
		<Link
			href={`${basePath}/duo?with=${encodeURIComponent(partner.puuid)}`}
			className="flex flex-col gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-accent/30"
		>
			<div className="flex items-center gap-3">
				<img src={getSummonerIcon(version, partner.profileIcon)} alt="" width={40} height={40} className="size-10 shrink-0 rounded-lg" />
				<div className="min-w-0 flex-1 leading-tight">
					<p className="truncate text-sm font-semibold text-foreground">{partner.gameName}</p>
					{partner.tagLine && <p className="truncate text-3xs text-muted-foreground">#{partner.tagLine}</p>}
				</div>
				{role && <span className="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-3xs font-medium text-muted-foreground">{ROLE_LABELS[role]}</span>}
			</div>
			<div className="space-y-1.5">
				<div className="flex items-baseline justify-between">
					<span className="text-xs text-muted-foreground">{partner.games} games together</span>
					<span className={cn("text-lg font-bold tabular-nums", winning ? "text-win" : "text-loss")}>{partner.winRate}%</span>
				</div>
				<div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
					<div className={cn("h-full rounded-full", winning ? "bg-win" : "bg-loss")} style={{ width: `${partner.winRate}%` }} />
				</div>
				<p className="text-3xs text-muted-foreground">
					{partner.difference === null ? (
						"Every recent game was together"
					) : (
						<>
							<span className={cn("font-semibold", partner.difference >= 0 ? "text-win" : "text-loss")}>
								{partner.difference >= 0 ? "+" : "−"}
								{Math.abs(partner.difference)}%
							</span>{" "}
							vs. without them
						</>
					)}
				</p>
			</div>
		</Link>
	);
}

/** Duo partners as cards linking to the comparison. */
export function PartnerGrid({ partners, basePath, version }: { partners: DuoPartnerPayload[]; basePath: string; version: string }) {
	return (
		<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{partners.map((p) => (
				<PartnerCard key={p.puuid} partner={p} basePath={basePath} version={version} />
			))}
		</div>
	);
}
