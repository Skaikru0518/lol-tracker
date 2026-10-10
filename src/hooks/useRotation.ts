import { useQuery } from "@tanstack/react-query";
import { type FreeRotation } from "@/lib/validators/rotation";

async function fetchRotation(): Promise<FreeRotation> {
	const res = await fetch("/api/rotation");
	if (!res.ok) throw new Error("Failed to fetch free rotation");
	return res.json();
}

/** Current free champion rotation. */
export function useRotation() {
	return useQuery<FreeRotation>({
		queryKey: ["rotation"],
		queryFn: fetchRotation,
		staleTime: 1000 * 60 * 60,
	});
}
