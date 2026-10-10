"use client";

import { Fragment, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useChampionSpells } from "@/hooks/useChampionSpells";
import { getSpellIcon } from "@/lib/icon-helpers";
import { skillLevels, skillMaxOrder } from "@/lib/match/timeline-events";
import { type Timeline } from "@/lib/validators/timeline";

const KEYS = ["Q", "W", "E", "R"];
const LEVELS = 18;

/** Ability icons per row with the level each point went in, and the max order (R first) above. Letters stand in until icons load. */
export default function SkillOrder({
	timeline,
	participantId,
	version,
	championName,
}: {
	timeline?: Timeline;
	participantId: number;
	version: string;
	championName: string;
}) {
	const levels = useMemo(() => (timeline ? skillLevels(timeline, participantId) : []), [timeline, participantId]);
	const order = useMemo(() => skillMaxOrder(levels), [levels]);
	const { data } = useChampionSpells(version, championName);

	if (levels.length === 0) return <p className="text-sm text-muted-foreground">No skill data.</p>;

	const icon = (slot: number) => {
		const file = data?.spells[slot - 1];
		return file ? (
			<img src={getSpellIcon(version, file)} alt={KEYS[slot - 1]} title={KEYS[slot - 1]} width={24} height={24} className="size-6 rounded" />
		) : (
			<span className="grid size-6 place-items-center rounded bg-muted text-xs font-bold text-foreground">{KEYS[slot - 1]}</span>
		);
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
				Max:
				{order.map((slot, i) => (
					<Fragment key={slot}>
						{i > 0 && <span>&rsaquo;</span>}
						{icon(slot)}
					</Fragment>
				))}
			</div>
			<div className="overflow-x-auto">
				<div className="grid min-w-[30rem] gap-1" style={{ gridTemplateColumns: `1.75rem repeat(${LEVELS}, minmax(0, 1fr))` }}>
					{[1, 2, 3, 4].map((slot) => (
						<Fragment key={slot}>
							{icon(slot)}
							{Array.from({ length: LEVELS }, (_, i) => (
								<div
									key={i}
									className={cn(
										"grid h-6 place-items-center rounded text-3xs",
										levels[i] === slot ? (slot === 4 ? "bg-gold font-semibold text-background" : "bg-primary text-primary-foreground") : "bg-muted/50",
									)}
								>
									{levels[i] === slot ? i + 1 : ""}
								</div>
							))}
						</Fragment>
					))}
				</div>
			</div>
		</div>
	);
}
