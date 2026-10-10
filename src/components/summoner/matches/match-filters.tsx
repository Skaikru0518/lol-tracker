"use client";

import { cn } from "@/lib/utils";
import { type QueueFilter } from "@/lib/champion-stats/queue";

const CHIPS: { value: QueueFilter; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "solo", label: "Solo" },
	{ value: "flex", label: "Flex" },
	{ value: "aram", label: "ARAM" },
	{ value: "normal", label: "Normal" },
];

/** Queue chips for the match list. */
export function MatchFilters({ queue, onQueueChange }: { queue: QueueFilter; onQueueChange: (queue: QueueFilter) => void }) {
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{CHIPS.map((chip) => (
				<button
					key={chip.value}
					type="button"
					onClick={() => onQueueChange(chip.value)}
					className={cn(
						"h-7 rounded-md border px-2.5 text-xs font-medium transition-colors",
						queue === chip.value ? "border-primary/50 bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
					)}
				>
					{chip.label}
				</button>
			))}
		</div>
	);
}
