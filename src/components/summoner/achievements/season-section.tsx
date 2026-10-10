"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { ironWillNote, seasonOptions } from "@/lib/achievements/display";
import { SEASONAL } from "@/lib/achievements/seasonal/definitions";
import { type ProgressRow, type Rarity } from "@/lib/validators/achievements";
import { ProgressCard } from "./progress-card";

/** Seasonal achievements of the selected season; closed seasons show what was earned then. */
export function SeasonSection({ progress, rarity }: { progress: ProgressRow[]; rarity: Rarity | null }) {
	const options = seasonOptions(progress);
	const [seasonId, setSeasonId] = useState(options[0].id);
	const rows = new Map(progress.filter((p) => p.scope === seasonId).map((p) => [p.achievementId, p]));
	const closed = seasonId !== options[0].id;
	const defs = closed ? SEASONAL.filter((d) => rows.has(d.id)) : SEASONAL;

	return (
		<Panel>
			<PanelHeader
				title="Season"
				actions={
					options.length > 1 ? (
						<div className="flex gap-1.5">
							{options.map((o) => (
								<button
									key={o.id}
									type="button"
									onClick={() => setSeasonId(o.id)}
									className={cn(
										"h-7 rounded-md border px-2.5 text-xs font-medium transition-colors",
										o.id === seasonId ? "border-primary/50 bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
									)}
								>
									{o.label}
								</button>
							))}
						</div>
					) : (
						<span className="text-xs text-muted-foreground">{options[0].label}</span>
					)
				}
			/>
			<div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
				{defs.map((def) => (
					<ProgressCard
						key={def.id}
						def={def}
						row={rows.get(def.id)}
						rarity={closed ? null : rarity}
						scope={seasonId}
						note={def.id === "iron-will" ? ironWillNote(rows.get("iron-will"), rows.get("season-winner")) : null}
					/>
				))}
			</div>
		</Panel>
	);
}
