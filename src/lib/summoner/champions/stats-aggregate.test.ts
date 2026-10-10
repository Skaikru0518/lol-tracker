import { describe, expect, it } from "vitest";
import { toChampionStat } from "./stats-aggregate";

const row = {
	championId: 267,
	championName: "Nami",
	games: 4,
	wins: 3,
	kills: 4,
	deaths: 8,
	assists: 60,
	cs: 120,
	damage: 48000,
	durationSeconds: 7200,
};

describe("toChampionStat", () => {
	it("derives per-game averages (damage included), ratios and CS per minute", () => {
		expect(toChampionStat(row)).toEqual({
			championId: 267,
			championName: "Nami",
			games: 4,
			wins: 3,
			winRate: 75,
			kills: 1,
			deaths: 2,
			assists: 15,
			kda: 8,
			csPerMin: 1,
			avgDamage: 12000,
		});
	});

	it("reports perfect KDA as kills plus assists", () => {
		expect(toChampionStat({ ...row, deaths: 0 }).kda).toBe(64);
	});

	it("never produces non-finite numbers for zero duration", () => {
		const stat = toChampionStat({ ...row, durationSeconds: 0 });
		expect(stat.csPerMin).toBe(0);
		expect(stat.avgDamage).toBe(12000);
	});

	it("rounds to two decimals", () => {
		const stat = toChampionStat({ ...row, games: 3, wins: 2, kills: 10, deaths: 3, assists: 1 });
		expect(stat.winRate).toBe(66.67);
		expect(stat.kills).toBe(3.33);
		expect(stat.kda).toBe(3.67);
	});

	it("survives JSON serialisation unchanged", () => {
		const stat = toChampionStat({ ...row, deaths: 0, durationSeconds: 0 });
		expect(JSON.parse(JSON.stringify(stat))).toEqual(stat);
	});
});
