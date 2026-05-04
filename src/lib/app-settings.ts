import { prisma } from "@/lib/db";

export async function getAppSetting(key: string): Promise<string | null> {
	try {
		const setting = await prisma.appSettings.findUnique({
			where: { key },
		});
		console.log(`[app-settings] ${key} =`, setting?.value);
		return setting?.value ?? null;
	} catch (err) {
		console.error(`[app-settings] error reading ${key}:`, err);
		return null;
	}
}

export async function setAppSetting(key: string, value: string): Promise<void> {
	await prisma.appSettings.upsert({
		where: { key },
		update: { value },
		create: { key, value },
	});
}

export async function isMaintenanceMode(): Promise<boolean> {
	const value = await getAppSetting("MAINTENANCE_MODE");
	return value === "true";
}
