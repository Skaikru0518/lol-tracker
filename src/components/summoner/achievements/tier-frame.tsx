import { cn } from "@/lib/utils";
import { LOCKED_COLOR, TIER_COLORS } from "@/lib/achievements/tiers";

const EARNED_COLOR = "#f1c40f";

/** Tier color of a reached tier; binary achievements use one earned color. */
export function tierColor(tier: number, maxTier: number): string {
	if (tier === 0) return LOCKED_COLOR;
	return maxTier === 1 ? EARNED_COLOR : TIER_COLORS[tier - 1];
}

/** Achievement icon framed in its tier color; locked icons are grey. */
export function TierFrame({ icon, tier, maxTier }: { icon: string; tier: number; maxTier: number }) {
	const color = tierColor(tier, maxTier);
	return (
		<div
			className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg border-2", tier === 0 && "grayscale opacity-60")}
			style={{ borderColor: color, backgroundColor: `${color}1a` }}
		>
			<img src={`/achi/${icon}.svg`} alt="" width={32} height={32} className="size-8" />
		</div>
	);
}
