export interface AchievementDef {
	id: string;
	name: string;
	description: string;
	icon: string; // filename in public/achi/ → e.g. "pentakill" → /achi/pentakill.svg
	category: "combat" | "mastery" | "rank" | "playstyle";
}

export const ACHIEVEMENTS: AchievementDef[] = [
	// Combat
	{
		id: "pentakill",
		name: "Pentakill",
		description: "Got a pentakill in your last 10 matches",
		icon: "pentakill",
		category: "combat",
	},
	{
		id: "perfect-kda",
		name: "Untouchable",
		description: "0 deaths with 3+ K+A in your last 10 matches",
		icon: "perfect-kda",
		category: "combat",
	},
	{
		id: "kda-god",
		name: "KDA God",
		description: "Average KDA of 5+ over your last 10 matches",
		icon: "kda-god",
		category: "combat",
	},
	{
		id: "first-blood-hunter",
		name: "First Blood Hunter",
		description: "Got first blood in 5+ of your last 10 matches",
		icon: "first-blood-hunter",
		category: "combat",
	},
	{
		id: "feeder",
		name: "Feeder",
		description: "Averaging 10+ deaths per game in your last 10 matches",
		icon: "feeder",
		category: "combat",
	},
	// Mastery
	{
		id: "cs-machine",
		name: "CS Machine",
		description: "8+ CS/min in a 25+ min game (last 10 matches)",
		icon: "cs-machine",
		category: "mastery",
	},
	{
		id: "vision-pro",
		name: "Vision Pro",
		description: "Vision score of 100+ in your last 5 matches",
		icon: "vision-pro",
		category: "mastery",
	},
	{
		id: "damage-dealer",
		name: "Damage Dealer",
		description: "40k+ damage to champions in your last 10 matches",
		icon: "damage-dealer",
		category: "mastery",
	},
	{
		id: "carry",
		name: "Carry",
		description: "50%+ of team damage in a match (last 10)",
		icon: "carry",
		category: "mastery",
	},
	{
		id: "tank",
		name: "Tank",
		description: "Took 50k+ damage in your last 10 matches",
		icon: "tank",
		category: "mastery",
	},
	{
		id: "objective-hunter",
		name: "Objective Hunter",
		description: "3+ dragon kills in a match (last 10)",
		icon: "objective-hunter",
		category: "mastery",
	},
	// Playstyle
	{
		id: "one-trick",
		name: "One Trick",
		description: "70%+ of your last 10 matches on one champion",
		icon: "one-trick",
		category: "playstyle",
	},
	{
		id: "diverse-player",
		name: "Diverse Player",
		description: "5+ different champions in your last 10 matches",
		icon: "diverse-player",
		category: "playstyle",
	},
	{
		id: "win-streak",
		name: "On Fire",
		description: "Won all of your last 5 matches",
		icon: "win-streak",
		category: "playstyle",
	},
	{
		id: "lose-streak",
		name: "Tilted",
		description: "Lost all of your last 5 matches",
		icon: "lose-streak",
		category: "playstyle",
	},
	// Rank
	{
		id: "diamond-plus",
		name: "Diamond+",
		description: "Reached Diamond rank or above",
		icon: "diamond-plus",
		category: "rank",
	},
	{
		id: "master-plus",
		name: "Master+",
		description: "Reached Master rank or above",
		icon: "master-plus",
		category: "rank",
	},
	{
		id: "challenger",
		name: "Challenger",
		description: "Reached Challenger rank",
		icon: "challenger",
		category: "rank",
	},
	// Role
	{
		id: "top-main",
		name: "Top Main",
		description: "Most played role is Top (last 50 matches)",
		icon: "top-main",
		category: "playstyle",
	},
	{
		id: "jungle-main",
		name: "Jungle Main",
		description: "Most played role is Jungle (last 50 matches)",
		icon: "jungle-main",
		category: "playstyle",
	},
	{
		id: "mid-main",
		name: "Mid Main",
		description: "Most played role is Mid (last 50 matches)",
		icon: "mid-main",
		category: "playstyle",
	},
	{
		id: "adc-main",
		name: "ADC Main",
		description: "Most played role is ADC (last 50 matches)",
		icon: "adc-main",
		category: "playstyle",
	},
	{
		id: "support-main",
		name: "Support Main",
		description: "Most played role is Support (last 50 matches)",
		icon: "support-main",
		category: "playstyle",
	},
	// Queue Enjoyer
	{
		id: "soloq-enjoyer",
		name: "Solo/Duo Enjoyer",
		description: "12+ Solo/Duo games in your last 25 matches",
		icon: "soloq-enjoyer",
		category: "playstyle",
	},
	{
		id: "flex-enjoyer",
		name: "Flex Enjoyer",
		description: "12+ Flex games in your last 25 matches",
		icon: "flex-enjoyer",
		category: "playstyle",
	},
	{
		id: "normal-enjoyer",
		name: "Normal Enjoyer",
		description: "12+ non-ranked games in your last 25 matches",
		icon: "normal-enjoyer",
		category: "playstyle",
	},
];

export function getAchievementById(id: string): AchievementDef | undefined {
	return ACHIEVEMENTS.find((a) => a.id === id);
}
