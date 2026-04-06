"use client";

import { Fragment, useMemo } from "react";
import { type Timeline } from "@/lib/validators/timeline";

interface SkillOrderProps {
	timeline?: Timeline;
	participantId: number;
}

const SKILL_KEYS = ["Q", "W", "E", "R"] as const;
const SKILL_SLOTS = [1, 2, 3, 4] as const;
const LEVELS = Array.from({ length: 18 }, (_, i) => i + 1);

const SKILL_COLORS: Record<number, { bg: string; text: string }> = {
	1: { bg: "bg-primary/70", text: "text-primary" },
	2: { bg: "bg-primary/55", text: "text-primary/80" },
	3: { bg: "bg-primary/40", text: "text-primary/60" },
	4: { bg: "bg-primary/70", text: "text-primary" },
};

export default function SkillOrder({
	timeline,
	participantId,
}: SkillOrderProps) {
	const skillLevelUps = useMemo(() => {
		if (!timeline) return new Map<string, number>();

		const map = new Map<string, number>();
		let levelCounter = 0;

		for (const frame of timeline.info.frames) {
			for (const event of frame.events) {
				if (
					event.type === "SKILL_LEVEL_UP" &&
					event.participantId === participantId &&
					event.skillSlot != null
				) {
					levelCounter++;
					map.set(
						`${event.skillSlot}-${levelCounter}`,
						event.skillSlot,
					);
				}
			}
		}

		return map;
	}, [timeline, participantId]);

	if (!timeline) return null;

	return (
		<div className="overflow-x-auto w-full">
			<div className="grid grid-cols-[32px_repeat(18,1fr)] sm:grid-cols-[44px_repeat(18,1fr)] gap-0.5 sm:gap-1 w-full">
				{/* Header row */}
				<div />
				{LEVELS.map((level) => (
					<div
						key={level}
						className="flex h-6 sm:h-9 w-full items-center justify-center text-[10px] sm:text-sm font-medium text-muted-foreground"
					>
						{level}
					</div>
				))}

				{/* Skill rows */}
				{SKILL_SLOTS.map((slot, idx) => (
					<Fragment key={slot}>
						<div
							className={`flex h-6 sm:h-9 w-8 sm:w-11 items-center justify-center rounded-md text-[10px] sm:text-sm font-bold ${SKILL_COLORS[slot].text} bg-muted/30`}
						>
							{SKILL_KEYS[idx]}
						</div>
						{LEVELS.map((level) => {
							const filled = skillLevelUps.has(
								`${slot}-${level}`,
							);
							return (
								<div
									key={`${slot}-${level}`}
									className={`h-6 sm:h-9 w-full rounded-md transition-colors ${
										filled
											? `${SKILL_COLORS[slot].bg} shadow-sm shadow-current/20`
											: "bg-muted/15 border border-border/20"
									}`}
								/>
							);
						})}
					</Fragment>
				))}
			</div>
		</div>
	);
}
