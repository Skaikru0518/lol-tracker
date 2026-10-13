import { type Role } from "./roles";

export const CATEGORIES = ["laning", "farming", "combat", "teamfight", "objectives", "vision"] as const;
export type CategoryId = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<CategoryId, string> = {
	laning: "Laning",
	farming: "Farming",
	combat: "Combat",
	teamfight: "Teamfight",
	objectives: "Objectives",
	vision: "Vision",
};

export const CATEGORY_SHORT_LABELS: Record<CategoryId, string> = {
	laning: "Lane",
	farming: "Farm",
	combat: "Combat",
	teamfight: "Teamfight",
	objectives: "Objective",
	vision: "Vision",
};

export const METRIC_IDS = [
	"goldDiffPerMin",
	"xpDiffPerMin",
	"csDiffPerMin",
	"damageDiffPerMin",
	"csPerMin",
	"goldPerMin",
	"kda",
	"deathsPerMin",
	"killParticipation",
	"damageShare",
	"damageTakenShare",
	"objectiveDamagePerMin",
	"epicKills",
	"structureKills",
	"steals",
	"visionPerMin",
	"wardsPlacedPerMin",
	"wardsKilledPerMin",
	"controlWards",
] as const;
export type MetricId = (typeof METRIC_IDS)[number];

export const CATEGORY_METRICS: Record<CategoryId, MetricId[]> = {
	laning: ["goldDiffPerMin", "xpDiffPerMin", "csDiffPerMin", "damageDiffPerMin"],
	farming: ["csPerMin", "goldPerMin"],
	combat: ["kda", "deathsPerMin", "killParticipation"],
	teamfight: ["damageShare", "damageTakenShare", "killParticipation"],
	objectives: ["objectiveDamagePerMin", "epicKills", "structureKills", "steals"],
	vision: ["visionPerMin", "wardsPlacedPerMin", "wardsKilledPerMin", "controlWards"],
};

export const LOWER_IS_BETTER: ReadonlySet<MetricId> = new Set(["deathsPerMin"]);

export const METRIC_LABELS: Record<MetricId, string> = {
	goldDiffPerMin: "Gold diff / min",
	xpDiffPerMin: "XP diff / min",
	csDiffPerMin: "CS diff / min",
	damageDiffPerMin: "Damage diff / min",
	csPerMin: "CS / min",
	goldPerMin: "Gold / min",
	kda: "KDA",
	deathsPerMin: "Deaths / min",
	killParticipation: "Kill participation",
	damageShare: "Team damage share",
	damageTakenShare: "Damage taken share",
	objectiveDamagePerMin: "Objective damage / min",
	epicKills: "Dragons and barons",
	structureKills: "Turrets and inhibitors",
	steals: "Objective steals",
	visionPerMin: "Vision score / min",
	wardsPlacedPerMin: "Wards placed / min",
	wardsKilledPerMin: "Wards killed / min",
	controlWards: "Control wards",
};

export const ROLE_WEIGHTS: Record<Role, Record<CategoryId, number>> = {
	TOP: { laning: 25, farming: 15, combat: 20, teamfight: 20, objectives: 15, vision: 5 },
	JUNGLE: { laning: 10, farming: 15, combat: 20, teamfight: 20, objectives: 25, vision: 10 },
	MIDDLE: { laning: 25, farming: 15, combat: 25, teamfight: 20, objectives: 10, vision: 5 },
	BOTTOM: { laning: 20, farming: 25, combat: 20, teamfight: 20, objectives: 10, vision: 5 },
	UTILITY: { laning: 15, farming: 5, combat: 15, teamfight: 30, objectives: 10, vision: 25 },
};
