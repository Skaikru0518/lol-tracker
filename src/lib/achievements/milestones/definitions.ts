import { type ProgressDef } from "../progress/types";

/** Emerald, Diamond, Master, Grandmaster+ as rank tier ordinals. */
export const RANK_THRESHOLDS = [5, 6, 7, 8] as const;

/** All-time, tiered achievements over stored ranked games; they never go down. */
export const MILESTONES: ProgressDef[] = [
	{ id: "veteran", name: "Veteran", description: "Ranked games played", icon: "veteran", color: "#95a5a6", thresholds: [100, 500, 1500, 3000], display: "count" },
	{ id: "winner", name: "Winner", description: "Ranked games won", icon: "winner", color: "#2ecc71", thresholds: [50, 250, 750, 1500], display: "count" },
	{ id: "time-served", name: "Time Served", description: "Hours spent in ranked games", icon: "time-served", color: "#7f8c8d", thresholds: [100, 400, 1000, 2000], display: "count" },
	{ id: "pentakiller", name: "Pentakiller", description: "Pentakills in ranked games", icon: "pentakiller", color: "#e74c3c", thresholds: [1, 5, 20, 50], display: "count" },
	{ id: "multikiller", name: "Multikiller", description: "Quadrakills in ranked games", icon: "multikiller", color: "#e67e22", thresholds: [5, 25, 100, 250], display: "count" },
	{ id: "legendary", name: "Legendary", description: "Ranked games with a killing spree of 8 or more", icon: "legendary", color: "#f39c12", thresholds: [1, 10, 30, 75], display: "count" },
	{ id: "slayer", name: "Slayer", description: "Kills in ranked games", icon: "slayer", color: "#c0392b", thresholds: [1000, 5000, 15000, 30000], display: "count" },
	{ id: "wingman", name: "Wingman", description: "Assists in ranked games", icon: "wingman", color: "#1abc9c", thresholds: [2000, 10000, 25000, 50000], display: "count" },
	{ id: "first-strike", name: "First Strike", description: "First bloods in ranked games", icon: "first-strike", color: "#c0392b", thresholds: [25, 100, 300, 600], display: "count" },
	{ id: "deathless", name: "Deathless", description: "Ranked games without dying", icon: "deathless", color: "#f1c40f", thresholds: [5, 25, 75, 150], display: "count" },
	{ id: "artillery", name: "Artillery", description: "Damage dealt to champions in ranked games", icon: "artillery", color: "#e67e22", thresholds: [2_000_000, 10_000_000, 30_000_000, 60_000_000], display: "points" },
	{ id: "guardian", name: "Guardian", description: "Healing and shielding on teammates in ranked games", icon: "guardian", color: "#2ecc71", thresholds: [500_000, 2_500_000, 7_500_000, 15_000_000], display: "points" },
	{ id: "gold-digger", name: "Gold Digger", description: "Gold earned in ranked games", icon: "gold-digger", color: "#f1c40f", thresholds: [1_000_000, 5_000_000, 15_000_000, 30_000_000], display: "points" },
	{ id: "farmer", name: "Farmer", description: "Minions and monsters killed in ranked games", icon: "farmer", color: "#27ae60", thresholds: [25_000, 100_000, 300_000, 600_000], display: "points" },
	{ id: "visionary", name: "Visionary", description: "Total vision score in ranked games", icon: "visionary", color: "#3498db", thresholds: [10_000, 50_000, 150_000, 300_000], display: "count" },
	{ id: "ward-keeper", name: "Ward Keeper", description: "Wards placed in ranked games", icon: "ward-keeper", color: "#3498db", thresholds: [1000, 5000, 15000, 30000], display: "count" },
	{ id: "ward-hunter", name: "Ward Hunter", description: "Wards destroyed in ranked games", icon: "ward-hunter", color: "#9b59b6", thresholds: [250, 1000, 3000, 6000], display: "count" },
	{ id: "demolisher", name: "Demolisher", description: "Turrets destroyed in ranked games", icon: "demolisher", color: "#e74c3c", thresholds: [50, 250, 750, 1500], display: "count" },
	{ id: "epic-hunter", name: "Epic Hunter", description: "Dragons and barons slain in ranked games", icon: "epic-hunter", color: "#8e44ad", thresholds: [50, 250, 750, 1500], display: "count" },
	{ id: "champion-pool", name: "Champion Pool", description: "Different champions with a ranked win", icon: "champion-pool", color: "#16a085", thresholds: [15, 35, 60, 100], display: "count" },
	{ id: "one-champ-army", name: "One Champ Army", description: "Ranked wins on your best champion", icon: "one-champ-army", color: "#e91e63", thresholds: [50, 150, 400, 800], display: "count" },
	{ id: "mastery-collector", name: "Mastery Collector", description: "Champions at mastery level 10 or higher", icon: "mastery-collector", color: "#9b59b6", thresholds: [3, 10, 25, 50], display: "count" },
	{ id: "devotion", name: "Devotion", description: "Mastery points on your most played champion", icon: "devotion", color: "#f39c12", thresholds: [250_000, 1_000_000, 2_500_000, 5_000_000], display: "points" },
	{ id: "peak-rank", name: "Peak Rank", description: "Highest tier reached in any ranked queue", icon: "peak-rank", color: "#5b8bf5", thresholds: RANK_THRESHOLDS, display: "rank" },
];

export function getMilestone(id: string): ProgressDef | undefined {
	return MILESTONES.find((m) => m.id === id);
}
