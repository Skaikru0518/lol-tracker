import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { achievementPayloadSchema, type AchievementPayload } from "@/lib/validators/achievements";

async function fetchAchievements(puuid: string): Promise<AchievementPayload> {
	const res = await fetch(`/api/achievements?puuid=${puuid}`);
	if (!res.ok) throw new Error("Failed to fetch achievements");
	return achievementPayloadSchema.parse(await res.json());
}

async function detectAndSave(puuid: string): Promise<AchievementPayload> {
	const res = await fetch("/api/achievements", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ puuid }),
	});
	if (!res.ok) throw new Error("Failed to detect achievements");
	return achievementPayloadSchema.parse(await res.json());
}

export function useAchievements(puuid: string | undefined) {
	return useQuery<AchievementPayload>({
		queryKey: ["achievements", puuid],
		queryFn: () => fetchAchievements(puuid!),
		staleTime: 1000 * 60 * 5,
		enabled: !!puuid,
	});
}

export function useDetectAchievements() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ puuid }: { puuid: string }) => detectAndSave(puuid),
		onSuccess: (data, { puuid }) => {
			queryClient.setQueryData(["achievements", puuid], data);
		},
	});
}
