import { describe, expect, it } from "vitest";
import { type BadgeParticipant, detectMatchBadges } from "./detect";

function player(index: number, overrides: Partial<BadgeParticipant> = {}): BadgeParticipant {
	const blue = index < 5;
	return {
		puuid: `p${index}`,
		teamId: blue ? 100 : 200,
		win: blue,
		championId: 103,
		kills: 1,
		deaths: 1,
		assists: 1,
		totalDamageDealtToChampions: 10000,
		totalDamageTaken: 10000,
		visionScore: 10,
		totalMinionsKilled: 100,
		neutralMinionsKilled: 0,
		goldEarned: 8000,
		timeCCingOthers: 5,
		totalHealsOnTeammates: 0,
		turretKills: 0,
		firstBloodKill: false,
		pentaKills: 0,
		quadraKills: 0,
		damageSelfMitigated: 10000,
		totalDamageShieldedOnTeammates: 0,
		objectivesStolen: 0,
		damageDealtToBuildings: 1000,
		wardsKilled: 2,
		largestKillingSpree: 2,
		longestTimeSpentLiving: 300,
		totalTimeSpentDead: 60,
		gameEndedInSurrender: false,
		...overrides,
	};
}

/** Ten equal players (so no "most X" badge has a winner) with per-index overrides. */
function lobby(overrides: Record<number, Partial<BadgeParticipant>> = {}): BadgeParticipant[] {
	return Array.from({ length: 10 }, (_, i) => player(i, overrides[i]));
}

function badges(participants: BadgeParticipant[], info: { queueId?: number; gameDuration?: number } = {}, scores: Record<string, number> = {}) {
	return detectMatchBadges({ queueId: info.queueId ?? 420, gameDuration: info.gameDuration ?? 1800, participants }, scores);
}

function badgesOf(participants: BadgeParticipant[], puuid: string, scores: Record<string, number> = {}): string[] {
	return badges(participants, {}, scores)
		.filter((b) => b.puuid === puuid)
		.map((b) => b.badgeId);
}

describe("detectMatchBadges", () => {
	it("gives nothing outside Ranked Solo, Flex and 5s", () => {
		const players = lobby({ 0: { pentaKills: 1, totalDamageDealtToChampions: 50000 } });
		expect(badges(players, { queueId: 1700 })).toEqual([]);
		expect(badges(players, { queueId: 450 })).toEqual([]);
		expect(badges(players, { queueId: 710 }).length).toBeGreaterThan(0);
	});

	it("gives nothing for a remake", () => {
		expect(badges(lobby({ 0: { pentaKills: 1 } }), { gameDuration: 200 })).toEqual([]);
	});

	it("gives a 'most X' badge only to a single leader", () => {
		expect(badgesOf(lobby({ 3: { totalDamageDealtToChampions: 40000 } }), "p3")).toContain("damage-king");
		const tied = lobby({ 3: { visionScore: 50 }, 7: { visionScore: 50 } });
		expect(badges(tied).some((b) => b.badgeId === "vision-king")).toBe(false);
	});

	it("gives no 'most X' badge when the best value is zero", () => {
		const players = lobby(Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i, { timeCCingOthers: 0 }])));
		expect(badges(players).some((b) => b.badgeId === "cc-machine")).toBe(false);
	});

	it("does not add Quadrakill on top of Pentakill", () => {
		const ids = badgesOf(lobby({ 0: { pentaKills: 1, quadraKills: 1 } }), "p0");
		expect(ids).toContain("pentakill");
		expect(ids).not.toContain("quadrakill");
		expect(badgesOf(lobby({ 0: { quadraKills: 1 } }), "p0")).toContain("quadrakill");
	});

	it("gives MVP to the winning side's best score and ACE to the losing side's", () => {
		const scores = { p0: 60, p1: 82, p5: 75, p6: 40 };
		expect(badgesOf(lobby(), "p1", scores)).toContain("mvp");
		expect(badgesOf(lobby(), "p5", scores)).toContain("ace");
		expect(badgesOf(lobby(), "p0", scores)).not.toContain("mvp");
	});

	it("gives no MVP or ACE without scores", () => {
		expect(badges(lobby()).some((b) => b.badgeId === "mvp" || b.badgeId === "ace")).toBe(false);
	});

	it("needs 8 CS a minute for CS King and 1.5 vision a minute for Vision King", () => {
		expect(badgesOf(lobby({ 0: { totalMinionsKilled: 230 } }), "p0")).not.toContain("cs-king");
		expect(badgesOf(lobby({ 0: { totalMinionsKilled: 250 } }), "p0")).toContain("cs-king");
		expect(badgesOf(lobby({ 0: { visionScore: 40 } }), "p0")).not.toContain("vision-king");
		expect(badgesOf(lobby({ 0: { visionScore: 50 } }), "p0")).toContain("vision-king");
	});

	it("gives Solo Carry for 35% of a winning team's damage", () => {
		expect(badgesOf(lobby({ 0: { totalDamageDealtToChampions: 30000 } }), "p0")).toContain("solo-carry");
		expect(badgesOf(lobby({ 5: { totalDamageDealtToChampions: 30000 } }), "p5")).not.toContain("solo-carry");
	});

	it("gives Tank God for damage absorbed, skipping players who died more than their team's average", () => {
		const players = lobby({ 0: { totalDamageTaken: 30000, damageSelfMitigated: 30000 }, 1: { totalDamageTaken: 50000, deaths: 8 } });
		expect(badgesOf(players, "p0")).toContain("tank-god");
		expect(badgesOf(players, "p1")).not.toContain("tank-god");
	});

	it("counts shields with heals for Healer", () => {
		expect(badgesOf(lobby({ 0: { totalHealsOnTeammates: 6000, totalDamageShieldedOnTeammates: 5000 } }), "p0")).toContain("healer");
	});

	it("never gives the retired Gold Lead, Honorable or Bad Luck", () => {
		const ids = badges(lobby({ 0: { goldEarned: 20000 }, 5: { kills: 6, assists: 2, deaths: 0 } })).map((b) => b.badgeId);
		expect(ids.filter((id) => ["gold-lead", "honorable", "bad-luck"].includes(id))).toEqual([]);
	});

	it("awards the new badges", () => {
		expect(badgesOf(lobby({ 0: { objectivesStolen: 1 } }), "p0")).toContain("thief");
		expect(badgesOf(lobby({ 0: { damageDealtToBuildings: 9000 } }), "p0")).toContain("siege-master");
		expect(badgesOf(lobby({ 0: { wardsKilled: 12 } }), "p0")).toContain("sweeper");
		expect(badgesOf(lobby({ 0: { largestKillingSpree: 8 } }), "p0")).toContain("rampage");
		expect(badgesOf(lobby({ 0: { longestTimeSpentLiving: 1000 } }), "p0")).toContain("survivor");
		expect(badgesOf(lobby({ 0: { totalTimeSpentDead: 450 } }), "p0")).toContain("grey-screen");
	});

	it("gives Surrendered only to a loser with 10+ deaths in a surrendered game", () => {
		const players = lobby({ 0: { gameEndedInSurrender: true, deaths: 12 }, 5: { gameEndedInSurrender: true, deaths: 10 } });
		expect(badgesOf(players, "p5")).toContain("surrendered");
		expect(badgesOf(players, "p0")).not.toContain("surrendered");
	});
});
