import { highestTierOrdinal, tierFor } from "../tiers";
import { ALL_TIME_SCOPE, type ChampionTotals, type MilestoneInputs, type ProgressResult } from "../progress/types";
import { MILESTONES } from "./definitions";

const sum = (champions: ChampionTotals[], field: keyof Omit<ChampionTotals, "championName">) => champions.reduce((s, c) => s + c[field], 0);

/** Raw value of every milestone from the inputs. */
function milestoneValues({ champions, snapshots, ranked, masteries }: MilestoneInputs): Record<string, number> {
	return {
		veteran: sum(champions, "games"),
		winner: sum(champions, "wins"),
		pentakiller: sum(champions, "pentas"),
		multikiller: sum(champions, "quadras"),
		slayer: sum(champions, "kills"),
		wingman: sum(champions, "assists"),
		visionary: sum(champions, "vision"),
		demolisher: sum(champions, "turrets"),
		"epic-hunter": sum(champions, "epics"),
		"champion-pool": champions.filter((c) => c.wins > 0).length,
		"one-champ-army": Math.max(0, ...champions.map((c) => c.wins)),
		"mastery-collector": masteries.filter((m) => m.championLevel >= 10).length,
		devotion: Math.max(0, ...masteries.map((m) => m.championPoints)),
		"peak-rank": highestTierOrdinal([...snapshots.map((s) => s.tier), ...ranked.map((r) => r.tier)]),
	};
}

/** One all-time result per milestone, in definition order. */
export function evaluateMilestones(inputs: MilestoneInputs): ProgressResult[] {
	const values = milestoneValues(inputs);
	return MILESTONES.map((def) => {
		const value = values[def.id];
		return { achievementId: def.id, scope: ALL_TIME_SCOPE, value, tier: tierFor(value, def.thresholds) };
	});
}
