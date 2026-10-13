import { describe, expect, it } from "vitest";
import { laneOpponent, playerMetrics, type ScoringParticipant } from "./metrics";

function p(overrides: Partial<ScoringParticipant>): ScoringParticipant {
	return {
		puuid: "x",
		teamId: 100,
		teamPosition: "MIDDLE",
		championName: "Ahri",
		kills: 0,
		deaths: 0,
		assists: 0,
		totalMinionsKilled: 0,
		neutralMinionsKilled: 0,
		goldEarned: 0,
		totalDamageDealtToChampions: 0,
		totalDamageTaken: 0,
		visionScore: 0,
		wardsPlaced: 0,
		wardsKilled: 0,
		visionWardsBoughtInGame: 0,
		turretKills: 0,
		inhibitorKills: 0,
		dragonKills: 0,
		baronKills: 0,
		...overrides,
	};
}

const me = p({
	puuid: "me",
	kills: 5,
	deaths: 2,
	assists: 7,
	totalMinionsKilled: 200,
	neutralMinionsKilled: 10,
	goldEarned: 12000,
	totalDamageDealtToChampions: 20000,
	totalDamageTaken: 15000,
	visionScore: 30,
	wardsPlaced: 10,
	wardsKilled: 4,
	visionWardsBoughtInGame: 3,
	turretKills: 2,
	dragonKills: 1,
	champExperience: 15000,
	damageDealtToObjectives: 9000,
	objectivesStolen: 1,
});
const ally = p({ puuid: "ally", teamPosition: "TOP", kills: 3, totalDamageDealtToChampions: 20000, totalDamageTaken: 15000 });
const opp = p({ puuid: "opp", teamId: 200, championName: "Syndra", totalMinionsKilled: 170, goldEarned: 10500, totalDamageDealtToChampions: 17000, champExperience: 13500 });

describe("laneOpponent", () => {
	it("finds the enemy with the same position", () => {
		expect(laneOpponent(me, [me, ally, opp])?.puuid).toBe("opp");
	});

	it("is null without a unique opponent or position", () => {
		expect(laneOpponent(p({ teamPosition: "" }), [me, opp])).toBeNull();
		expect(laneOpponent(me, [me, opp, p({ puuid: "opp2", teamId: 200 })])).toBeNull();
		expect(laneOpponent(me, [me, opp, p({ puuid: "mate", teamId: 100 })])).toBeNull();
	});
});

describe("playerMetrics", () => {
	it("computes per-minute, share and diff metrics", () => {
		const { values, opponent } = playerMetrics(me, [me, ally, opp], 1800);
		expect(opponent?.puuid).toBe("opp");
		expect(values.csPerMin).toBeCloseTo(7);
		expect(values.goldPerMin).toBeCloseTo(400);
		expect(values.goldDiffPerMin).toBeCloseTo(50);
		expect(values.xpDiffPerMin).toBeCloseTo(50);
		expect(values.csDiffPerMin).toBeCloseTo(4 / 3);
		expect(values.kda).toBe(6);
		expect(values.killParticipation).toBeCloseTo(12 / 8);
		expect(values.damageShare).toBeCloseTo(0.5);
		expect(values.damageTakenShare).toBeCloseTo(0.5);
		expect(values.epicKills).toBe(1);
		expect(values.structureKills).toBe(2);
		expect(values.steals).toBe(1);
		expect(values.controlWards).toBe(3);
	});

	it("leaves out laning metrics without an opponent and optional fields when missing", () => {
		const old = p({ puuid: "old", kills: 1 });
		const { values, opponent } = playerMetrics(old, [old], 1200);
		expect(opponent).toBeNull();
		expect(values.goldDiffPerMin).toBeUndefined();
		expect(values.objectiveDamagePerMin).toBeUndefined();
		expect(values.steals).toBeUndefined();
		expect(values.csPerMin).toBe(0);
	});

	it("gives zero kill participation when the team has no kills", () => {
		const solo = p({ puuid: "solo" });
		expect(playerMetrics(solo, [solo], 1200).values.killParticipation).toBe(0);
	});
});
