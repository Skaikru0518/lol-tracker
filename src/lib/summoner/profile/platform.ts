import { prisma } from "@/lib/server/db";
import { DEFAULT_PLATFORM, storedPlatform, type Platform } from "@/lib/game/platforms";

export async function platformOf(puuid: string): Promise<Platform> {
	const account = await prisma.account.findUnique({ where: { puuid }, select: { platform: true } });
	return storedPlatform(account?.platform) ?? DEFAULT_PLATFORM;
}
