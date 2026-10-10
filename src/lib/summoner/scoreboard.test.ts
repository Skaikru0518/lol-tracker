import { describe, expect, it } from "vitest";
import { buildScoreboard } from "./scoreboard";
import { makeMatch, makeParticipant } from "@/test/factories";

const blue = (puuid: string, teamPosition: string, k = 0) =>
	makeParticipant({ puuid, teamId: 100, teamPosition, kills: k, deaths: 1, assists: 2 });
const red = (puuid: string, teamPosition: string) =>
	makeParticipant({ puuid, teamId: 200, teamPosition, win: false });

describe("buildScoreboard", () => {
	it("pairs lane opponents by position, not by array order", () => {
		const data = buildScoreboard(
			makeMatch({ participants: [blue("b-sup", "UTILITY"), blue("b-top", "TOP"), red("r-top", "TOP"), red("r-sup", "UTILITY")] }),
		);
		expect(data.rows.map((r) => [r.blue?.puuid, r.red?.puuid])).toEqual([
			["b-top", "r-top"],
			["b-sup", "r-sup"],
		]);
	});

	it("keeps the original order when positions are empty (ARAM)", () => {
		const data = buildScoreboard(makeMatch({ participants: [blue("b1", ""), blue("b2", ""), red("r1", ""), red("r2", "")] }));
		expect(data.rows.map((r) => r.blue?.puuid)).toEqual(["b1", "b2"]);
	});

	it("leaves an empty cell when a team has fewer players", () => {
		const data = buildScoreboard(makeMatch({ participants: [blue("b1", "TOP"), blue("b2", "JUNGLE"), red("r1", "TOP")] }));
		expect(data.rows).toHaveLength(2);
		expect(data.rows[1].red).toBeNull();
	});

	it("sums team K/D/A", () => {
		const data = buildScoreboard(makeMatch({ participants: [blue("b1", "TOP", 3), blue("b2", "MIDDLE", 5)] }));
		expect([data.blue.kills, data.blue.deaths, data.blue.assists]).toEqual([8, 2, 4]);
	});

	it("reads objectives and bans, defaulting missing values to zero", () => {
		const data = buildScoreboard(
			makeMatch({
				teams: [
					{
						teamId: 100,
						win: true,
						bans: [
							{ championId: 157, pickTurn: 1 },
							{ championId: -1, pickTurn: 2 },
						],
						objectives: { tower: { kills: 10 }, dragon: { kills: 2 }, baron: { kills: 1 } },
					},
					{ teamId: 200, win: false, bans: [] },
				],
			}),
		);
		expect(data.blue.bans).toEqual([157]);
		expect(data.blue.objectives).toEqual({ towers: 10, dragons: 2, barons: 1, heralds: 0, grubs: 0 });
		expect(data.red.objectives).toEqual({ towers: 0, dragons: 0, barons: 0, heralds: 0, grubs: 0 });
		expect(data.blue.win).toBe(true);
	});
});
