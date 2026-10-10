import { describe, expect, it } from "vitest";
import { type ChampionTotals, type MilestoneInputs } from "../progress/types";
import { evaluateMilestones } from "./evaluate";

function champ(championName: string, overrides: Partial<ChampionTotals> = {}): ChampionTotals {
	return {
		championName,
		games: 0,
		wins: 0,
		pentas: 0,
		quadras: 0,
		kills: 0,
		assists: 0,
		vision: 0,
		turrets: 0,
		epics: 0,
		gold: 0,
		cs: 0,
		damage: 0,
		wardsPlaced: 0,
		wardsKilled: 0,
		support: 0,
		firstBloods: 0,
		deathless: 0,
		legendary: 0,
		seconds: 0,
		...overrides,
	};
}

const empty: MilestoneInputs = { champions: [], snapshots: [], ranked: [], masteries: [] };

function byId(inputs: MilestoneInputs) {
	return Object.fromEntries(evaluateMilestones(inputs).map((r) => [r.achievementId, r]));
}

describe("evaluateMilestones", () => {
	it("returns every milestone at zero for an account without games, Peak Rank at -1", () => {
		const results = evaluateMilestones(empty);
		expect(results).toHaveLength(24);
		expect(results.every((r) => r.scope === "all" && r.tier === 0)).toBe(true);
		expect(byId(empty)["peak-rank"].value).toBe(-1);
		expect(byId(empty).veteran.value).toBe(0);
	});

	it("sums champion totals into the counting milestones", () => {
		const r = byId({
			...empty,
			champions: [champ("Ahri", { games: 450, wins: 230, pentas: 2, kills: 4000, epics: 30 }), champ("Lux", { games: 60, wins: 30, quadras: 5, kills: 1200 })],
		});
		expect(r.veteran).toMatchObject({ value: 510, tier: 2 });
		expect(r.winner).toMatchObject({ value: 260, tier: 2 });
		expect(r.pentakiller).toMatchObject({ value: 2, tier: 1 });
		expect(r.multikiller).toMatchObject({ value: 5, tier: 1 });
		expect(r.slayer).toMatchObject({ value: 5200, tier: 2 });
		expect(r["epic-hunter"]).toMatchObject({ value: 30, tier: 0 });
	});

	it("counts champions with a win and the best champion's wins", () => {
		const champions = [champ("Ahri", { games: 90, wins: 52 }), champ("Lux", { games: 3, wins: 0 }), ...Array.from({ length: 14 }, (_, i) => champ(`C${i}`, { games: 1, wins: 1 }))];
		const r = byId({ ...empty, champions });
		expect(r["champion-pool"]).toMatchObject({ value: 15, tier: 1 });
		expect(r["one-champ-army"]).toMatchObject({ value: 52, tier: 1 });
	});

	it("reads mastery milestones even without games", () => {
		const masteries = [{ championLevel: 12, championPoints: 1_200_000 }, { championLevel: 10, championPoints: 90_000 }, { championLevel: 11, championPoints: 95_000 }, { championLevel: 7, championPoints: 50_000 }];
		const r = byId({ ...empty, masteries });
		expect(r["mastery-collector"]).toMatchObject({ value: 3, tier: 1 });
		expect(r.devotion).toMatchObject({ value: 1_200_000, tier: 2 });
	});

	it("takes Peak Rank from the highest snapshot or current rank in any queue", () => {
		const r = byId({
			...empty,
			snapshots: [{ queueType: "RANKED_FLEX_SR", tier: "DIAMOND", createdAt: new Date("2025-05-01") }],
			ranked: [{ queueType: "RANKED_SOLO_5x5", tier: "EMERALD" }],
		});
		expect(r["peak-rank"]).toMatchObject({ value: 6, tier: 2 });
		expect(byId({ ...empty, ranked: [{ queueType: "RANKED_SOLO_5x5", tier: "CHALLENGER" }] })["peak-rank"].tier).toBe(4);
	});

	it("sums the new totals and turns seconds into whole hours", () => {
		const r = byId({
			...empty,
			champions: [
				champ("Ahri", { gold: 900_000, cs: 20_000, damage: 1_500_000, wardsPlaced: 800, wardsKilled: 200, support: 300_000, firstBloods: 20, deathless: 4, legendary: 1, seconds: 100 * 3600 + 1800 }),
				champ("Lux", { gold: 200_000, cs: 6_000, damage: 600_000, wardsPlaced: 300, wardsKilled: 60, support: 250_000, firstBloods: 6, deathless: 2 }),
			],
		});
		expect(r["gold-digger"]).toMatchObject({ value: 1_100_000, tier: 1 });
		expect(r.farmer).toMatchObject({ value: 26_000, tier: 1 });
		expect(r.artillery).toMatchObject({ value: 2_100_000, tier: 1 });
		expect(r["ward-keeper"]).toMatchObject({ value: 1100, tier: 1 });
		expect(r["ward-hunter"]).toMatchObject({ value: 260, tier: 1 });
		expect(r.guardian).toMatchObject({ value: 550_000, tier: 1 });
		expect(r["first-strike"]).toMatchObject({ value: 26, tier: 1 });
		expect(r.deathless).toMatchObject({ value: 6, tier: 1 });
		expect(r.legendary).toMatchObject({ value: 1, tier: 1 });
		expect(r["time-served"]).toMatchObject({ value: 100, tier: 1 });
	});
});
