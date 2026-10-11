import { Panel, PanelHeader } from "@/components/ui/panel";
import { MILESTONES } from "@/lib/achievements/milestones/definitions";
import { ALL_TIME_SCOPE } from "@/lib/achievements/progress/types";
import { type ProgressRow, type Rarity } from "@/lib/validators/achievements";
import { ProgressCard } from "./progress-card";

/** All-time milestones with tiers, progress and rarity. */
export function MilestoneSection({ progress, rarity }: { progress: ProgressRow[]; rarity: Rarity | null }) {
	const rows = new Map(progress.filter((p) => p.scope === ALL_TIME_SCOPE).map((p) => [p.achievementId, p]));
	const reached = MILESTONES.filter((m) => (rows.get(m.id)?.tier ?? 0) > 0).length;
	return (
		<Panel>
			<PanelHeader
				title="Milestones"
				actions={
					<span className="text-xs text-muted-foreground">
						{reached} of {MILESTONES.length} unlocked
					</span>
				}
			/>
			<div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
				{MILESTONES.map((def) => (
					<ProgressCard key={def.id} def={def} row={rows.get(def.id)} rarity={rarity} scope={ALL_TIME_SCOPE} />
				))}
			</div>
		</Panel>
	);
}
