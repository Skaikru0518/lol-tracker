let cachedVersion: string | null = null;

export async function getDDragonVersion(): Promise<string> {
	if (cachedVersion) return cachedVersion;

	const res = await fetch(
		"https://ddragon.leagueoflegends.com/api/versions.json",
	);
	const versions: string[] = await res.json();
	cachedVersion = versions[0];
	return cachedVersion;
}

export function getSummonerIcon(version: string, iconId: number) {
	return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${iconId}.png`;
}

export function getChampionIcon(version: string, championName: string) {
	return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championName}.png`;
}

export function getItemIcon(version: string, itemId: number) {
	if (itemId === 0) return null;
	return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`;
}

export function getRankEmblem(tier: string) {
	return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/${tier.toLowerCase()}.png`;
}

export const RANK_COLORS: Record<string, string> = {
	IRON: "#6b6b6b",
	BRONZE: "#a17c5a",
	SILVER: "#8fa0b0",
	GOLD: "#daa520",
	PLATINUM: "#4dc8b4",
	EMERALD: "#2ecc71",
	DIAMOND: "#5b8bf5",
	MASTER: "#9b59b6",
	GRANDMASTER: "#e74c3c",
	CHALLENGER: "#f1c40f",
};

export interface Champion {
	id: string;
	key: string;
	name: string;
}

let cachedChampions: Record<number, Champion> | null = null;

export async function getChampionMap(
	version: string,
): Promise<Record<number, Champion>> {
	if (cachedChampions) return cachedChampions;

	const res = await fetch(
		`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`,
	);
	if (!res.ok) throw new Error("Failed to fetch champions");
	const data = await res.json();

	const map: Record<number, Champion> = {};
	for (const champ of Object.values(data.data) as Champion[]) {
		map[parseInt(champ.key)] = champ;
	}
	cachedChampions = map;
	return map;
}
