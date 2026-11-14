import { loadRarity } from "@/lib/achievements/progress/rarity";
import { decodeSlug, parseSummonerSlug } from "@/lib/game/riot-id";
import { prisma } from "@/lib/server/db";
import { sameText } from "@/lib/summoner/profile/account";
import { buildAchievementCard, type AchievementCard } from "./achievement-card";

/** The achievement card from the database; `tier` defaults to the player's current tier. */
export async function loadAchievementCard(puuid: string, achievementId: string, scope: string, tier?: number): Promise<{ card: AchievementCard; complete: boolean } | null> {
	const [row, account, rarity] = await Promise.all([
		prisma.achievementProgress.findUnique({ where: { puuid_achievementId_scope: { puuid, achievementId, scope } }, select: { tier: true } }),
		prisma.account.findUnique({ where: { puuid }, select: { gameName: true, tagLine: true } }),
		loadRarity(),
	]);
	if (!row || !account?.gameName) return null;
	const card = buildAchievementCard(achievementId, scope, tier ?? row.tier, row, rarity, `${account.gameName}#${account.tagLine}`);
	return card ? { card, complete: card.rarity !== null } : null;
}

/** Stored account for a profile slug, without asking Riot. */
export async function puuidForSlug(slug: string): Promise<string | null> {
	const { gameName, tagLine } = parseSummonerSlug(decodeSlug(slug));
	if (!gameName || !tagLine) return null;
	const account = await prisma.account.findFirst({ where: { gameName: sameText(gameName), tagLine: sameText(tagLine) }, select: { puuid: true } });
	return account?.puuid ?? null;
}
