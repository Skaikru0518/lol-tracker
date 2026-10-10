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
		...overrides,
	};
}

/** Ten equal players (so no "most X" badge has a winner) with per-index overrides. */
function lobby(overrides: Record<number, Partial<BadgeParticipant>> = {}): BadgeParticipant[] {
	return Array.from({ length: 10 }, (_, i) => player(i, overrides[i]));
}

function badges(participants: BadgeParticipant[], info: { queueId?: number; gameDuration?: number } = {}) {
	return detectMatchBadges({ queueId: info.queueId ?? 420, gameDuration: info.gameDuration ?? 1800, participants });
}

function badgesOf(participants: BadgeParticipant[], puuid: string): string[] {
	return badges(participants)
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

	it("needs 5+ kills and assists for MVP", () => {
		expect(badgesOf(lobby({ 0: { kills: 2, assists: 2 } }), "p0")).not.toContain("mvp");
		expect(badgesOf(lobby({ 0: { kills: 3, assists: 2 } }), "p0")).toContain("mvp");
	});

	it("gives Bad Luck instead of Honorable, never both", () => {
		const ids = badgesOf(lobby({ 5: { kills: 6, assists: 2, deaths: 0 } }), "p5");
		expect(ids).toContain("bad-luck");
		expect(ids).not.toContain("honorable");
	});

	it("gives Honorable to the losing side's best K+A when they died more than a teammate", () => {
		const ids = badgesOf(lobby({ 5: { kills: 6, assists: 2, deaths: 4 } }), "p5");
		expect(ids).toContain("honorable");
		expect(ids).not.toContain("bad-luck");
	});
});
