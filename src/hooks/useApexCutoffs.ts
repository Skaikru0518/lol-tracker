import { useQuery } from "@tanstack/react-query";
import { apexCutoffsSchema, type ApexCutoffs } from "@/lib/validators/apex";

async function fetchCutoffs(): Promise<ApexCutoffs> {
	const res = await fetch("/api/ranked/apex-cutoffs");
	if (!res.ok) throw new Error("Failed to fetch apex cut-offs");
	return apexCutoffsSchema.parse(await res.json());
}

export function useApexCutoffs() {
	return useQuery<ApexCutoffs>({ queryKey: ["apex-cutoffs"], queryFn: fetchCutoffs, staleTime: 60 * 60 * 1000 });
}
