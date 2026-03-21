import { Account } from "@/lib/validators/summoner";
import { useQuery } from "@tanstack/react-query";

async function fetchAccount(gameName: string, tagLine: string) {
	const res = await fetch(
		`/api/account?gameName=${gameName}&tagLine=${tagLine}`,
	);
	if (!res.ok) throw new Error("Account not found");
	return res.json();
}

export function useAccount(gameName: string, tagLine: string) {
	return useQuery<Account>({
		queryKey: ["account", gameName, tagLine],
		queryFn: () => fetchAccount(gameName, tagLine),
		staleTime: 1000 * 60 * 30,
		enabled: !!gameName && !!tagLine,
	});
}
