import { useQuery } from "@tanstack/react-query";
import { newSkinsSchema, type NewSkins } from "@/lib/validators/new-skins";

/** Skins added in the current patch. */
export function useNewSkins() {
	return useQuery<NewSkins>({
		queryKey: ["new-skins"],
		queryFn: async () => {
			const res = await fetch("/api/new-skins");
			if (!res.ok) throw new Error("Failed to fetch new skins");
			return newSkinsSchema.parse(await res.json());
		},
		staleTime: 1000 * 60 * 60,
	});
}
