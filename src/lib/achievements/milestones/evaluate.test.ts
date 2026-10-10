import { describe, expect, it } from "vitest";
import { type ChampionTotals, type MilestoneInputs } from "../progress/types";
import { evaluateMilestones } from "./evaluate";

function champ(championName: string, overrides: Partial<ChampionTotals> = {}): ChampionTotals {
	return { championName, games: 0, wins: 0, pentas: 0, quadras: 0, kills: 0, assists: 0, vision: 0, turrets: 0, epics: 0, ...overrides };
}

const empty: MilestoneInputs = { champions: [], snapshots: [], ranked: [], masteries: [] };

function byId(inputs: MilestoneInputs) {
	return Object.fromEntries(evaluateMilestones(inputs).map((r) => [r.achievementId, r]));
}

describe("evaluateMilestones", () => {
	it("returns every milestone at zero for an account without games, Peak Rank at -1", () => {
		const results = evaluateMilestones(empty);
		expect(results).toHaveLength(14);
		expect(results.every((r) => r.scope === "all" && r.tier === 0)).toBe(true);
		expect(byId(empty)["peak-rank"].value).toBe(-1);
		expect(byId(empty).veteran.value).toBe(0);
	});

	it("sums champion totals into the counting milestones", () => {
		const r = byId({
			...empty,
			champions: [champ("Ahri", { games: 150, wins: 80, pentas: 2, kills: 900, epics: 30 }), champ("Lux", { games: 60, wins: 30, quadras: 5 })],
		});
		expect(r.veteran).toMatchObject({ value: 210, tier: 2 });
		expect(r.winner).toMatchObject({ value: 110, tier: 2 });
		expect(r.pentakiller).toMatchObject({ value: 2, tier: 1 });
		expect(r.multikiller).toMatchObject({ value: 5, tier: 1 });
		expect(r.slayer).toMatchObject({ value: 900, tier: 1 });
		expect(r["epic-hunter"]).toMatchObject({ value: 30, tier: 1 });
	});

	it("counts champions with a win and the best champion's wins", () => {
		const champions = [champ("Ahri", { games: 40, wins: 26 }), champ("Lux", { games: 3, wins: 0 }), ...Array.from({ length: 9 }, (_, i) => champ(`C${i}`, { games: 1, wins: 1 }))];
		const r = byId({ ...empty, champions });
		expect(r["champion-pool"]).toMatchObject({ value: 10, tier: 1 });
		expect(r["one-champ-army"]).toMatchObject({ value: 26, tier: 1 });
	});

	it("reads mastery milestones even without games", () => {
		const r = byId({ ...empty, masteries: [{ championLevel: 12, championPoints: 600_000 }, { championLevel: 10, championPoints: 90_000 }, { championLevel: 7, championPoints: 50_000 }] });
		expect(r["mastery-collector"]).toMatchObject({ value: 2, tier: 1 });
		expect(r.devotion).toMatchObject({ value: 600_000, tier: 2 });
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
});
