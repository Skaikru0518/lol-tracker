import { describe, expect, it } from "vitest";
import { duoPartnersSchema } from "./duo";

const row = { puuid: "a", gameName: "Kestrel", tagLine: "EUNE", profileIcon: 1, games: 4, wins: 3, winRate: 75, difference: null, role: "JUNGLE" };

describe("duoPartnersSchema", () => {
	it("parses a partner list and rejects a missing win rate", () => {
		expect(duoPartnersSchema.parse([row])).toEqual([row]);
		const { winRate: _, ...broken } = row;
		expect(() => duoPartnersSchema.parse([broken])).toThrow();
	});
});
