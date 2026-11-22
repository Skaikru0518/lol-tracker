export interface MatchBadgeDef {
	id: string;
	name: string;
	description: string;
	color?: string;
}

export const MATCH_BADGES: MatchBadgeDef[] = [
	{
		id: "mvp",
		name: "MVP",
		description: "Highest performance score on the winning team",
		color: "#f1c40f",
	},
	{
		id: "ace",
		name: "ACE",
		description: "Highest performance score on the losing team",
		color: "#9b59b6",
	},
	{
		id: "damage-king",
		name: "Damage King",
		description: "Most damage dealt to champions in the match",
		color: "#e67e22",
	},
	{
		id: "tank-god",
		name: "Tank God",
		description:
			"Most damage taken and mitigated, without dying more than the team average",
		color: "#7f8c8d",
	},
	{
		id: "vision-king",
		name: "Vision King",
		description: "Highest vision score in the match (1.5+ per minute)",
		color: "#3498db",
	},
	{
		id: "cs-king",
		name: "CS King",
		description: "Most CS in the match (8+ per minute)",
		color: "#2ecc71",
	},
	{
		id: "first-blood",
		name: "First Blood",
		description: "Got the first kill of the match",
		color: "#c0392b",
	},
	{
		id: "pentakill",
		name: "Pentakill",
		description: "Got a pentakill",
		color: "#e74c3c",
	},
	{
		id: "unkillable",
		name: "Unkillable",
		description: "0 deaths with 3+ kills or assists",
		color: "#f1c40f",
	},
	{
		id: "cc-machine",
		name: "CC Machine",
		description: "Most crowd control time in the match",
		color: "#9b59b6",
	},
	{
		id: "quadrakill",
		name: "Quadrakill",
		description: "Got a quadrakill",
		color: "#e67e22",
	},
	{
		id: "solo-carry",
		name: "Solo Carry",
		description: "Dealt 35%+ of the winning team's damage to champions",
		color: "#f1c40f",
	},
	{
		id: "healer",
		name: "Healer",
		description: "Most healing and shielding on teammates (10k+)",
		color: "#2ecc71",
	},
	{
		id: "tower-destroyer",
		name: "Tower Destroyer",
		description: "Most turret kills in the match (2+)",
		color: "#e74c3c",
	},
	{
		id: "powerspike",
		name: "Powerspike",
		description: "Yasuo with 10+ deaths — the 0/10 powerspike is real",
		color: "#e74c3c",
	},
	{
		id: "soulless",
		name: "Soulless",
		description: "Picked Teemo — you monster",
		color: "#95a5a6",
	},
	{
		id: "glass-cannon",
		name: "Glass Cannon",
		description: "Most damage dealt and most deaths (5+) in the match",
		color: "#e74c3c",
	},
	{
		id: "afk-farmer",
		name: "AFK Farmer",
		description: "200+ CS but 0 kills and 0 assists",
		color: "#27ae60",
	},
	{
		id: "thief",
		name: "Thief",
		description: "Stole Baron, a Drake or the Herald",
		color: "#8e44ad",
	},
	{
		id: "siege-master",
		name: "Siege Master",
		description: "Most damage to buildings in the match (8k+)",
		color: "#d35400",
	},
	{
		id: "sweeper",
		name: "Sweeper",
		description: "Most wards destroyed in the match (10+)",
		color: "#16a085",
	},
	{
		id: "rampage",
		name: "Rampage",
		description: "A killing spree of 8 or more",
		color: "#c0392b",
	},
	{
		id: "survivor",
		name: "Survivor",
		description: "Stayed alive the longest in the match (15+ minutes)",
		color: "#27ae60",
	},
	{
		id: "grey-screen",
		name: "Grey Screen",
		description: "Spent a quarter of the game dead",
		color: "#7f8c8d",
	},
	{
		id: "surrendered",
		name: "Surrendered",
		description: "Lost a surrendered game with 10+ deaths",
		color: "#95a5a6",
	},
];

export function getMatchBadgeById(id: string): MatchBadgeDef | undefined {
	return MATCH_BADGES.find((b) => b.id === id);
}
