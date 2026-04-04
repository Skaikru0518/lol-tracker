export interface MatchBadgeDef {
	id: string;
	name: string;
	description: string;
	icon?: string;
	color?: string;
}

export const MATCH_BADGES: MatchBadgeDef[] = [
	{
		id: "mvp",
		name: "MVP",
		description: "Most kills + assists on the winning team",
		icon: "mvp",
		color: "#f1c40f",
	},
	{
		id: "damage-king",
		name: "Damage King",
		description: "Most damage dealt to champions in the match",
		icon: "damage-king",
		color: "#e67e22",
	},
	{
		id: "tank-god",
		name: "Tank God",
		description: "Most damage taken in the match",
		icon: "tank-god",
		color: "#7f8c8d",
	},
	{
		id: "vision-king",
		name: "Vision King",
		description: "Highest vision score in the match",
		icon: "vision-king",
		color: "#3498db",
	},
	{
		id: "cs-king",
		name: "CS King",
		description: "Most CS in the match",
		icon: "cs-king",
		color: "#2ecc71",
	},
	{
		id: "first-blood",
		name: "First Blood",
		description: "Got the first kill of the match",
		icon: "first-blood",
		color: "#c0392b",
	},
	{
		id: "pentakill",
		name: "Pentakill",
		description: "Got a pentakill",
		icon: "pentakill-badge",
		color: "#e74c3c",
	},
	{
		id: "unkillable",
		name: "Unkillable",
		description: "0 deaths with 3+ kills or assists",
		icon: "unkillable",
		color: "#f1c40f",
	},
	{
		id: "gold-lead",
		name: "Gold Lead",
		description: "Most gold earned in the match",
		icon: "gold-lead",
		color: "#f39c12",
	},
	{
		id: "cc-machine",
		name: "CC Machine",
		description: "Most crowd control time in the match",
		icon: "cc-machine",
		color: "#9b59b6",
	},
	{
		id: "quadrakill",
		name: "Quadrakill",
		description: "Got a quadrakill",
		icon: "quadrakill",
		color: "#e67e22",
	},
	{
		id: "solo-carry",
		name: "Solo Carry",
		description: "Most kills and fewest deaths on the team",
		icon: "solo-carry",
		color: "#f1c40f",
	},
	{
		id: "healer",
		name: "Healer",
		description: "Most healing on teammates",
		icon: "healer",
		color: "#2ecc71",
	},
	{
		id: "tower-destroyer",
		name: "Tower Destroyer",
		description: "Most turret kills in the match",
		icon: "tower-destroyer",
		color: "#e74c3c",
	},
	{
		id: "bad-luck",
		name: "Bad Luck",
		description: "Best performer on the losing team",
		icon: "bad-luck",
		color: "#8e44ad",
	},
	{
		id: "powerspike",
		name: "Powerspike",
		description: "Yasuo with 10+ deaths — the 0/10 powerspike is real",
		icon: "powerspike",
		color: "#e74c3c",
	},
];

export function getMatchBadgeById(id: string): MatchBadgeDef | undefined {
	return MATCH_BADGES.find((b) => b.id === id);
}
