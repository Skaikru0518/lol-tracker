import { APEX_QUEUES, type ApexCache, type ApexCutoffs, type ApexQueue } from "@/lib/validators/apex";

export const CUTOFF_TTL_MS = 24 * 60 * 60 * 1000;
export const RETRY_AFTER_MS = 15 * 60 * 1000;

export type CutoffAttempts = Partial<Record<ApexQueue, number>>;
type FetchLowest = (tier: "grandmaster" | "challenger", queue: ApexQueue) => Promise<number | null>;

export function lowestLp(entries: { leaguePoints: number }[]): number | null {
	return entries.length ? Math.min(...entries.map((e) => e.leaguePoints)) : null;
}

export async function refreshCutoffs(
	cache: ApexCache,
	attempts: CutoffAttempts,
	fetchLowest: FetchLowest,
	now: number,
	{ force = false }: { force?: boolean } = {},
): Promise<{ cache: ApexCache; attempts: CutoffAttempts; changed: boolean }> {
	const next: ApexCache = { ...cache };
	const tried: CutoffAttempts = { ...attempts };
	let changed = false;
	for (const queue of APEX_QUEUES) {
		const cached = cache[queue];
		if (!force && cached && now - cached.fetchedAt < CUTOFF_TTL_MS) continue;
		const lastTry = tried[queue];
		// Failures and empty leagues (season start) wait before Riot is asked again
		if (!force && lastTry !== undefined && now - lastTry < RETRY_AFTER_MS) continue;
		try {
			const [grandmaster, challenger] = await Promise.all([fetchLowest("grandmaster", queue), fetchLowest("challenger", queue)]);
			if (grandmaster === null || challenger === null) {
				tried[queue] = now;
				continue;
			}
			next[queue] = { grandmaster, challenger, fetchedAt: now };
			delete tried[queue];
			changed = true;
		} catch {
			tried[queue] = now;
		}
	}
	return { cache: next, attempts: tried, changed };
}

export function toCutoffs(cache: ApexCache): ApexCutoffs {
	return Object.fromEntries(Object.entries(cache).map(([queue, { grandmaster, challenger }]) => [queue, { grandmaster, challenger }]));
}
