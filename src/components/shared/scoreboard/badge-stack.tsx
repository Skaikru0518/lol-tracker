import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { badgeColumn } from "@/lib/achievements/badges/column";
import { getMatchBadgeById } from "@/lib/achievements/badges/definitions";

const COMPACT = "h-3.5 cursor-pointer px-1 leading-none";

/** Up to three compact badge chips stacked in a column; beyond that two chips and a `+N` chip listing the rest on hover. */
export function BadgeStack({ badgeIds, side, className }: { badgeIds: string[]; side: "blue" | "red"; className?: string }) {
	const { shown, overflow } = badgeColumn(badgeIds);
	if (shown.length === 0) return null;
	const rest = overflow.map(getMatchBadgeById).filter((def) => def !== undefined);

	return (
		<div className={cn("flex-col justify-center gap-px", side === "red" ? "items-end" : "items-start", className)}>
			{shown.map((id) => {
				const def = getMatchBadgeById(id);
				if (!def) return null;
				return (
					<Tooltip key={id}>
						<TooltipTrigger asChild>
							<Chip color={def.color ?? ""} className={COMPACT}>
								{def.name}
							</Chip>
						</TooltipTrigger>
						<TooltipContent>{def.description}</TooltipContent>
					</Tooltip>
				);
			})}
			{rest.length > 0 && (
				<Tooltip>
					<TooltipTrigger asChild>
						<Chip color="" className={COMPACT}>
							+{rest.length}
						</Chip>
					</TooltipTrigger>
					<TooltipContent>
						<ul className="space-y-1">
							{rest.map((def) => (
								<li key={def.id}>
									<span className="font-semibold" style={{ color: def.color }}>
										{def.name}
									</span>{" "}
									· {def.description}
								</li>
							))}
						</ul>
					</TooltipContent>
				</Tooltip>
			)}
		</div>
	);
}
