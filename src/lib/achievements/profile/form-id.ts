import { getChampionDisplayName } from "@/lib/game/icon-helpers";
import { ACHIEVEMENTS, getAchievementById, type AchievementDef } from "./definitions";

// Parameterised Current form ids carry their subject after the definition id: `one-trick:Nami`, `role-main:MIDDLE:64`
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
		return role && { ...def, name: `${role.name} Main · ${share}%`, icon: role.icon, color: role.color };
	}
	return def;
}

/** Earned Current form achievements keyed by definition id, in definition order; unknown or retired ids are dropped. */
export function earnedForm(savedIds: string[]): Map<string, AchievementDef> {
	const resolved = savedIds.flatMap((saved) => resolveFormAchievement(saved) ?? []);
	return new Map(ACHIEVEMENTS.flatMap((def) => resolved.filter((a) => a.id === def.id).map((a) => [def.id, a] as const)));
}
