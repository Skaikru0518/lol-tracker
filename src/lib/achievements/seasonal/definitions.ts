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
	{ id: "pool-party", name: "Pool Party", description: "Play 20 different champions in ranked this season", icon: "pool-party", color: "#16a085", thresholds: [20], display: "count" },
	{ id: "role-swap", name: "Role Swap", description: "Win a ranked game in all five positions this season", icon: "role-swap", color: "#1abc9c", thresholds: [5], display: "count" },
	{ id: "spotless", name: "Spotless", description: "Finish 10 ranked games without dying this season", icon: "spotless", color: "#f1c40f", thresholds: [10], display: "count" },
	{ id: "stomper", name: "Stomper", description: "Win 5 ranked games in under 20 minutes this season", icon: "stomper", color: "#e67e22", thresholds: [5], display: "count" },
	{ id: "marathon", name: "Marathon", description: "Win a ranked game that lasted over 40 minutes this season", icon: "marathon", color: "#8e44ad", thresholds: [1], display: "count" },
	{ id: "comeback-kid", name: "Comeback Kid", description: "Win a ranked game right after losing 5 in a row this season", icon: "comeback-kid", color: "#2ecc71", thresholds: [1], display: "count" },
	{ id: "season-penta", name: "Season Penta", description: "Get a pentakill in ranked this season", icon: "season-penta", color: "#e74c3c", thresholds: [1], display: "count" },
	{ id: "dedication", name: "Dedication", description: "Play ranked on 50 different days this season", icon: "dedication", color: "#3498db", thresholds: [50], display: "count" },
	{ id: "season-peak", name: "Season Peak", description: "Highest tier reached this season", icon: "season-peak", color: "#5b8bf5", thresholds: RANK_THRESHOLDS, display: "rank" },
];

export function getSeasonal(id: string): ProgressDef | undefined {
	return SEASONAL.find((s) => s.id === id);
}
