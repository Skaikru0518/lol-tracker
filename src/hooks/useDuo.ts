import { useQuery } from "@tanstack/react-query";
import { duoCompareSchema, duoPartnersSchema, type DuoComparePayload, type DuoPartnerPayload } from "@/lib/validators/duo";

const STALE_MS = 5 * 60 * 1000;

async function fetchParsed<T>(url: string, parse: (value: unknown) => T): Promise<T> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch ${url}`);
	return parse(await res.json());
}

export function useDuoPartners(puuid: string) {
	return useQuery<DuoPartnerPayload[]>({
		queryKey: ["duo", puuid],
		queryFn: () => fetchParsed(`/api/duo?${new URLSearchParams({ puuid })}`, (v) => duoPartnersSchema.parse(v)),
		staleTime: STALE_MS,
	});
}

export function useDuoCompare(puuid: string, friend: string | null) {
	return useQuery<DuoComparePayload>({
		queryKey: ["duo-compare", puuid, friend],
		queryFn: () => fetchParsed(`/api/duo/compare?${new URLSearchParams({ puuid, with: friend! })}`, (v) => duoCompareSchema.parse(v)),
		enabled: !!friend,
		staleTime: STALE_MS,
	});
}
