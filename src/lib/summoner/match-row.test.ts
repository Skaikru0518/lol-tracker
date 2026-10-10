import { describe, expect, it } from "vitest";
import { killParticipation, participantItems, runeIcons, shortQueueName } from "./match-row";
import { makeParticipant } from "@/test/factories";

describe("participantItems", () => {
	it("lists the seven item slots in order, trinket last", () => {
		expect(participantItems(makeParticipant({ item0: 1, item3: 4, item6: 3363 }))).toEqual([1, 0, 0, 4, 0, 0, 3363]);
	});
});

describe("shortQueueName", () => {
	it("names ranked queues explicitly", () => {
		expect(shortQueueName(420, "CLASSIC")).toBe("Ranked Solo");
		expect(shortQueueName(440, "CLASSIC")).toBe("Ranked Flex");
		expect(shortQueueName(710, "CLASSIC")).toBe("Ranked 5s");
	});

	it("uses the queue table, then the game mode", () => {
		expect(shortQueueName(450, "ARAM")).toBe("ARAM");
		expect(shortQueueName(9999, "SWARM")).toBe("SWARM");
	});

	it("names Swiftplay and Quickplay instead of the CLASSIC game mode", () => {
		expect(shortQueueName(480, "CLASSIC")).toBe("Swiftplay");
		expect(shortQueueName(490, "CLASSIC")).toBe("Quickplay");
	});
});

describe("killParticipation", () => {
	const me = makeParticipant({ puuid: "me", teamId: 100, kills: 8, assists: 10 });
	const mate = makeParticipant({ puuid: "mate", teamId: 100, kills: 32 });
	const enemy = makeParticipant({ puuid: "enemy", teamId: 200, kills: 50 });

	it("is the share of the team's kills, as a whole percent", () => {
		expect(killParticipation(me, [me, mate, enemy])).toBe(45);
	});

	it("is 0 when the team has no kills", () => {
		const quiet = makeParticipant({ puuid: "q", teamId: 100 });
		expect(killParticipation(quiet, [quiet, enemy])).toBe(0);
	});
});

describe("runeIcons", () => {
	const runeData = {
		runes: new Map([[8214, { id: 8214, key: "SummonAery", name: "Aery", icon: "perk-images/aery.png" }]]),
		styles: new Map([[8400, { id: 8400, key: "Resolve", name: "Resolve", icon: "perk-images/resolve.png", runes: [] }]]),
	};
	const withRunes = makeParticipant({
		perks: {
			statPerks: { defense: 0, flex: 0, offense: 0 },
			styles: [
				{ description: "primaryStyle", style: 8200, selections: [{ perk: 8214, var1: 0, var2: 0, var3: 0 }] },
				{ description: "subStyle", style: 8400, selections: [] },
			],
		},
	});

	it("resolves the keystone and secondary tree icons", () => {
		expect(runeIcons(withRunes, runeData)).toEqual([
			"https://ddragon.leagueoflegends.com/cdn/img/perk-images/aery.png",
			"https://ddragon.leagueoflegends.com/cdn/img/perk-images/resolve.png",
		]);
	});

	it("returns nulls without rune data or perks", () => {
		expect(runeIcons(withRunes, undefined)).toEqual([null, null]);
		expect(runeIcons(makeParticipant(), runeData)).toEqual([null, null]);
	});
});
