import { CATEGORIES, CATEGORY_LABELS, type CategoryId } from "@/lib/performance/weights";
import { cn } from "@/lib/utils";
import { type DuoSidePayload } from "@/lib/validators/duo";

function Cell({ value, other, align }: { value: number | null; other: number | null; align: "left" | "right" }) {
	const higher = value !== null && other !== null && value > other;
	return <span className={cn("w-10 text-sm tabular-nums", align === "right" && "text-right", higher ? "font-bold text-foreground" : "text-muted-foreground")}>{value ?? "—"}</span>;
}

/** The six category scores facing each other; the higher side is emphasized. */
export function CategoryRows({ player, friend }: { player: DuoSidePayload; friend: DuoSidePayload }) {
	const scoreOf = (side: DuoSidePayload, id: CategoryId) => side.summary.categories.find((c) => c.id === id)?.score ?? null;
	return (
		<div className="divide-y divide-border/50 border-t">
			{CATEGORIES.map((id) => {
				const a = scoreOf(player, id);
				const b = scoreOf(friend, id);
				return (
					<div key={id} className="flex items-center justify-between px-4 py-1.5">
						<Cell value={a} other={b} align="left" />
						<span className="text-xs text-muted-foreground">{CATEGORY_LABELS[id]}</span>
						<Cell value={b} other={a} align="right" />
					</div>
				);
			})}
		</div>
	);
}
