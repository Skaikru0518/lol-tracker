import { CATEGORIES, CATEGORY_LABELS, type CategoryId } from "@/lib/performance/weights";
import { cn } from "@/lib/utils";
import { type DuoSidePayload } from "@/lib/validators/duo";

function Bar({ value, team }: { value: number | null; team: "blue" | "red" }) {
	return (
		<div className={cn("flex h-2 overflow-hidden rounded-full bg-muted/40", team === "blue" && "justify-end")}>
			<div className={cn("h-full rounded-full", team === "blue" ? "bg-team-blue" : "bg-team-red")} style={{ width: `${value ?? 0}%` }} />
		</div>
	);
}

/** The six category scores as bars running out from the middle; the higher number is emphasized. */
export function CategoryRows({ player, friend }: { player: DuoSidePayload; friend: DuoSidePayload }) {
	const scoreOf = (side: DuoSidePayload, id: CategoryId) => side.summary.categories.find((c) => c.id === id)?.score ?? null;
	const number = (value: number | null, other: number | null) => (
		<span className={cn("text-sm tabular-nums", value !== null && other !== null && value > other ? "font-bold text-foreground" : "text-muted-foreground")}>{value ?? "—"}</span>
	);
	return (
		<div className="space-y-2 border-t px-4 py-3 sm:px-8">
			{CATEGORIES.map((id) => {
				const a = scoreOf(player, id);
				const b = scoreOf(friend, id);
				return (
					<div key={id} className="grid grid-cols-[2rem_minmax(0,1fr)_5.5rem_minmax(0,1fr)_2rem] items-center gap-2">
						{number(a, b)}
						<Bar value={a} team="blue" />
						<span className="text-center text-xs text-muted-foreground">{CATEGORY_LABELS[id]}</span>
						<Bar value={b} team="red" />
						<span className="text-right">{number(b, a)}</span>
					</div>
				);
			})}
		</div>
	);
}
