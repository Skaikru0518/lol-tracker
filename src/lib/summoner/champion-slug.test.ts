import { describe, expect, it } from "vitest";
import { averageKillParticipation, findChampionBySlug, legacyChampionPath } from "./champion-slug";
import { makeMatch, makeParticipant } from "@/test/factories";

const champions = {
	21: { id: "MissFortune", key: "21", name: "Miss Fortune" },
	9: { id: "Fiddlesticks", key: "9", name: "Fiddlesticks" },
};

describe("findChampionBySlug", () => {
	it("matches the DDragon id case-insensitively", () => {
		expect(findChampionBySlug(champions, "missfortune")?.key).toBe("21");
	});

	it("matches the FiddleSticks spelling used in match data", () => {
		expect(findChampionBySlug(champions, "FiddleSticks")?.key).toBe("9");
	});

	it("is null for unknown slugs or a missing map", () => {
		expect(findChampionBySlug(champions, "notachamp")).toBeNull();
		expect(findChampionBySlug(undefined, "MissFortune")).toBeNull();
	});
});

describe("legacyChampionPath", () => {
	it("moves the champion under /champions", () => {
		expect(legacyChampionPath("Skaikru-HEAVN", "Nami")).toBe("/summoner/Skaikru-HEAVN/champions/Nami");
	});

	it("does not double-encode an already encoded name", () => {
		expect(legacyChampionPath("Cool%20Guy-EUNE", "Nami")).toBe("/summoner/Cool%20Guy-EUNE/champions/Nami");
	});

	it("encodes a decoded name", () => {
		expect(legacyChampionPath("Cool Guy-EUNE", "Nami")).toBe("/summoner/Cool%20Guy-EUNE/champions/Nami");
	});
});

describe("averageKillParticipation", () => {
	const me = (kills: number, assists: number) => makeParticipant({ puuid: "me", teamId: 100, kills, assists });
	const mate = makeParticipant({ puuid: "mate", teamId: 100, kills: 10 });

	it("averages kill participation across matches", () => {
		const matches = [makeMatch({ participants: [me(5, 5), mate] }), makeMatch({ participants: [me(0, 0), mate] })];
		expect(averageKillParticipation(matches, "me")).toBe(34);
	});

	it("is null without matches", () => {
		expect(averageKillParticipation([], "me")).toBeNull();
	});
});
