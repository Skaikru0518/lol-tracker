import { type Match, type Participant } from "@/lib/validators/match";
import { type RankedEntry } from "@/lib/validators/ranked";

interface DetectionInput {
	matches: Match[];
	puuid: string;
	ranked?: RankedEntry[];
}

const WINDOW = 10;

/** returns an array of achievement IDs the player has earned based on last 10 matches */
export function detectAchievements(input: DetectionInput): string[] {
	const { matches: allMatches, puuid, ranked } = input;
	const earned: string[] = [];

	// Only look at last 10 matches
	const recentMatches = allMatches.slice(0, WINDOW);

	const players: Participant[] = [];
	for (const match of recentMatches) {
		const p = match.info.participants.find((p) => p.puuid === puuid);
		if (p) players.push(p);
	}

	if (players.length === 0) return earned;

	// --- Combat ---

	// Pentakill
	if (players.some((p) => p.pentaKills > 0)) {
		earned.push("pentakill");
	}

	// Untouchable (0 deaths + 3+ K+A, last 5)
	const last5ForKda = players.slice(0, 5);
	if (last5ForKda.some((p) => p.deaths === 0 && p.kills + p.assists >= 3)) {
		earned.push("perfect-kda");
	}

	// KDA God (avg 5+ over last 10)
	if (players.length >= 5) {
		const totalKills = players.reduce((s, p) => s + p.kills, 0);
		const totalDeaths = players.reduce((s, p) => s + p.deaths, 0);
		const totalAssists = players.reduce((s, p) => s + p.assists, 0);

		const avgKDA =
			totalDeaths === 0
				? totalKills + totalAssists
				: (totalKills + totalAssists) / totalDeaths;

		if (avgKDA >= 5) {
			earned.push("kda-god");
		}
	}

	// First Blood Hunter (5+ first bloods)
	const firstBloods = players.filter((p) => p.firstBloodKill).length;
	if (firstBloods >= 5) earned.push("first-blood-hunter");

	// Feeder (avg 7+ deaths)
	const avgDeaths = players.reduce((s, p) => s + p.deaths, 0) / players.length;
	if (avgDeaths >= 10) earned.push("feeder");

	// --- Mastery ---

	// CS Machine (avg 8+ CS/min over last 10, only counting 25+ min games)
	const csMinGames: number[] = [];
	for (let i = 0; i < players.length; i++) {
		const match = recentMatches[i];
		if (match && match.info.gameDuration / 60 >= 25) {
			const p = players[i];
			csMinGames.push((p.totalMinionsKilled + p.neutralMinionsKilled) / (match.info.gameDuration / 60));
		}
	}
	if (csMinGames.length >= 3) {
		const avgCsMin = csMinGames.reduce((s, v) => s + v, 0) / csMinGames.length;
		if (avgCsMin >= 8) earned.push("cs-machine");
	}

	// Vision Pro (avg 80+ vision score, last 10)
	if (players.length >= 3) {
		const avgVision = players.reduce((s, p) => s + p.visionScore, 0) / players.length;
		if (avgVision >= 60) earned.push("vision-pro");
	}

	// Damage Dealer (avg 40k+ damage over last 10)
	if (players.length >= 3) {
		const avgDmg = players.reduce((s, p) => s + p.totalDamageDealtToChampions, 0) / players.length;
		if (avgDmg >= 40000) earned.push("damage-dealer");
	}

	// Carry (50%+ of team's total damage in a match)
	for (let i = 0; i < players.length; i++) {
		const p = players[i];
		const match = recentMatches[i];
		if (match) {
			const teamDamage = match.info.participants
				.filter((pp) => pp.teamId === p.teamId)
				.reduce((s, pp) => s + pp.totalDamageDealtToChampions, 0);
			if (teamDamage > 0 && p.totalDamageDealtToChampions / teamDamage >= 0.5) {
				earned.push("carry");
				break;
			}
		}
	}

	// Meatshield (50k+ damage taken)
	if (players.some((p) => p.totalDamageTaken >= 50000)) {
		earned.push("meatshield");
	}

	// Objective Hunter (avg 3+ dragon kills over last 10)
	if (players.length >= 3) {
		const avgDragons = players.reduce((s, p) => s + p.dragonKills, 0) / players.length;
		if (avgDragons >= 3) earned.push("objective-hunter");
	}

	// --- Playstyle ---

	// One-Trick (70%+ on one champ, last 20)
	const last20 = allMatches.slice(0, 20);
	const last20Players: Participant[] = [];
	for (const match of last20) {
		const p = match.info.participants.find((p) => p.puuid === puuid);
		if (p) last20Players.push(p);
	}
	const champCounts = new Map<string, number>();
	for (const p of last20Players) {
		champCounts.set(p.championName, (champCounts.get(p.championName) || 0) + 1);
	}
	const maxChampGames = Math.max(...champCounts.values());
	if (last20Players.length >= 10 && maxChampGames / last20Players.length >= 0.7) {
		earned.push("one-trick");
	}

	// Diverse Player (5+ different champs in 10 games)
	const champCounts10 = new Map<string, number>();
	for (const p of players) {
		champCounts10.set(p.championName, (champCounts10.get(p.championName) || 0) + 1);
	}
	if (champCounts10.size >= 5) {
		earned.push("diverse-player");
	}

	// Win/Lose Streak (last 5 matches)
	const last5 = players.slice(0, 5);
	if (last5.length === 5 && last5.every((p) => p.win)) {
		earned.push("win-streak");
	}
	if (last5.length === 5 && last5.every((p) => !p.win)) {
		earned.push("lose-streak");
	}

	// --- Role Main (uses ALL matches, not just last 10) ---
	const allPlayers: Participant[] = [];
	for (const match of allMatches) {
		const p = match.info.participants.find((p) => p.puuid === puuid);
		if (p) allPlayers.push(p);
	}
	const roleCounts = new Map<string, number>();
	for (const p of allPlayers) {
		if (p.teamPosition) {
			roleCounts.set(p.teamPosition, (roleCounts.get(p.teamPosition) || 0) + 1);
		}
	}
	if (roleCounts.size > 0) {
		const topRole = [...roleCounts.entries()].sort((a, b) => b[1] - a[1])[0];
		const ROLE_ACHIEVEMENTS: Record<string, string> = {
			TOP: "top-main",
			JUNGLE: "jungle-main",
			MIDDLE: "mid-main",
			BOTTOM: "adc-main",
			UTILITY: "support-main",
		};
		const roleAchi = ROLE_ACHIEVEMENTS[topRole[0]];
		if (roleAchi && topRole[1] / allPlayers.length >= 0.3) {
			earned.push(roleAchi);
		}
	}

	// --- Queue Enjoyer (last 25 matches) ---
	const last25 = allMatches.slice(0, 25);
	const soloqCount = last25.filter((m) => m.info.queueId === 420).length;
	const flexCount = last25.filter((m) => m.info.queueId === 440).length;
	const normalCount = last25.filter((m) => m.info.queueId !== 420 && m.info.queueId !== 440).length;
	if (soloqCount >= 13) earned.push("soloq-enjoyer");
	if (flexCount >= 13) earned.push("flex-enjoyer");
	if (normalCount >= 13) earned.push("normal-enjoyer");

	// --- Rank (always current, not match-based) ---
	if (ranked) {
		const tiers = ranked.map((e) => e.tier);
		const APEX = ["MASTER", "GRANDMASTER", "CHALLENGER"];
		const DIAMOND_PLUS = ["DIAMOND", ...APEX];

		if (tiers.some((t) => t === "CHALLENGER")) earned.push("challenger");
		else if (tiers.some((t) => APEX.includes(t))) earned.push("master-plus");
		else if (tiers.some((t) => DIAMOND_PLUS.includes(t)))
			earned.push("diamond-plus");
	}

	return earned;
}
