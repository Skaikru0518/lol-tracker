import { describe, expect, it } from "vitest";
import { type Rarity } from "@/lib/validators/achievements";
import { achievementMetadata, buildAchievementCard, rarityLine } from "./achievement-card";

const rarity: Rarity = { players: 1000, shares: { "pentakiller:all": [0.3, 0.024, 0.005], "season-grinder:2026": [0.2] } };

describe("buildAchievementCard", () => {
	it("builds a reached milestone tier with its rarity", () => {
		expect(buildAchievementCard("pentakiller", "all", 2, { tier: 3 }, rarity, "Velmora#MOON")).toMatchObject({
			id: "pentakiller",
			name: "Pentakiller",
			description: "Pentakills in ranked games",
			icon: "pentakiller",
			tier: 2,
			maxTier: 4,
			tierName: "Silver",
			scope: "all",
			rarity: "2% of players",
			riotId: "Velmora#MOON",
		});
	});

	it("is null for a tier the player has not reached, tier 0, or an unknown achievement", () => {
		expect(buildAchievementCard("pentakiller", "all", 4, { tier: 3 }, rarity, "X#1")).toBeNull();
		expect(buildAchievementCard("pentakiller", "all", 0, { tier: 3 }, rarity, "X#1")).toBeNull();
		expect(buildAchievementCard("pentakiller", "all", 1, undefined, rarity, "X#1")).toBeNull();
		expect(buildAchievementCard("nope", "all", 1, { tier: 1 }, rarity, "X#1")).toBeNull();
	});

	it("shows a closed season's achievement without a rarity line", () => {
		const card = buildAchievementCard("season-grinder", "2025", 1, { tier: 1 }, rarity, "X#1");
		expect(card).toMatchObject({ name: "Season Grinder", scope: "2025", tierName: null, rarity: null });
	});

	it("does not look a seasonal id up among milestones, or the other way round", () => {
		expect(buildAchievementCard("season-grinder", "all", 1, { tier: 1 }, rarity, "X#1")).toBeNull();
		expect(buildAchievementCard("pentakiller", "2026", 1, { tier: 1 }, rarity, "X#1")).toBeNull();
	});
});

describe("achievementMetadata", () => {
	it("names the tier as a numeral, and none for one-tier achievements", () => {
		expect(achievementMetadata(buildAchievementCard("pentakiller", "all", 3, { tier: 3 }, rarity, "Velmora#MOON")!)).toEqual({
			title: "Velmora#MOON unlocked Pentakiller III",
			description: "Pentakills in ranked games",
		});
		expect(achievementMetadata(buildAchievementCard("season-grinder", "2026", 1, { tier: 1 }, rarity, "Velmora#MOON")!).title).toBe("Velmora#MOON unlocked Season Grinder");
	});
});

describe("rarityLine", () => {
	it("says only for rare achievements", () => {
		expect(rarityLine("2% of players", 0.024)).toBe("Only 2% of players on Summon.gg have it");
		expect(rarityLine("43% of players", 0.43)).toBe("43% of players on Summon.gg have it");
	});
});
