import { describe, expect, it } from "vitest";
import { calculateStats } from "./stats";
import { makeMatch, makeParticipant } from "@/test/factories";

const game = (matchId: string, queueId: number) =>
	makeMatch({ matchId, queueId, participants: [makeParticipant({ puuid: "me", win: true })] });

describe("calculateStats", () => {
	it("counts only Summoner's Rift role queues", () => {
		const stats = calculateStats([game("1", 420), game("2", 710), game("3", 2400), game("4", 900), game("5", 1750)], "me");
		expect(stats.totalGames).toBe(2);
	});
});
