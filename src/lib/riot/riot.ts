const RIOT_API_KEY = process.env.RIOT_API_KEY!;
export const BASE_URL = "https://eun1.api.riotgames.com";
export const EURPOE_URL = "https://europe.api.riotgames.com";

export class RiotApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
	}
}

export async function riotFetch<T>(
	url: string,
	revalidate: number = 60,
): Promise<T> {
	const res = await fetch(url, {
		headers: { "X-Riot-Token": RIOT_API_KEY },
		next: { revalidate },
	});

	if (!res.ok) {
		const messages: Record<number, string> = {
			401: "Invalid API key",
			403: "Forbidden",
			404: "Not Found",
			429: "Rate limit exceeded",
		};
		throw new RiotApiError(
			res.status,
			messages[res.status] ?? `Riot API error: ${res.status}`,
		);
	}

	return (await res.json()) as T;
}
