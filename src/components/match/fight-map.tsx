"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { formatDuration } from "@/lib/shared/format";
import { type FightRole, playerFightEvents } from "@/lib/match/timeline-events";
import { type Participant } from "@/lib/validators/match";
import { type Timeline } from "@/lib/validators/timeline";

const MAP_SIZE = 15000;
const pct = (coord: number) => `${(coord / MAP_SIZE) * 100}%`;

const ROLE_COLOR: Record<FightRole, string> = { kill: "var(--win)", death: "var(--loss)", assist: "var(--team-blue)" };
const ROLE_LABEL: Record<FightRole, string> = { kill: "Kill", death: "Death", assist: "Assist" };
const FILTERS: { id: FightRole | "all"; label: string }[] = [
	{ id: "all", label: "All" },
	{ id: "kill", label: "Kills" },
	{ id: "death", label: "Deaths" },
	{ id: "assist", label: "Assists" },
];

/** The player's kills, deaths and assists on the Rift map next to a time-ordered list; hovering either side highlights the other. */
export function FightMap({ timeline, participantId, participants, version }: { timeline: Timeline; participantId: number; participants: Participant[]; version: string }) {
	const events = useMemo(() => playerFightEvents(timeline, participantId), [timeline, participantId]);
	const [filter, setFilter] = useState<FightRole | "all">("all");
	const [hovered, setHovered] = useState<string | null>(null);
	const shown = filter === "all" ? events : events.filter((e) => e.role === filter);

	return (
		<Panel>
			<PanelHeader
				title="Kills & deaths"
				actions={
					<div className="flex gap-1">
						{FILTERS.map((f) => (
							<button
								key={f.id}
								type="button"
								onClick={() => setFilter(f.id)}
								aria-pressed={f.id === filter}
								className={cn(
									"h-6 rounded-md border px-2 text-xs font-medium transition-colors",
									f.id === filter ? "border-primary/50 bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
								)}
							>
								{f.label}
							</button>
						))}
					</div>
				}
			/>
			{events.length === 0 ? (
				<EmptyState title="No kills, deaths or assists" />
			) : (
				<PanelBody className="grid gap-4 md:grid-cols-[minmax(0,18rem)_1fr]">
					<div className="relative aspect-square w-full overflow-hidden rounded-md border">
						<img src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/map/map11.png`} alt="Summoner's Rift" className="size-full object-cover opacity-70" />
						{shown
							.filter((e) => e.x !== null && e.y !== null)
							.map((e) => (
								<span
									key={e.id}
									onMouseEnter={() => setHovered(e.id)}
									onMouseLeave={() => setHovered(null)}
									className={cn("absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full transition-transform", hovered === e.id && "scale-150 ring-4 ring-gold/60")}
									style={{ left: pct(e.x!), bottom: pct(e.y!), background: ROLE_COLOR[e.role] }}
								/>
							))}
					</div>
					<ul className="max-h-80 divide-y divide-border/50 overflow-y-auto">
						{shown.map((e) => {
							const other = e.otherId > 0 ? participants[e.otherId - 1] : undefined;
							return (
								<li
									key={e.id}
									onMouseEnter={() => setHovered(e.id)}
									onMouseLeave={() => setHovered(null)}
									className={cn("flex items-center gap-2 px-2 py-1.5 text-sm", hovered === e.id && "bg-gold/10")}
								>
									<span className="w-11 tabular-nums text-muted-foreground">{formatDuration(e.timestamp / 1000)}</span>
									<span className="size-2 rounded-full" style={{ background: ROLE_COLOR[e.role] }} />
									<span className="text-foreground">{ROLE_LABEL[e.role]}</span>
									<span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
										{e.role === "death" && (other ? "by" : "Executed")}
										{other && <ChampionIcon version={version} championName={other.championName} size={20} />}
									</span>
								</li>
							);
						})}
					</ul>
				</PanelBody>
			)}
		</Panel>
	);
}
