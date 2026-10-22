import { useQuery } from "@tanstack/react-query";
import { type Platform } from "@/lib/game/platforms";
import { apexCutoffsSchema, type ApexCutoffs } from "@/lib/validators/apex";

async function fetchCutoffs(platform: Platform): Promise<ApexCutoffs> {
	const res = await fetch(`/api/ranked/apex-cutoffs?${new URLSearchParams({ platform })}`);
	if (!res.ok) throw new Error("Failed to fetch apex cut-offs");
	return apexCutoffsSchema.parse(await res.json());
}

export function useApexCutoffs(platform: Platform) {
	return useQuery<ApexCutoffs>({ queryKey: ["apex-cutoffs", platform], queryFn: () => fetchCutoffs(platform), staleTime: 60 * 60 * 1000 });
}
