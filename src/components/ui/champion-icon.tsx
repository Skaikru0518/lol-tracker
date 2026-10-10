import { cn } from "@/lib/utils";
import { getChampionDisplayName, getChampionIcon } from "@/lib/icon-helpers";

/** Square champion portrait with an optional level badge in the corner. */
export function ChampionIcon({
	version,
	championName,
	size = 32,
	level,
	className,
}: {
	version: string;
	championName: string;
	size?: number;
	level?: number;
	className?: string;
}) {
	return (
		<span
			className={cn("relative inline-block shrink-0", className)}
			style={{ width: size, height: size }}
		>
			<img
				src={getChampionIcon(version, championName)}
				alt={getChampionDisplayName(championName)}
				width={size}
				height={size}
				className="size-full rounded-md object-cover"
			/>
			{level !== undefined && (
				<span className="absolute -bottom-1 -right-1 rounded-md border bg-background px-1 text-[9px] leading-tight text-foreground">
					{level}
				</span>
			)}
		</span>
	);
}
