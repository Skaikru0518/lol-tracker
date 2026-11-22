import Link from "next/link";
import { Crown, Flame, Skull } from "lucide-react";
import { getSummonerIcon } from "@/lib/game/icon-helpers";
import { duoHighlights } from "@/lib/duo/highlights";
import { cn } from "@/lib/utils";
import { type DuoPartnerPayload } from "@/lib/validators/duo";

function Highlight({ label, icon, partner, value, valueClass, basePath, version }: {
	label: string;
	icon: React.ReactNode;
	partner: DuoPartnerPayload;
	value: string;
	valueClass: string;
	basePath: string;
	version: string;
}) {
	return (
		<Link
			href={`${basePath}/duo?with=${encodeURIComponent(partner.puuid)}`}
			className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/50"
		>
			<img src={getSummonerIcon(version, partner.profileIcon)} alt="" width={44} height={44} className="size-11 shrink-0 rounded-lg" />
			<div className="min-w-0 flex-1 leading-tight">
				<p className="flex items-center gap-1 text-3xs font-semibold uppercase tracking-wide text-muted-foreground">
					{icon}
					{label}
				</p>
				<p className="truncate text-sm font-semibold text-foreground">{partner.gameName}</p>
				<p className={cn("text-xs font-semibold", valueClass)}>{value}</p>
			</div>
		</Link>
	);
}

/** Most games together, best and toughest duo, above the partner grid. */
export function DuoHighlights({ partners, basePath, version }: { partners: DuoPartnerPayload[]; basePath: string; version: string }) {
	const { mostPlayed, best, toughest } = duoHighlights(partners);
	const shared = { basePath, version };
	return (
		<div className="grid gap-3 sm:grid-cols-3">
			{mostPlayed && (
				<Highlight label="Most played with" icon={<Crown className="size-3 text-gold" />} partner={mostPlayed} value={`${mostPlayed.games} games · ${mostPlayed.winRate}% WR`} valueClass="text-muted-foreground" {...shared} />
			)}
			{best && <Highlight label="Best duo" icon={<Flame className="size-3 text-win" />} partner={best} value={`+${best.difference}% win rate together`} valueClass="text-win" {...shared} />}
			{toughest && (
				<Highlight label="Toughest duo" icon={<Skull className="size-3 text-loss" />} partner={toughest} value={`−${Math.abs(toughest.difference ?? 0)}% win rate together`} valueClass="text-loss" {...shared} />
			)}
		</div>
	);
}
