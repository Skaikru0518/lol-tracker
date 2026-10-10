import { describe, expect, it } from "vitest";
import { makeMatch, makeParticipant } from "@/test/factories";
import { buildScoreboard } from "@/lib/summoner/matches/scoreboard";
import { comparisonRows } from "./comparison";

const match = makeMatch({
	participants: [
		makeParticipant({ puuid: "a", teamId: 100, teamPosition: "TOP", totalDamageDealtToChampions: 20000, visionScore: 12 }),
		makeParticipant({ puuid: "b", teamId: 100, teamPosition: "JUNGLE", totalDamageDealtToChampions: 10000, visionScore: 30 }),
		makeParticipant({ puuid: "c", teamId: 200, teamPosition: "TOP", win: false, totalDamageDealtToChampions: 25000, visionScore: 8 }),
	],
});

describe("comparisonRows", () => {
	it("keeps scoreboard order and scales to the largest value", () => {
		const rows = comparisonRows(buildScoreboard(match), "damage");
		expect(rows.blue.map((e) => [e.puuid, e.value])).toEqual([
			["a", 20000],
			["b", 10000],
		]);
		expect(rows.red.map((e) => e.puuid)).toEqual(["c"]);
		expect(rows.max).toBe(25000);
	});

	it("switches metric", () => {
		expect(comparisonRows(buildScoreboard(match), "vision").max).toBe(30);
	});

	it("never scales by zero", () => {
		const empty = makeMatch({ participants: [makeParticipant({ puuid: "x", teamId: 100, visionScore: 0 })] });
		expect(comparisonRows(buildScoreboard(empty), "vision").max).toBe(1);
	});

	it("names the top player for the metric", () => {
		expect(comparisonRows(buildScoreboard(match), "damage").topPuuid).toBe("c");
		expect(comparisonRows(buildScoreboard(match), "vision").topPuuid).toBe("b");
	});
});
