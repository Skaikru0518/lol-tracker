import { type RankedEntry } from "@/lib/validators/ranked";

const TIERS = [
	"IRON",
	"BRONZE",
	"SILVER",
	"GOLD",
	"PLATINUM",
	"EMERALD",
	"DIAMOND",
	"MASTER",
	"GRANDMASTER",
	"CHALLENGER",
] as const;

const DIVISIONS = ["IV", "III", "II", "I"] as const;

// Iron IV = 1, Iron III = 2, ... Diamond I = 28, Master = 29, GM = 30, Challenger = 31
function rankToPoints(tier: string, rank: string): number {
	const tierIndex = TIERS.indexOf(tier as (typeof TIERS)[number]);
	if (tierIndex === -1) return 0;

	// Master+ have no divisions
	if (tierIndex >= 7) {
		return 28 + (tierIndex - 7) + 1; // Master=29, GM=30, Challenger=31
	}

	const divIndex = DIVISIONS.indexOf(rank as (typeof DIVISIONS)[number]);
	if (divIndex === -1) return 0;

	return tierIndex * 4 + divIndex + 1;
}

function pointsToRank(points: number): { tier: string; rank: string } {
	if (points >= 31) return { tier: "CHALLENGER", rank: "" };
	if (points >= 30) return { tier: "GRANDMASTER", rank: "" };
	if (points >= 29) return { tier: "MASTER", rank: "" };

	const rounded = Math.max(1, Math.round(points));
	const tierIndex = Math.floor((rounded - 1) / 4);
	const divIndex = (rounded - 1) % 4;

	return {
		tier: TIERS[tierIndex] ?? "IRON",
		rank: DIVISIONS[divIndex] ?? "IV",
	};
}

export function calculateAvgRank(
	playerRanks: Record<string, RankedEntry[]> | undefined,
	queueId: number,
): { tier: string; rank: string; points: number } | null {
	if (!playerRanks) return null;

	const relevantQueue =
		queueId === 440 ? "RANKED_FLEX_SR" : "RANKED_SOLO_5x5";

	let totalPoints = 0;
	let count = 0;

	for (const entries of Object.values(playerRanks)) {
		const entry = entries.find((e) => e.queueType === relevantQueue);
		if (entry) {
			totalPoints += rankToPoints(entry.tier, entry.rank);
			count++;
		}
	}

	if (count === 0) return null;

	const avgPoints = totalPoints / count;
	const { tier, rank } = pointsToRank(avgPoints);

	return { tier, rank, points: avgPoints };
}

export function formatRankLabel(tier: string, rank: string): string {
	const tierName = tier.charAt(0) + tier.slice(1).toLowerCase();
	if (["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier)) {
		return tierName;
	}
	return `${tierName} ${rank}`;
}
