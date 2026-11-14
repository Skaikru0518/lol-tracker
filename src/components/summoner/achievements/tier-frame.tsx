import { cn } from "@/lib/utils";
import { tierColor } from "@/lib/achievements/tiers";

export { tierColor };

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
