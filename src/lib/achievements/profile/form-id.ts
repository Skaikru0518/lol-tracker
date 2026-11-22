import { getChampionDisplayName } from "@/lib/game/icon-helpers";
import { ACHIEVEMENTS, getAchievementById, type AchievementDef } from "./definitions";

// Parameterised Current form ids carry their subject after the definition id: `one-trick:Nami`, `role-main:MIDDLE:64` (season win rate)
export const MAIN_ROLES: Record<string, { name: string; icon: string; color: string }> = {
	TOP: { name: "Top", icon: "top-main", color: "#e67e22" },
	JUNGLE: { name: "Jungle", icon: "jungle-main", color: "#27ae60" },
	MIDDLE: { name: "Mid", icon: "mid-main", color: "#8e44ad" },
	BOTTOM: { name: "ADC", icon: "adc-main", color: "#e74c3c" },
	UTILITY: { name: "Support", icon: "support-main", color: "#2ecc71" },
};

export function resolveFormAchievement(savedId: string): AchievementDef | undefined {
	const [id, subject, share] = savedId.split(":");
	const def = getAchievementById(id);
	const parameterised = id === "one-trick" || id === "role-main";
	if (!def || parameterised !== (subject !== undefined)) return undefined;
	if (id === "one-trick") return { ...def, name: `${getChampionDisplayName(subject)} OTP` };
	if (id === "role-main") {
		const role = MAIN_ROLES[subject];
		return role && { ...def, name: share === undefined ? `${role.name} Main` : `${role.name} Main · ${share}% WR`, icon: role.icon, color: role.color };
	}
	return def;
}

/** Earned Current form achievements keyed by definition id, in definition order; unknown or retired ids are dropped. */
export function earnedForm(savedIds: string[]): Map<string, AchievementDef> {
	const resolved = savedIds.flatMap((saved) => resolveFormAchievement(saved) ?? []);
	return new Map(ACHIEVEMENTS.flatMap((def) => resolved.filter((a) => a.id === def.id).map((a) => [def.id, a] as const)));
}

/** Appends the season win rate on the main role (`role-main:UTILITY` → `role-main:UTILITY:56`); other ids pass through. */
export function withRoleWinRate(id: string, seasonGames: { teamPosition: string; win: boolean }[]): string {
	const [base, role] = id.split(":");
	if (base !== "role-main") return id;
	const games = seasonGames.filter((g) => g.teamPosition === role);
	return games.length ? `${id}:${Math.round((games.filter((g) => g.win).length / games.length) * 100)}` : id;
}
