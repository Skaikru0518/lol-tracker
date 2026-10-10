import { cn } from "@/lib/utils";
import { getRankEmblem } from "@/lib/icon-helpers";

/** Local rank emblem image; unknown or empty tiers show the unranked emblem. */
export function RankEmblem({
	tier,
	size = 48,
	className,
}: {
	tier: string | null | undefined;
	size?: number;
	className?: string;
}) {
	return (
		<img
			src={getRankEmblem(tier)}
			alt={`${tier ? tier.toLowerCase() : "unranked"} emblem`}
			width={size}
			height={size}
			className={cn("shrink-0 object-contain", className)}
		/>
	);
}
