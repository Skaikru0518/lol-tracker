import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SavedAchievement {
	achievementId: string;
	earnedAt: string;
}

async function fetchAchievements(puuid: string): Promise<SavedAchievement[]> {
	const res = await fetch(`/api/achievements?puuid=${puuid}`);
	if (!res.ok) throw new Error("Failed to fetch achievements");
	return res.json();
}

async function detectAndSave(puuid: string): Promise<SavedAchievement[]> {
	const res = await fetch("/api/achievements", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ puuid }),
	});
	if (!res.ok) throw new Error("Failed to detect achievements");
	return res.json();
}

export function useAchievements(puuid: string | undefined) {
	return useQuery<SavedAchievement[]>({
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
