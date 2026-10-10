import { describe, expect, it } from "vitest";
import { type AchievementMatch, type AchievementParticipant } from "@/lib/validators/match";
import { detectAchievements } from "./detect";

const ME = "me";

function player(overrides: Partial<AchievementParticipant> = {}): AchievementParticipant {
	return {
		puuid: ME,
		teamId: 100,
		championName: "Ahri",
		teamPosition: "MIDDLE",
		win: true,
		kills: 2,
		deaths: 4,
		assists: 4,
		pentaKills: 0,
		firstBloodKill: false,
		totalMinionsKilled: 150,
		neutralMinionsKilled: 0,
		visionScore: 20,
		totalDamageDealtToChampions: 15000,
		totalDamageTaken: 15000,
		dragonKills: 0,
		baronKills: 0,
		...overrides,
	};
}

function match(overrides: Partial<AchievementParticipant> = {}, info: { queueId?: number; gameDuration?: number } = {}): AchievementMatch {
	return { info: { queueId: info.queueId ?? 420, gameDuration: info.gameDuration ?? 1800, participants: [player(overrides)] } };
}

function detect(matches: AchievementMatch[]): string[] {
	return detectAchievements({ matches, puuid: ME });
}

describe("detectAchievements", () => {
	it("ignores Arena, ARAM and normal games", () => {
		const games = [1700, 450, 400, 1700, 450].map((queueId) => match({ win: true, pentaKills: 1 }, { queueId }));
		expect(detect(games)).toEqual([]);
	});

	it("counts Ranked 5s games", () => {
		expect(detect([match({ pentaKills: 1 }, { queueId: 710 })])).toContain("pentakill");
	});

	it("skips remakes, so a remade loss does not break a win streak", () => {
		const games = [match(), match(), match({ win: false }, { gameDuration: 200 }), match(), match(), match()];
		expect(detect(games)).toContain("win-streak");
	});

	it("needs five games before awarding Feeder", () => {
		expect(detect([match({ deaths: 15 })])).not.toContain("feeder");
		expect(detect(Array.from({ length: 5 }, () => match({ deaths: 10 })))).toContain("feeder");
		expect(detect(Array.from({ length: 5 }, () => match({ deaths: 9 })))).not.toContain("feeder");
	});

	it("needs five games before awarding Vision Pro", () => {
		expect(detect(Array.from({ length: 4 }, () => match({ visionScore: 80 })))).not.toContain("vision-pro");
		expect(detect(Array.from({ length: 5 }, () => match({ visionScore: 60 })))).toContain("vision-pro");
	});

	it("awards Objective Hunter for 1.5+ dragons and barons per game", () => {
		const games = Array.from({ length: 5 }, (_, i) => match(i % 2 === 0 ? { dragonKills: 2, baronKills: 1 } : { dragonKills: 0 }));
		expect(detect(games)).toContain("objective-hunter");
		expect(detect(Array.from({ length: 5 }, () => match({ dragonKills: 1 })))).not.toContain("objective-hunter");
	});

	it("replaces Normal Enjoyer with 5s Enjoyer", () => {
		const games = Array.from({ length: 13 }, () => match({}, { queueId: 710 }));
		const earned = detect(games);
		expect(earned).toContain("premade-enjoyer");
		expect(earned).not.toContain("normal-enjoyer");
	});

	it("gives no role main on a tie for most played role", () => {
		const games = [match({ teamPosition: "TOP" }), match({ teamPosition: "TOP" }), match({ teamPosition: "JUNGLE" }), match({ teamPosition: "JUNGLE" })];
		const earned = detect(games);
		expect(earned).not.toContain("top-main");
		expect(earned).not.toContain("jungle-main");
	});

	it("awards the role main for a clear most played role", () => {
		expect(detect([match({ teamPosition: "TOP" }), match({ teamPosition: "TOP" }), match({ teamPosition: "JUNGLE" })])).toContain("top-main");
	});
});
