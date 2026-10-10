import { describe, expect, it } from "vitest";
import { type ChampionTotals, type SeasonalInputs } from "../progress/types";
import { evaluateSeasonal, longestWinStreak } from "./evaluate";

function champ(championName: string, games: number, wins: number): ChampionTotals {
	return { championName, games, wins, pentas: 0, quadras: 0, kills: 0, assists: 0, vision: 0, turrets: 0, epics: 0 };
}

const base: SeasonalInputs = { champions: [], wins: [], snapshots: [], ranked: [] };

function byId(inputs: SeasonalInputs) {
	return Object.fromEntries(evaluateSeasonal("2026", inputs).map((r) => [r.achievementId, r]));
}

describe("longestWinStreak", () => {
	it("finds the longest run of wins in order", () => {
		expect(longestWinStreak([true, true, false, true, true, true, false])).toBe(3);
		expect(longestWinStreak([])).toBe(0);
	});
});

describe("evaluateSeasonal", () => {
	it("scopes every result to the season", () => {
		const results = evaluateSeasonal("2026", base);
		expect(results).toHaveLength(8);
		expect(results.every((r) => r.scope === "2026")).toBe(true);
	});

	it("counts games, wins and the most played champion", () => {
		const r = byId({ ...base, champions: [champ("Ahri", 70, 40), champ("Lux", 35, 15)] });
		expect(r["season-grinder"]).toMatchObject({ value: 105, tier: 1 });
		expect(r["season-winner"]).toMatchObject({ value: 55, tier: 1 });
		expect(r["main-character"]).toMatchObject({ value: 70, tier: 1 });
	});

	it("needs 50 games and a 55% win rate for Iron Will", () => {
		expect(byId({ ...base, champions: [champ("Ahri", 49, 40)] })["iron-will"]).toMatchObject({ value: 49, tier: 0 });
		expect(byId({ ...base, champions: [champ("Ahri", 60, 32)] })["iron-will"]).toMatchObject({ value: 60, tier: 0 });
		expect(byId({ ...base, champions: [champ("Ahri", 60, 33)] })["iron-will"]).toMatchObject({ value: 60, tier: 1 });
	});

	it("awards Hot Streak for 7 straight wins", () => {
		expect(byId({ ...base, wins: [true, true, true, true, true, true, false, true] })["hot-streak"]).toMatchObject({ value: 6, tier: 0 });
		expect(byId({ ...base, wins: Array(7).fill(true) })["hot-streak"]).toMatchObject({ value: 7, tier: 1 });
	});

	it("awards Promoted when a queue's current tier is above its first snapshot of the season", () => {
		const snapshots = [
			{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", createdAt: new Date("2026-01-10") },
			{ queueType: "RANKED_FLEX_SR", tier: "PLATINUM", createdAt: new Date("2026-01-11") },
		];
		expect(byId({ ...base, snapshots, ranked: [{ queueType: "RANKED_SOLO_5x5", tier: "GOLD" }, { queueType: "RANKED_FLEX_SR", tier: "GOLD" }] }).promoted.tier).toBe(0);
		expect(byId({ ...base, snapshots, ranked: [{ queueType: "RANKED_FLEX_SR", tier: "EMERALD" }] }).promoted).toMatchObject({ value: 1, tier: 1 });
	});

	it("uses the season's last snapshot for Promoted and skips Triple Threat in a closed season", () => {
		const snapshots = [
			{ queueType: "RANKED_SOLO_5x5", tier: "SILVER", createdAt: new Date("2025-02-01") },
			{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", createdAt: new Date("2025-11-01") },
		];
		const results = evaluateSeasonal("2025", { ...base, snapshots, ranked: null });
		expect(results.find((r) => r.achievementId === "promoted")?.tier).toBe(1);
		expect(results.some((r) => r.achievementId === "triple-threat")).toBe(false);
	});

	it("counts ranked queues for Triple Threat", () => {
		const ranked = [
			{ queueType: "RANKED_SOLO_5x5", tier: "GOLD" },
			{ queueType: "RANKED_FLEX_SR", tier: "GOLD" },
			{ queueType: "RANKED_PREMADE_5x5", tier: "SILVER" },
		];
		expect(byId({ ...base, ranked })["triple-threat"]).toMatchObject({ value: 3, tier: 1 });
		expect(byId({ ...base, ranked: ranked.slice(0, 2) })["triple-threat"]).toMatchObject({ value: 2, tier: 0 });
	});

	it("takes Season Peak from the season's snapshots and current ranks", () => {
		const r = byId({ ...base, snapshots: [{ queueType: "RANKED_SOLO_5x5", tier: "MASTER", createdAt: new Date("2026-03-01") }], ranked: [{ queueType: "RANKED_SOLO_5x5", tier: "DIAMOND" }] });
		expect(r["season-peak"]).toMatchObject({ value: 7, tier: 3 });
	});
});
