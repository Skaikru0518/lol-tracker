import { type ProgressDef } from "../progress/types";

/** Emerald, Diamond, Master, Grandmaster+ as rank tier ordinals. */
export const RANK_THRESHOLDS = [5, 6, 7, 8] as const;

/** All-time, tiered achievements over stored ranked games; they never go down. */
export const MILESTONES: ProgressDef[] = [
	{ id: "veteran", name: "Veteran", description: "Ranked games played", icon: "veteran", color: "#95a5a6", thresholds: [50, 200, 500, 1000], display: "count" },
	{ id: "winner", name: "Winner", description: "Ranked games won", icon: "winner", color: "#2ecc71", thresholds: [25, 100, 250, 500], display: "count" },
	{ id: "pentakiller", name: "Pentakiller", description: "Pentakills in ranked games", icon: "pentakiller", color: "#e74c3c", thresholds: [1, 5, 15, 30], display: "count" },
	{ id: "multikiller", name: "Multikiller", description: "Quadrakills in ranked games", icon: "multikiller", color: "#e67e22", thresholds: [5, 25, 75, 150], display: "count" },
	{ id: "slayer", name: "Slayer", description: "Kills in ranked games", icon: "slayer", color: "#c0392b", thresholds: [500, 2000, 5000, 10000], display: "count" },
	{ id: "wingman", name: "Wingman", description: "Assists in ranked games", icon: "wingman", color: "#1abc9c", thresholds: [1000, 4000, 10000, 20000], display: "count" },
	{ id: "visionary", name: "Visionary", description: "Total vision score in ranked games", icon: "visionary", color: "#3498db", thresholds: [5000, 20000, 50000, 100000], display: "count" },
	{ id: "demolisher", name: "Demolisher", description: "Turrets destroyed in ranked games", icon: "demolisher", color: "#e74c3c", thresholds: [25, 100, 250, 500], display: "count" },
	{ id: "epic-hunter", name: "Epic Hunter", description: "Dragons and barons slain in ranked games", icon: "epic-hunter", color: "#8e44ad", thresholds: [25, 100, 250, 500], display: "count" },
	{ id: "champion-pool", name: "Champion Pool", description: "Different champions with a ranked win", icon: "champion-pool", color: "#16a085", thresholds: [10, 25, 50, 80], display: "count" },
	{ id: "one-champ-army", name: "One Champ Army", description: "Ranked wins on your best champion", icon: "one-champ-army", color: "#e91e63", thresholds: [25, 75, 150, 300], display: "count" },
	{ id: "mastery-collector", name: "Mastery Collector", description: "Champions at mastery level 10 or higher", icon: "mastery-collector", color: "#9b59b6", thresholds: [1, 5, 10, 20], display: "count" },
	{ id: "devotion", name: "Devotion", description: "Mastery points on your most played champion", icon: "devotion", color: "#f39c12", thresholds: [100_000, 500_000, 1_000_000, 2_000_000], display: "points" },
	{ id: "peak-rank", name: "Peak Rank", description: "Highest tier reached in any ranked queue", icon: "peak-rank", color: "#5b8bf5", thresholds: RANK_THRESHOLDS, display: "rank" },
];

export function getMilestone(id: string): ProgressDef | undefined {
	return MILESTONES.find((m) => m.id === id);
}
