import { rarityText } from "@/lib/achievements/display";
import { getMilestone } from "@/lib/achievements/milestones/definitions";
import { ALL_TIME_SCOPE } from "@/lib/achievements/progress/types";
import { getSeasonal } from "@/lib/achievements/seasonal/definitions";
import { TIER_NAMES, tierColor } from "@/lib/achievements/tiers";
import { type Rarity } from "@/lib/validators/achievements";

const NUMERALS = ["I", "II", "III", "IV"];

export interface AchievementCard {
	id: string;
	name: string;
	description: string;
	icon: string;
	tier: number;
	maxTier: number;
	tierName: string | null;
	color: string;
	scope: string;
	rarity: string | null;
	rarityShare: number | null;
	riotId: string;
}

/** The card for one reached tier; null for an unknown achievement or a tier the player has not reached. */
export function buildAchievementCard(achievementId: string, scope: string, tier: number, row: { tier: number } | undefined, rarity: Rarity | null, riotId: string): AchievementCard | null {
	const def = scope === ALL_TIME_SCOPE ? getMilestone(achievementId) : getSeasonal(achievementId);
	if (!def || tier < 1 || !row || row.tier < tier) return null;
	const maxTier = def.thresholds.length;
	return {
		id: def.id,
		name: def.name,
		description: def.description,
		icon: def.icon,
		tier,
		maxTier,
		tierName: maxTier > 1 ? TIER_NAMES[tier - 1] : null,
		color: tierColor(tier, maxTier),
		scope,
		rarity: rarityText(rarity, def.id, scope, tier),
		rarityShare: rarity?.shares[`${def.id}:${scope}`]?.[tier - 1] ?? null,
		riotId,
	};
}

export function achievementMetadata(card: AchievementCard): { title: string; description: string } {
	const tier = card.maxTier > 1 ? ` ${NUMERALS[card.tier - 1]}` : "";
	return { title: `${card.riotId} unlocked ${card.name}${tier}`, description: card.description };
}

const RARE_SHARE = 0.1;

export function rarityLine(rarity: string, share: number | null): string {
	return `${share !== null && share < RARE_SHARE ? "Only " : ""}${rarity} on Summon.gg have it`;
}
