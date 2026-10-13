import { APEX_QUEUES, type ApexCache, type ApexCutoffs, type ApexQueue } from "@/lib/validators/apex";

export const CUTOFF_TTL_MS = 24 * 60 * 60 * 1000;

type FetchLowest = (tier: "grandmaster" | "challenger", queue: ApexQueue) => Promise<number | null>;

export function lowestLp(entries: { leaguePoints: number }[]): number | null {
	return entries.length ? Math.min(...entries.map((e) => e.leaguePoints)) : null;
}

export async function refreshCutoffs(cache: ApexCache, fetchLowest: FetchLowest, now: number): Promise<{ cache: ApexCache; changed: boolean }> {
	const next: ApexCache = { ...cache };
	let changed = false;
	for (const queue of APEX_QUEUES) {
		const cached = cache[queue];
		if (cached && now - cached.fetchedAt < CUTOFF_TTL_MS) continue;
		try {
			const grandmaster = await fetchLowest("grandmaster", queue);
			const challenger = await fetchLowest("challenger", queue);
			if (grandmaster === null || challenger === null) continue;
			next[queue] = { grandmaster, challenger, fetchedAt: now };
			changed = true;
		} catch {
			// A stale cut-off is still far better than none
		}
	}
	return { cache: next, changed };
}

export function toCutoffs(cache: ApexCache): ApexCutoffs {
	return Object.fromEntries(Object.entries(cache).map(([queue, { grandmaster, challenger }]) => [queue, { grandmaster, challenger }]));
}
