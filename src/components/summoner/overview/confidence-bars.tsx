import { cn } from "@/lib/utils";
import { type MmrEstimate } from "@/lib/validators/mmr";

const LEVELS: Record<MmrEstimate["confidence"], { filled: number; color: string }> = {
	low: { filled: 1, color: "bg-loss" },
	medium: { filled: 2, color: "bg-amber-400" },
	high: { filled: 3, color: "bg-win" },
};
const HEIGHTS = ["h-1", "h-1.5", "h-2"];

export function ConfidenceBars({ confidence }: { confidence: MmrEstimate["confidence"] }) {
	const { filled, color } = LEVELS[confidence];
	return (
		<span className="flex items-end gap-px" aria-label={`${confidence} confidence`}>
			{HEIGHTS.map((height, i) => (
				<span key={height} className={cn("w-0.5 rounded-full", height, i < filled ? color : "bg-muted-foreground/30")} />
			))}
		</span>
	);
}
