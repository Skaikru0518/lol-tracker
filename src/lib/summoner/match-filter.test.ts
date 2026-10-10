import { describe, expect, it } from "vitest";
import { filterMatches } from "./match-filter";
import { makeMatch, makeParticipant } from "@/test/factories";

const mine = (championName: string) => makeParticipant({ puuid: "me", championName });
const solo = makeMatch({ matchId: "solo", queueId: 420, participants: [mine("Nami")] });
const arena = makeMatch({ matchId: "arena", queueId: 1700, participants: [mine("Lux")] });
const swift = makeMatch({ matchId: "swift", queueId: 480, participants: [mine("Nami")] });

describe("filterMatches", () => {
	it("keeps every queue, Arena included, for 'all'", () => {
		expect(filterMatches([solo, arena, swift], "me", "all", null)).toHaveLength(3);
	});

	it("filters by queue group", () => {
		expect(filterMatches([solo, arena, swift], "me", "normal", null).map((m) => m.metadata.matchId)).toEqual(["swift"]);
	});

	it("filters by the player's champion", () => {
		expect(filterMatches([solo, arena, swift], "me", "all", "Lux").map((m) => m.metadata.matchId)).toEqual(["arena"]);
	});
});
