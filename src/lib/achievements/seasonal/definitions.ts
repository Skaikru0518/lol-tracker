import { RANK_THRESHOLDS } from "../milestones/definitions";
import { type ProgressDef } from "../progress/types";

/** Achievements of one ranked season; earned ones stay for that season. */
export const SEASONAL: ProgressDef[] = [
	{ id: "season-grinder", name: "Season Grinder", description: "Play 100 ranked games this season", icon: "season-grinder", color: "#95a5a6", thresholds: [100], display: "count" },
	{ id: "season-winner", name: "Season Winner", description: "Win 50 ranked games this season", icon: "season-winner", color: "#2ecc71", thresholds: [50], display: "count" },
	{ id: "iron-will", name: "Iron Will", description: "Keep a 55%+ win rate over 50+ ranked games this season", icon: "iron-will", color: "#7f8c8d", thresholds: [50], display: "count" },
	{ id: "hot-streak", name: "Hot Streak", description: "Win 7 ranked games in a row this season", icon: "hot-streak", color: "#e74c3c", thresholds: [7], display: "count" },
	{ id: "main-character", name: "Main Character", description: "Play 30 ranked games on one champion this season", icon: "main-character", color: "#e91e63", thresholds: [30], display: "count" },
	{ id: "promoted", name: "Promoted", description: "Climb at least one tier in a ranked queue this season", icon: "promoted", color: "#f1c40f", thresholds: [1], display: "count" },
	{ id: "triple-threat", name: "Triple Threat", description: "Be ranked in Solo, Flex and 5s this season", icon: "triple-threat", color: "#3498db", thresholds: [3], display: "count" },
	{ id: "season-peak", name: "Season Peak", description: "Highest tier reached this season", icon: "season-peak", color: "#5b8bf5", thresholds: RANK_THRESHOLDS, display: "rank" },
];

export function getSeasonal(id: string): ProgressDef | undefined {
	return SEASONAL.find((s) => s.id === id);
}
