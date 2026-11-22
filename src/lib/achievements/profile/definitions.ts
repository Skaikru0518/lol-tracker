export interface AchievementDef {
	id: string;
	name: string;
	description: string;
	icon: string; // filename in public/achi/ → e.g. "carry" → /achi/carry.svg
	color: string; // hex color for badge text
	category: "combat" | "mastery" | "playstyle";
}

export const ACHIEVEMENTS: AchievementDef[] = [
	// Combat
	{
		id: "perfect-kda",
		name: "Untouchable",
		description: "A game with 0 deaths and 3+ kills and assists in your last 5 ranked matches",
		icon: "perfect-kda",
		color: "#f1c40f",
		category: "combat",
	},
	{
		id: "kda-god",
		name: "KDA God",
		description: "Average KDA of 5+ over your last 10 ranked matches (5+ games)",
		icon: "kda-god",
		color: "#9b59b6",
		category: "combat",
	},
	{
		id: "first-blood-hunter",
		name: "First Blood Hunter",
		description: "Got first blood in 5+ of your last 10 ranked matches",
		icon: "first-blood-hunter",
		color: "#c0392b",
		category: "combat",
	},
	{
		id: "feeder",
		name: "Feeder",
		description: "Averaging 10+ deaths per game over your last 10 ranked matches (5+ games)",
		icon: "feeder",
		color: "#95a5a6",
		category: "combat",
	},
	// Mastery
	{
		id: "cs-machine",
		name: "CS Machine",
		description: "Average 8+ CS/min over your 25+ minute games in the last 10 ranked matches (5+ games)",
		icon: "cs-machine",
		color: "#2ecc71",
		category: "mastery",
	},
	{
		id: "vision-pro",
		name: "Vision Pro",
		description: "Average 60+ vision score over your last 10 ranked matches (5+ games)",
		icon: "vision-pro",
		color: "#3498db",
		category: "mastery",
	},
	{
		id: "damage-dealer",
		name: "Damage Dealer",
		description: "Average 40k+ damage to champions over your last 10 ranked matches (5+ games)",
		icon: "damage-dealer",
		color: "#e67e22",
		category: "mastery",
	},
	{
		id: "carry",
		name: "Carry",
		description: "Dealt 50%+ of your team's damage to champions in one of your last 10 ranked matches",
		icon: "carry",
		color: "#f39c12",
		category: "mastery",
	},
	{
		id: "meatshield",
		name: "Meatshield",
		description: "Took 50k+ damage in a single game in your last 10 ranked matches",
		icon: "tank",
		color: "#7f8c8d",
		category: "mastery",
	},
	{
		id: "objective-hunter",
		name: "Objective Hunter",
		description: "Average 1.5+ dragon and baron kills over your last 10 ranked matches (5+ games)",
		icon: "objective-hunter",
		color: "#8e44ad",
		category: "mastery",
	},
	// Playstyle
	{
		id: "one-trick",
		name: "OTP",
		description: "50%+ of your ranked games this season on one champion (10+ games)",
		icon: "one-trick",
		color: "#e91e63",
		category: "playstyle",
	},
	{
		id: "diverse-player",
		name: "Diverse Player",
		description: "5+ different champions in your last 10 ranked matches",
		icon: "diverse-player",
		color: "#1abc9c",
		category: "playstyle",
	},
	{
		id: "win-streak",
		name: "On Fire",
		description: "Won all of your last 5 ranked matches",
		icon: "win-streak",
		color: "#e74c3c",
		category: "playstyle",
	},
	{
		id: "lose-streak",
		name: "Tilted",
		description: "Lost all of your last 5 ranked matches",
		icon: "lose-streak",
		color: "#3498db",
		category: "playstyle",
	},
	// Role
	{
		id: "role-main",
		name: "Lane Main",
		description: "40%+ of your last 50 ranked matches in one role",
		icon: "role-main",
		color: "#8e44ad",
		category: "playstyle",
	},
	// Queue Enjoyer
	{
		id: "soloq-enjoyer",
		name: "Solo/Duo Enjoyer",
		description: "13+ Solo/Duo games in your last 25 ranked matches",
		icon: "soloq-enjoyer",
		color: "#f39c12",
		category: "playstyle",
	},
	{
		id: "flex-enjoyer",
		name: "Flex Enjoyer",
		description: "13+ Flex games in your last 25 ranked matches",
		icon: "flex-enjoyer",
		color: "#3498db",
		category: "playstyle",
	},
	{
		id: "premade-enjoyer",
		name: "5s Enjoyer",
		description: "13+ Ranked 5s games in your last 25 ranked matches",
		icon: "premade-enjoyer",
		color: "#9b59b6",
		category: "playstyle",
	},
];

export function getAchievementById(id: string): AchievementDef | undefined {
	return ACHIEVEMENTS.find((a) => a.id === id);
}
