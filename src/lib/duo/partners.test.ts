import { describe, expect, it } from "vitest";
import { duoPartners, sharedGames, type DuoGame, type DuoParticipant } from "./partners";

const ME = "me";

function player(puuid: string, overrides: Partial<DuoParticipant> = {}): DuoParticipant {
	return {
		puuid,
		teamId: 100,
		win: true,
		teamPosition: "MIDDLE",
		championName: "Ahri",
		kills: 1,
		deaths: 1,
		assists: 1,
		riotIdGameName: puuid,
		riotIdTagline: "EUNE",
		profileIcon: 1,
		...overrides,
	};
}

/** One game; `mates` are on my team, `enemies` on the other one. */
function game(
	matchId: string,
	{ win = true, mates = [], enemies = [] }: { win?: boolean; mates?: (string | DuoParticipant)[]; enemies?: string[] } = {},
): DuoGame {
	const team = mates.map((m) => (typeof m === "string" ? player(m, { win }) : { ...m, win }));
	return {
		matchId,
		queueId: 420,
		gameCreation: Number(matchId.replace(/\D/g, "")) || 0,
		participants: [player(ME, { win }), ...team, ...enemies.map((e) => player(e, { teamId: 200, win: !win }))],
	};
}

const ids = (partners: { puuid: string }[]) => partners.map((p) => p.puuid);

describe("duoPartners", () => {
	it("lists teammates with 3+ shared games, most games first", () => {
		const games = [
			game("g1", { mates: ["A", "B", "C"] }),
			game("g2", { mates: ["A", "B", "C"] }),
			game("g3", { mates: ["A", "B"] }),
			game("g4", { mates: ["A"] }),
		];
		expect(ids(duoPartners(games, ME))).toEqual(["A", "B"]);
	});

	it("ignores opponents", () => {
		const games = Array.from({ length: 5 }, (_, i) => game(`g${i}`, { enemies: ["X"] }));
		expect(duoPartners(games, ME)).toEqual([]);
	});

	it("computes win rate together and the difference from games without them", () => {
		const games = [
			game("g1", { mates: ["A"], win: true }),
			game("g2", { mates: ["A"], win: true }),
			game("g3", { mates: ["A"], win: true }),
			game("g4", { mates: ["A"], win: false }),
			game("g5", { win: false }),
			game("g6", { win: false }),
		];
		expect(duoPartners(games, ME)[0]).toMatchObject({ games: 4, wins: 3, winRate: 75, difference: 75 });
	});

	it("gives no difference when every game had the partner", () => {
		const games = [game("g1", { mates: ["A"] }), game("g2", { mates: ["A"] }), game("g3", { mates: ["A"] })];
		expect(duoPartners(games, ME)[0].difference).toBeNull();
	});

	it("names a partner after their latest shared game", () => {
		const games = [
			game("g3", { mates: [player("A", { riotIdGameName: "NewName" })] }),
			game("g2", { mates: [player("A", { riotIdGameName: "OldName" })] }),
			game("g1", { mates: [player("A", { riotIdGameName: "OldName" })] }),
		];
		expect(duoPartners(games, ME)[0].gameName).toBe("NewName");
	});

	it("names a partner without a Riot ID Unknown", () => {
		const games = ["g1", "g2", "g3"].map((id) => game(id, { mates: [player("A", { riotIdGameName: "" })] }));
		expect(duoPartners(games, ME)[0].gameName).toBe("Unknown");
	});

	it("picks the partner's most frequent role, ignoring empty positions", () => {
		const roles = (positions: string[]) =>
			duoPartners(
				positions.map((teamPosition, i) => game(`g${i}`, { mates: [player("A", { teamPosition })] })),
				ME,
			)[0].role;
		expect(roles(["JUNGLE", "JUNGLE", ""])).toBe("JUNGLE");
		expect(roles(["", "", ""])).toBeNull();
	});

	it("caps the list", () => {
		const mates = Array.from({ length: 12 }, (_, i) => `M${i}`);
		const games = ["g1", "g2", "g3"].map((id) => game(id, { mates }));
		expect(duoPartners(games, ME)).toHaveLength(10);
	});
});

describe("sharedGames", () => {
	it("keeps only same-team games", () => {
		const games = [game("g1", { mates: ["A"] }), game("g2", { enemies: ["A"] }), game("g3", { mates: ["A"] })];
		expect(sharedGames(games, ME, "A").map((g) => g.matchId)).toEqual(["g1", "g3"]);
	});
});
