import { describe, expect, it } from "vitest";
import { type Baselines } from "@/lib/validators/performance";
import { METRIC_IDS } from "./weights";
import { type ScoringParticipant } from "./metrics";
import { MIN_CACHE_GAMES, scoreMatch, scorePerformance, summarize, type ScoringMatch } from "./score";

function p(overrides: Partial<ScoringParticipant>): ScoringParticipant {
	return {
		puuid: "x",
		teamId: 100,
		teamPosition: "MIDDLE",
		championName: "Ahri",
		kills: 2,
		deaths: 2,
		assists: 2,
		totalMinionsKilled: 180,
		neutralMinionsKilled: 0,
		goldEarned: 10000,
		totalDamageDealtToChampions: 15000,
		totalDamageTaken: 12000,
		visionScore: 20,
		wardsPlaced: 8,
		wardsKilled: 2,
		visionWardsBoughtInGame: 2,
		turretKills: 1,
		inhibitorKills: 0,
		dragonKills: 0,
		baronKills: 0,
		champExperience: 13000,
		damageDealtToObjectives: 5000,
		objectivesStolen: 0,
		...overrides,
	};
}

function match(participants: ScoringParticipant[], info: { queueId?: number; gameDuration?: number } = {}): ScoringMatch {
	return { info: { queueId: info.queueId ?? 420, gameDuration: info.gameDuration ?? 1800, participants } };
}

// Each metric spans center - 10 … center + 10, so a value equal to its center sits at percentile 50
function baselinesAround(centers: Partial<Record<string, number>>, games = 500): Baselines {
	const metrics = Object.fromEntries(METRIC_IDS.map((id) => [id, Array.from({ length: 21 }, (_, i) => (centers[id] ?? 0) + (i - 10))]));
	return { computedAt: "2026-10-13T00:00:00.000Z", sampleSize: games, roles: { MIDDLE: { games, metrics } } };
}

// Raw scores spread 40 … 60 around 50, so a raw 50 sits at the calibration's median
function calibrated(b: Baselines): Baselines {
	const around50 = Array.from({ length: 21 }, (_, i) => 40 + i);
	const categories = Object.fromEntries(["laning", "farming", "combat", "teamfight", "objectives", "vision"].map((id) => [id, around50]));
	return { ...b, roles: { MIDDLE: { ...b.roles.MIDDLE!, calibration: { overall: around50, categories } } } };
}

const me = p({ puuid: "me" });
const opp = p({ puuid: "opp", teamId: 200, championName: "Syndra" });

const medianCenters = {
	csPerMin: 6,
	goldPerMin: 10000 / 30,
	kda: 2,
	deathsPerMin: 2 / 30,
	killParticipation: 2,
	damageShare: 1,
	damageTakenShare: 1,
	objectiveDamagePerMin: 5000 / 30,
	epicKills: 0,
	structureKills: 1,
	steals: 0,
	visionPerMin: 20 / 30,
	wardsPlacedPerMin: 8 / 30,
	wardsKilledPerMin: 2 / 30,
	controlWards: 2,
};

describe("scorePerformance", () => {
	it("scores a player at the role median as 50 (grade C) with all six categories", () => {
		const result = scorePerformance(match([me, opp]), "me", baselinesAround(medianCenters));
		expect(result?.role).toBe("MIDDLE");
		expect(result?.categories.map((c) => c.id)).toEqual(["laning", "farming", "combat", "teamfight", "objectives", "vision"]);
		expect(result?.score).toBe(50);
		expect(result?.grade).toBe("C");
		expect(result?.opponent).toEqual({ championName: "Syndra", goldDiff: 0, xpDiff: 0, csDiff: 0, damageDiff: 0 });
	});

	it("ranks far-above-baseline play as S+", () => {
		const star = p({
			puuid: "me",
			kills: 15,
			deaths: 0,
			assists: 10,
			totalMinionsKilled: 300,
			goldEarned: 20000,
			totalDamageDealtToChampions: 40000,
			visionScore: 60,
			wardsPlaced: 30,
			wardsKilled: 15,
			visionWardsBoughtInGame: 10,
			turretKills: 5,
			dragonKills: 3,
			baronKills: 1,
			damageDealtToObjectives: 30000,
			objectivesStolen: 2,
			champExperience: 20000,
			totalDamageTaken: 30000,
		});
		const result = scorePerformance(match([star, opp]), "me", baselinesAround({ deathsPerMin: 20, killParticipation: -20, damageShare: -20, damageTakenShare: -20 }));
		expect(result?.grade).toBe("S+");
	});

	it("drops Laning and renormalises when there is no unique opponent", () => {
		const result = scorePerformance(match([me]), "me", baselinesAround(medianCenters));
		expect(result?.categories.some((c) => c.id === "laning")).toBe(false);
		expect(result?.opponent).toBeNull();
		expect(result?.score).toBe(50);
	});

	it("still scores older matches without the optional fields", () => {
		const old = p({ puuid: "me", champExperience: undefined, damageDealtToObjectives: undefined, objectivesStolen: undefined });
		const result = scorePerformance(match([old, opp]), "me", baselinesAround({}));
		expect(result).not.toBeNull();
		expect(result?.opponent?.xpDiff).toBeNull();
		expect(result?.categories.find((c) => c.id === "objectives")?.metrics.map((m) => m.id)).toEqual(["epicKills", "structureKills"]);
	});

	it("returns null for non-ranked games, remakes, missing players, roles or baselines", () => {
		const b = baselinesAround({});
		expect(scorePerformance(match([me, opp], { queueId: 450 }), "me", b)).toBeNull();
		expect(scorePerformance(match([me, opp], { gameDuration: 200 }), "me", b)).toBeNull();
		expect(scorePerformance(match([me, opp]), "nobody", b)).toBeNull();
		expect(scorePerformance(match([p({ puuid: "me", teamPosition: "" })]), "me", b)).toBeNull();
		expect(scorePerformance(match([me, opp]), "me", null)).toBeNull();
		expect(scorePerformance(match([me, opp]), "me", baselinesAround({}, 10))).toBeNull();
	});
});

describe("scoreMatch", () => {
	it("scores every placed participant and is cacheable with enough calibrated baseline games", () => {
		const { scores, cacheable } = scoreMatch(match([me, opp]), calibrated(baselinesAround(medianCenters, 500)));
		expect(Object.keys(scores).sort()).toEqual(["me", "opp"]);
		expect(scores.me.baselineGames).toBe(500);
		expect(cacheable).toBe(true);
	});

	it("scores but does not cache while a role has fewer than the cache minimum", () => {
		const { scores, cacheable } = scoreMatch(match([me, opp]), baselinesAround(medianCenters, MIN_CACHE_GAMES - 1));
		expect(Object.keys(scores)).toHaveLength(2);
		expect(cacheable).toBe(false);
	});

	it("stays cacheable when a participant has no position", () => {
		const { scores, cacheable } = scoreMatch(match([me, opp, p({ puuid: "afk", teamPosition: "" })]), calibrated(baselinesAround(medianCenters)));
		expect(Object.keys(scores).sort()).toEqual(["me", "opp"]);
		expect(cacheable).toBe(true);
	});

	it("gives nothing for ineligible games or without baselines", () => {
		expect(scoreMatch(match([me, opp], { queueId: 450 }), baselinesAround(medianCenters))).toEqual({ scores: {}, cacheable: false });
		expect(scoreMatch(match([me, opp]), null)).toEqual({ scores: {}, cacheable: false });
	});
});

describe("stored precision", () => {
	it("rounds metric values to 2 decimals and percentiles to whole numbers", () => {
		const result = scorePerformance(match([me, opp]), "me", baselinesAround({ goldPerMin: 300.123 }));
		const gold = result?.categories.find((c) => c.id === "farming")?.metrics.find((m) => m.id === "goldPerMin");
		expect(gold?.value).toBe(333.33);
		expect(Number.isInteger(gold?.percentile)).toBe(true);
	});
});

describe("summarize", () => {
	it("keeps only score and grade per puuid", () => {
		const { scores } = scoreMatch(match([me, opp]), baselinesAround(medianCenters));
		expect(summarize(scores)).toEqual({ me: { score: 50, grade: "C" }, opp: { score: 50, grade: "C" } });
	});
});

describe("calibrated scoring", () => {
	it("puts a median game at the friendly curve's median (63, grade B)", () => {
		const result = scorePerformance(match([me, opp]), "me", calibrated(baselinesAround(medianCenters)));
		expect(result?.score).toBe(63);
		expect(result?.grade).toBe("B");
		expect(result?.categories.every((c) => c.score === 63)).toBe(true);
	});

	it("does not cache before the baseline has a calibration", () => {
		expect(scoreMatch(match([me, opp]), baselinesAround(medianCenters)).cacheable).toBe(false);
	});
});
