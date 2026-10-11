import { describe, expect, it } from "vitest";
import { type ChampionTotals, type GameRow, type SeasonalInputs } from "../progress/types";
import { evaluateSeasonal, longestWinStreak } from "./evaluate";

function champ(championName: string, games: number, wins: number, overrides: Partial<ChampionTotals> = {}): ChampionTotals {
	return {
		championName,
		games,
		wins,
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

let clock = Date.parse("2026-02-01T12:00:00Z");

/** One season game; each call is an hour after the previous one. */
function game(overrides: Partial<GameRow> = {}): GameRow {
	clock += 3600_000;
	return {
		championName: "Ahri",
		gameCreation: clock,
		gameDuration: 1800,
		teamPosition: "MIDDLE",
		win: true,
		pentas: 0,
		quadras: 0,
		kills: 1,
		deaths: 2,
		assists: 2,
		vision: 10,
		turrets: 0,
		epics: 0,
		gold: 10000,
		cs: 200,
		damage: 20000,
		wardsPlaced: 10,
		wardsKilled: 3,
		support: 1000,
		firstBlood: false,
		largestSpree: 2,
		...overrides,
	};
}

const results = (wins: boolean[]) => wins.map((win) => game({ win }));

const base: SeasonalInputs = { champions: [], games: [], snapshots: [], ranked: [] };

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
		const all = evaluateSeasonal("2026", base);
		expect(all).toHaveLength(16);
		expect(all.every((r) => r.scope === "2026")).toBe(true);
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
		expect(byId({ ...base, games: results([true, true, true, true, true, true, false, true]) })["hot-streak"]).toMatchObject({ value: 6, tier: 0 });
		expect(byId({ ...base, games: results(Array(7).fill(true)) })["hot-streak"]).toMatchObject({ value: 7, tier: 1 });
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
		const closed = evaluateSeasonal("2025", { ...base, snapshots, ranked: null });
		expect(closed.find((r) => r.achievementId === "promoted")?.tier).toBe(1);
		expect(closed.some((r) => r.achievementId === "triple-threat")).toBe(false);
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

	it("counts champions played for Pool Party and deathless games for Spotless", () => {
		const champions = Array.from({ length: 20 }, (_, i) => champ(`C${i}`, 1, 0, { deathless: i < 10 ? 1 : 0 }));
		const r = byId({ ...base, champions });
		expect(r["pool-party"]).toMatchObject({ value: 20, tier: 1 });
		expect(r.spotless).toMatchObject({ value: 10, tier: 1 });
	});

	it("needs a win on all five positions for Role Swap", () => {
		const positions = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
		expect(byId({ ...base, games: positions.map((teamPosition) => game({ teamPosition })) })["role-swap"]).toMatchObject({ value: 5, tier: 1 });
		const lostSupport = positions.map((teamPosition) => game({ teamPosition, win: teamPosition !== "UTILITY" }));
		expect(byId({ ...base, games: lostSupport })["role-swap"]).toMatchObject({ value: 4, tier: 0 });
	});

	it("counts fast wins for Stomper and long wins for Marathon", () => {
		const games = [
			...Array.from({ length: 5 }, () => game({ gameDuration: 1150 })),
			game({ gameDuration: 1100, win: false }),
			game({ gameDuration: 2500 }),
			game({ gameDuration: 2700, win: false }),
		];
		const r = byId({ ...base, games });
		expect(r.stomper).toMatchObject({ value: 5, tier: 1 });
		expect(r.marathon).toMatchObject({ value: 1, tier: 1 });
	});

	it("awards Comeback Kid for a win right after five straight losses", () => {
		expect(byId({ ...base, games: results([false, false, false, false, false, true]) })["comeback-kid"]).toMatchObject({ value: 1, tier: 1 });
		expect(byId({ ...base, games: results([false, false, false, false, true, false]) })["comeback-kid"]).toMatchObject({ value: 0, tier: 0 });
		expect(byId({ ...base, games: results([false, false, false, false, false]) })["comeback-kid"].tier).toBe(0);
	});

	it("awards Season Penta for a pentakill this season", () => {
		expect(byId({ ...base, champions: [champ("Ahri", 3, 2, { pentas: 1 })] })["season-penta"]).toMatchObject({ value: 1, tier: 1 });
	});

	it("counts Budapest calendar days with a game for Dedication", () => {
		const games = [
			game({ gameCreation: Date.parse("2026-03-01T22:30:00Z") }),
			game({ gameCreation: Date.parse("2026-03-01T23:30:00Z") }),
		];
		expect(byId({ ...base, games }).dedication).toMatchObject({ value: 2, tier: 0 });
	});
});
