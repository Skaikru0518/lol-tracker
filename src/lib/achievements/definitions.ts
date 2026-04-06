export interface AchievementDef {
	id: string;
	name: string;
	description: string;
	icon: string; // filename in public/achi/ → e.g. "pentakill" → /achi/pentakill.svg
	color: string; // hex color for badge text
	category: "combat" | "mastery" | "rank" | "playstyle";
}

export const ACHIEVEMENTS: AchievementDef[] = [
	// Combat
	{
		id: "pentakill",
		name: "Pentakill",
		description: "Got a pentakill in your last 10 matches",
		icon: "pentakill",
		color: "#e74c3c",
		category: "combat",
	},
	{
		id: "perfect-kda",
		name: "Untouchable",
		description: "0 deaths with 3+ K+A in your last 5 matches",
		icon: "perfect-kda",
		color: "#f1c40f",
		category: "combat",
	},
	{
		id: "kda-god",
		name: "KDA God",
		description: "Average KDA of 5+ over your last 10 matches",
		icon: "kda-god",
		color: "#9b59b6",
		category: "combat",
	},
	{
		id: "first-blood-hunter",
		name: "First Blood Hunter",
		description: "Got first blood in 5+ of your last 10 matches",
		icon: "first-blood-hunter",
		color: "#c0392b",
		category: "combat",
	},
	{
		id: "feeder",
		name: "Feeder",
		description: "Averaging 10+ deaths per game in your last 10 matches",
		icon: "feeder",
		color: "#95a5a6",
		category: "combat",
	},
	// Mastery
	{
		id: "cs-machine",
		name: "CS Machine",
		description: "Average 8+ CS/min across last 10 matches (25+ min games)",
		icon: "cs-machine",
		color: "#2ecc71",
		category: "mastery",
	},
	{
		id: "vision-pro",
		name: "Vision Pro",
		description: "Average 60+ vision score over your last 10 matches",
		icon: "vision-pro",
		color: "#3498db",
		category: "mastery",
	},
	{
		id: "damage-dealer",
		name: "Damage Dealer",
		description: "Average 40k+ damage to champions over your last 10 matches",
		icon: "damage-dealer",
		color: "#e67e22",
		category: "mastery",
	},
	{
		id: "carry",
		name: "Carry",
		description: "50%+ of team damage in a match (last 10)",
		icon: "carry",
		color: "#f39c12",
		category: "mastery",
	},
	{
		id: "meatshield",
		name: "Meatshield",
		description: "Took 50k+ damage in your last 10 matches",
		icon: "tank",
		color: "#7f8c8d",
		category: "mastery",
	},
	{
		id: "objective-hunter",
		name: "Objective Hunter",
		description: "Average 3+ dragon kills over your last 10 matches",
		icon: "objective-hunter",
		color: "#8e44ad",
		category: "mastery",
	},
	// Playstyle
	{
		id: "one-trick",
		name: "One Trick",
		description: "70%+ of your last 20 matches on one champion",
		icon: "one-trick",
		color: "#e91e63",
		category: "playstyle",
	},
	{
		id: "diverse-player",
		name: "Diverse Player",
		description: "5+ different champions in your last 10 matches",
		icon: "diverse-player",
		color: "#1abc9c",
		category: "playstyle",
	},
	{
		id: "win-streak",
		name: "On Fire",
		description: "Won all of your last 5 matches",
		icon: "win-streak",
		color: "#e74c3c",
		category: "playstyle",
	},
	{
		id: "lose-streak",
		name: "Tilted",
		description: "Lost all of your last 5 matches",
		icon: "lose-streak",
		color: "#3498db",
		category: "playstyle",
	},
	// Rank
	{
		id: "diamond-plus",
		name: "Diamond+",
		description: "Reached Diamond rank or above",
		icon: "diamond-plus",
		color: "#5b8bf5",
		category: "rank",
	},
	{
		id: "master-plus",
		name: "Master+",
		description: "Reached Master rank or above",
		icon: "master-plus",
		color: "#9b59b6",
		category: "rank",
	},
	{
		id: "challenger",
		name: "Challenger",
		description: "Reached Challenger rank",
		icon: "challenger",
		color: "#f1c40f",
		category: "rank",
	},
	// Role
	{
		id: "top-main",
		name: "Top Main",
		description: "Most played role is Top (last 50 matches)",
		icon: "top-main",
		color: "#e67e22",
		category: "playstyle",
	},
	{
		id: "jungle-main",
		name: "Jungle Main",
		description: "Most played role is Jungle (last 50 matches)",
		icon: "jungle-main",
		color: "#27ae60",
		category: "playstyle",
	},
	{
		id: "mid-main",
		name: "Mid Main",
		description: "Most played role is Mid (last 50 matches)",
		icon: "mid-main",
		color: "#8e44ad",
		category: "playstyle",
	},
	{
		id: "adc-main",
		name: "ADC Main",
		description: "Most played role is ADC (last 50 matches)",
		icon: "adc-main",
		color: "#e74c3c",
		category: "playstyle",
	},
	{
		id: "support-main",
		name: "Support Main",
		description: "Most played role is Support (last 50 matches)",
		icon: "support-main",
		color: "#2ecc71",
		category: "playstyle",
	},
	// Queue Enjoyer
	{
		id: "soloq-enjoyer",
		name: "Solo/Duo Enjoyer",
		description: "13+ Solo/Duo games in your last 25 matches",
		icon: "soloq-enjoyer",
		color: "#f39c12",
		category: "playstyle",
	},
	{
		id: "flex-enjoyer",
		name: "Flex Enjoyer",
		description: "13+ Flex games in your last 25 matches",
		icon: "flex-enjoyer",
		color: "#3498db",
		category: "playstyle",
	},
	{
		id: "normal-enjoyer",
		name: "Normal Enjoyer",
		description: "13+ non-ranked games in your last 25 matches",
		icon: "normal-enjoyer",
		color: "#2ecc71",
		category: "playstyle",
	},
];

export function getAchievementById(id: string): AchievementDef | undefined {
	return ACHIEVEMENTS.find((a) => a.id === id);
}
