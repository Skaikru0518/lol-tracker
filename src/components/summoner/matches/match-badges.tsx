import { Chip } from "@/components/ui/chip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getMatchBadgeById } from "@/lib/match-badges/definitions";

/** Badge chips with tooltips; `max` shows that many plus a `+X` chip. Needs a TooltipProvider above. */
export function MatchBadges({ badgeIds, max }: { badgeIds: string[]; max?: number }) {
	const limit = max ?? badgeIds.length;
	const overflow = badgeIds.length - limit;

	return (
		<div className="flex flex-wrap items-center gap-1">
			{badgeIds.slice(0, limit).map((id) => {
				const def = getMatchBadgeById(id);
				if (!def) return null;
				return (
					<Tooltip key={id}>
						<TooltipTrigger asChild>
							<Chip color={def.color ?? ""} className="cursor-pointer">
								{def.name}
							</Chip>
						</TooltipTrigger>
						<TooltipContent>
							<p>{def.description}</p>
						</TooltipContent>
					</Tooltip>
				);
			})}
			{overflow > 0 && <Chip color="">+{overflow}</Chip>}
		</div>
	);
}
