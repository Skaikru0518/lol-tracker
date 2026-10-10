import {
	type AchievementMatch,
	type AchievementParticipant,
} from "@/lib/validators/match";
import { isAchievementEligible } from "../eligibility";

interface DetectionInput {
	matches: AchievementMatch[];
	puuid: string;
}

const WINDOW = 10;
/** Fewest games an average-based achievement is judged on. */
const MIN_GAMES = 5;

const ROLE_ACHIEVEMENTS: Record<string, string> = {
	TOP: "top-main",
	JUNGLE: "jungle-main",
	MIDDLE: "mid-main",
	BOTTOM: "adc-main",
	UTILITY: "support-main",
};

function average<T>(items: T[], value: (item: T) => number): number {
	return items.reduce((sum, item) => sum + value(item), 0) / items.length;
}

/** Returns the Current form achievement IDs a player has earned from their ranked games (remakes excluded). */
export function detectAchievements(input: DetectionInput): string[] {
	const { puuid } = input;
	const allMatches = input.matches.filter((m) => isAchievementEligible(m.info.queueId, m.info.gameDuration));
	const earned: string[] = [];

	const allRecent: { match: AchievementMatch; player: AchievementParticipant }[] = [];
	for (const match of allMatches) {
		const player = match.info.participants.find((p) => p.puuid === puuid);
		if (player) allRecent.push({ match, player });
	}
	const recent = allRecent.slice(0, WINDOW);
	const players = recent.map((entry) => entry.player);

	if (players.length > 0) {
		// --- Combat ---

		if (players.slice(0, 5).some((p) => p.deaths === 0 && p.kills + p.assists >= 3)) {
			earned.push("perfect-kda");
		}

		if (players.length >= MIN_GAMES) {
			const kills = players.reduce((s, p) => s + p.kills, 0);
			const deaths = players.reduce((s, p) => s + p.deaths, 0);
			const assists = players.reduce((s, p) => s + p.assists, 0);
			const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths;
			if (kda >= 5) earned.push("kda-god");
		}

		if (players.filter((p) => p.firstBloodKill).length >= 5) earned.push("first-blood-hunter");

		if (players.length >= MIN_GAMES && average(players, (p) => p.deaths) >= 10) earned.push("feeder");

		// --- Mastery ---

		const csPerMin = recent
			.filter(({ match }) => match.info.gameDuration / 60 >= 25)
			.map(({ match, player }) => (player.totalMinionsKilled + player.neutralMinionsKilled) / (match.info.gameDuration / 60));
		if (csPerMin.length >= MIN_GAMES && average(csPerMin, (v) => v) >= 8) earned.push("cs-machine");

		if (players.length >= MIN_GAMES) {
			if (average(players, (p) => p.visionScore) >= 60) earned.push("vision-pro");
			if (average(players, (p) => p.totalDamageDealtToChampions) >= 40000) earned.push("damage-dealer");
			if (average(players, (p) => p.dragonKills + p.baronKills) >= 1.5) earned.push("objective-hunter");
		}

		const carried = recent.some(({ match, player }) => {
			const teamDamage = match.info.participants
				.filter((pp) => pp.teamId === player.teamId)
				.reduce((s, pp) => s + pp.totalDamageDealtToChampions, 0);
			return teamDamage > 0 && player.totalDamageDealtToChampions / teamDamage >= 0.5;
		});
		if (carried) earned.push("carry");

		if (players.some((p) => p.totalDamageTaken >= 50000)) earned.push("meatshield");

		// --- Playstyle ---

		const last20 = allRecent.slice(0, 20).map((entry) => entry.player);
		const champCounts = new Map<string, number>();
		for (const p of last20) champCounts.set(p.championName, (champCounts.get(p.championName) ?? 0) + 1);
		if (last20.length >= 10 && Math.max(...champCounts.values()) / last20.length >= 0.7) {
			earned.push("one-trick");
		}

		if (new Set(players.map((p) => p.championName)).size >= 5) earned.push("diverse-player");

		const last5 = players.slice(0, 5);
		if (last5.length === 5 && last5.every((p) => p.win)) earned.push("win-streak");
		if (last5.length === 5 && last5.every((p) => !p.win)) earned.push("lose-streak");

		// Role main looks at the whole loaded window, not just the last 10
		const roleCounts = new Map<string, number>();
		for (const { player: p } of allRecent) {
			if (p.teamPosition) roleCounts.set(p.teamPosition, (roleCounts.get(p.teamPosition) ?? 0) + 1);
		}
		const [first, second] = [...roleCounts.entries()].sort((a, b) => b[1] - a[1]);
		const roleAchi = first && ROLE_ACHIEVEMENTS[first[0]];
		if (roleAchi && first[1] !== second?.[1] && first[1] / allRecent.length >= 0.3) earned.push(roleAchi);

		// --- Queue Enjoyer (last 25) ---
		const last25 = allMatches.slice(0, 25);
		const queueCount = (queueId: number) => last25.filter((m) => m.info.queueId === queueId).length;
		if (queueCount(420) >= 13) earned.push("soloq-enjoyer");
		if (queueCount(440) >= 13) earned.push("flex-enjoyer");
		if (queueCount(710) >= 13) earned.push("premade-enjoyer");
	}

	return earned;
}
