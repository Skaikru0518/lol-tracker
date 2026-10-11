import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { progressView, rarityText, tierLabel } from "@/lib/achievements/display";
import { type ProgressDef } from "@/lib/achievements/progress/types";
import { type ProgressRow, type Rarity } from "@/lib/validators/achievements";
import { ProgressBar } from "./progress-bar";
import { TierFrame, tierColor } from "./tier-frame";

/** One milestone or seasonal achievement: tier frame, progress to the next tier, rarity, reached dates and an optional note. */
export function ProgressCard({
	def,
	row,
	rarity,
	scope,
	note = null,
}: {
	def: ProgressDef;
	row: ProgressRow | undefined;
	rarity: Rarity | null;
	scope: string;
	note?: string | null;
}) {
	const view = progressView(def, row);
	const maxTier = def.thresholds.length;
	const color = tierColor(view.tier, maxTier);
	const rarityLabel = rarityText(rarity, def.id, scope, view.tier);
	const reached = row?.reachedAt ?? [];

	const card = (
		<div className="flex items-start gap-3 rounded-md border p-3">
			<TierFrame icon={def.icon} tier={view.tier} maxTier={maxTier} />
			<div className="min-w-0 flex-1 space-y-1.5">
				<div className="flex items-baseline justify-between gap-2">
					<p className="truncate text-sm font-semibold text-foreground">{def.name}</p>
					<span className="shrink-0 text-xs font-semibold" style={{ color }}>
						{view.tierName ?? "Locked"}
					</span>
				</div>
				<p className="text-xs text-muted-foreground">{def.description}</p>
				<ProgressBar percent={view.percent} color={color} />
				<div className="flex justify-between gap-2 text-2xs text-muted-foreground">
					<span>{view.next ? `${view.current} / ${view.next}` : view.current}</span>
					{rarityLabel && <span>{rarityLabel}</span>}
				</div>
				{note && <p className="text-2xs text-muted-foreground">{note}</p>}
			</div>
		</div>
	);

	if (reached.length === 0) return card;
	return (
		<Tooltip>
			<TooltipTrigger asChild>{card}</TooltipTrigger>
			<TooltipContent>
				{reached.map((date, i) => (
					<p key={date + i}>
						{tierLabel(def, i + 1)}: {new Date(date).toLocaleDateString()}
					</p>
				))}
			</TooltipContent>
		</Tooltip>
	);
}
