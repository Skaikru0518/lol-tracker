import { cn } from "@/lib/utils";
import { remSize } from "@/lib/ui/size";
import { getItemIcon } from "@/lib/icon-helpers";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Row of item icons; `0` renders as an empty slot. With `itemNames` each icon shows its name on hover (needs a TooltipProvider above). */
export function ItemSlots({
	version,
	items,
	size = 22,
	className,
	itemNames,
}: {
	version: string;
	items: readonly number[];
	size?: number;
	className?: string;
	itemNames?: Map<number, string>;
}) {
	return (
		<div className={cn("flex gap-0.5", className)}>
			{items.map((itemId, index) => {
				const src = getItemIcon(version, itemId);
				const style = { width: remSize(size), height: remSize(size) };
				if (!src) return <span key={index} className="rounded bg-muted" style={style} />;
				const name = itemNames?.get(itemId);
				const icon = <img src={src} alt={name ?? ""} width={size} height={size} style={style} className={cn("rounded", name && "cursor-pointer")} />;
				return name ? (
					<Tooltip key={index}>
						<TooltipTrigger asChild>{icon}</TooltipTrigger>
						<TooltipContent>{name}</TooltipContent>
					</Tooltip>
				) : (
					<span key={index} className="contents">
						{icon}
					</span>
				);
			})}
		</div>
	);
}
