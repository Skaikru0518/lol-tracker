import { beforeEach, describe, expect, it, vi } from "vitest";
import { RiotApiError } from "@/lib/riot/riot";

vi.mock("@/lib/summoner/profile/account", () => ({ resolveAccount: vi.fn() }));
vi.mock("@/lib/riot/spectator", () => ({ getLiveGame: vi.fn() }));
vi.mock("@/lib/summoner/profile/ranked", () => ({ resolveRankedEntries: vi.fn() }));
vi.mock("@/lib/summoner/champions/mastery", () => ({ resolveTopMasteries: vi.fn() }));
vi.mock("@/lib/riot/matches", () => ({ getMatchIdsByPuuid: vi.fn() }));
vi.mock("@/lib/match/store", () => ({ fetchAndStoreMatch: vi.fn() }));
vi.mock("@/lib/summoner/profile/locate-summoner", () => ({ recordPlatform: vi.fn() }));
vi.mock("./role-query", () => ({ storedPositionCounts: vi.fn() }));
vi.mock("@/lib/server/db", () => ({
	prisma: {
		account: { findUnique: vi.fn(), upsert: vi.fn() },
		playerAchievement: { findMany: vi.fn() },
		match: { findMany: vi.fn() },
	},
}));

const { resolveAccount } = await import("@/lib/summoner/profile/account");
const { getLiveGame } = await import("@/lib/riot/spectator");
const { resolveRankedEntries } = await import("@/lib/summoner/profile/ranked");
const { resolveTopMasteries } = await import("@/lib/summoner/champions/mastery");
const { getMatchIdsByPuuid } = await import("@/lib/riot/matches");
const { fetchAndStoreMatch } = await import("@/lib/match/store");
const { recordPlatform } = await import("@/lib/summoner/profile/locate-summoner");
const { prisma } = await import("@/lib/server/db");
const { storedPositionCounts } = await import("./role-query");
const { buildOverlayGame, clearOverlayCache } = await import("./overlay-game");

const query = { gameName: "Name0", tagLine: "EUW", platform: "euw" as const, since: 1_000 };

function participant(i: number, riotId = `Name${i}#EUW`, puuid = `p${i}`) {
	return { puuid, riotId, championId: 100 + i, teamId: i < 5 ? 100 : 200, summonerId: "", spell1Id: 4, spell2Id: 14, perks: { perkIds: [], perkStyle: 0, perkSubStyle: 0 } };
}

function liveGame(queueId = 420, participants = Array.from({ length: 10 }, (_, i) => participant(i))) {
	return { gameId: 77, gameMode: "CLASSIC", gameType: "MATCHED", gameLength: 0, gameStartTime: 5_000, mapId: 11, bannedChampions: [], gameQueueConfigId: queueId, participants };
}

function storedMatch(id: string, puuid: string) {
	return { metadata: { matchId: id }, info: { queueId: 420, gameCreation: 2_000, gameDuration: 1800, participants: [{ puuid, win: true }] } };
}

const solo = { queueType: "RANKED_SOLO_5x5", tier: "EMERALD", rank: "II", leaguePoints: 54, wins: 30, losses: 20, hotStreak: false, veteran: false, freshBlood: false, inactive: false };
const flex = { ...solo, queueType: "RANKED_FLEX_SR", tier: "GOLD" };

describe("buildOverlayGame", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearOverlayCache();
		vi.mocked(resolveAccount).mockResolvedValue({ puuid: "p0", gameName: "Name0", tagLine: "EUW" });
		vi.mocked(getLiveGame).mockResolvedValue(liveGame() as never);
		vi.mocked(prisma.account.findUnique).mockResolvedValue({ platform: "euw" } as never);
		vi.mocked(resolveRankedEntries).mockResolvedValue([solo, flex]);
		vi.mocked(resolveTopMasteries).mockResolvedValue([1, 2, 3, 4].map((championId) => ({ championId }) as never));
		vi.mocked(prisma.playerAchievement.findMany).mockResolvedValue([{ achievementId: "win-streak" }] as never);
		vi.mocked(getMatchIdsByPuuid).mockResolvedValue([]);
		vi.mocked(prisma.match.findMany).mockResolvedValue([]);
		vi.mocked(storedPositionCounts).mockResolvedValue([{ position: "MIDDLE", games: 10 }]);
	});

	it("returns not-in-game when spectator has no game", async () => {
		vi.mocked(getLiveGame).mockRejectedValue(new RiotApiError(404, "Not Found"));
		expect(await buildOverlayGame(query)).toEqual({ inGame: false });
	});

	it("builds ten cards with rank, mains, today and tags", async () => {
		vi.mocked(getLiveGame).mockResolvedValue(liveGame(440) as never);
		const game = await buildOverlayGame(query);
		if (!game.inGame) throw new Error("expected a game");
		expect(game.players).toHaveLength(10);
		const self = game.players.find((p) => p.isSelf);
		expect(self?.puuid).toBe("p0");
		expect(self?.rank?.queueType).toBe("RANKED_FLEX_SR");
		expect(self?.mains).toEqual([1, 2, 3]);
		expect(self?.tags).toEqual(["on-fire"]);
		expect(self?.today).toEqual({ wins: 0, losses: 0, partial: false });
		expect(self?.unavailable).toEqual([]);
		expect(game.players.filter((p) => p.isSelf)).toHaveLength(1);
	});

	it("creates accounts with the real Riot ID and the game's platform", async () => {
		await buildOverlayGame(query);
		expect(prisma.account.upsert).toHaveBeenCalledWith(
			expect.objectContaining({ where: { puuid: "p3" }, create: { puuid: "p3", gameName: "Name3", tagLine: "EUW", platform: "euw" } }),
		);
	});

	it("moves an account whose stored platform differs", async () => {
		vi.mocked(prisma.account.findUnique).mockImplementation((async ({ where }: { where: { puuid: string } }) => ({ platform: where.puuid === "p1" ? "eune" : "euw" })) as never);
		await buildOverlayGame(query);
		expect(recordPlatform).toHaveBeenCalledWith("p1", "eune", "euw");
		expect(recordPlatform).toHaveBeenCalledTimes(1);
	});

	it("skips bots and blank Riot IDs", async () => {
		const players = [participant(0), participant(1, "", ""), ...Array.from({ length: 8 }, (_, i) => participant(i + 2))];
		vi.mocked(getLiveGame).mockResolvedValue(liveGame(420, players) as never);
		const game = await buildOverlayGame(query);
		if (!game.inGame) throw new Error("expected a game");
		const upserted = vi.mocked(prisma.account.upsert).mock.calls.map(([args]) => args.where.puuid);
		expect(upserted).not.toContain("");
		expect(game.players[1]).toMatchObject({ rank: null, mains: [], today: null, unavailable: ["rank", "mains", "today"] });
	});

	it("caps new match fetches at 30 and marks those players partial", async () => {
		vi.mocked(getMatchIdsByPuuid).mockImplementation(async (puuid) => Array.from({ length: 5 }, (_, i) => `${puuid}-m${i}`));
		vi.mocked(fetchAndStoreMatch).mockImplementation(async (id) => storedMatch(id, id.split("-")[0]) as never);
		const game = await buildOverlayGame(query);
		if (!game.inGame) throw new Error("expected a game");
		expect(fetchAndStoreMatch).toHaveBeenCalledTimes(30);
		expect(game.players.some((p) => p.today?.partial)).toBe(true);
		expect(game.players[0].today).toEqual({ wins: 3, losses: 0, partial: true });
	});

	it("stops calling Riot after a 429 and still answers", async () => {
		vi.mocked(getMatchIdsByPuuid).mockImplementation(async (puuid) => [`${puuid}-m0`]);
		vi.mocked(fetchAndStoreMatch).mockRejectedValue(new RiotApiError(429, "Rate limit exceeded"));
		const game = await buildOverlayGame(query);
		if (!game.inGame) throw new Error("expected a game");
		expect(fetchAndStoreMatch).toHaveBeenCalledTimes(1);
		expect(game.players.every((p) => p.unavailable.includes("today") && p.today === null)).toBe(true);
		expect(game.players[0].rank).not.toBeNull();
	});

	it("does not fetch match details after a 429 in the parallel phase", async () => {
		vi.mocked(getMatchIdsByPuuid).mockImplementation(async (puuid) => {
			if (puuid === "p2") throw new RiotApiError(429, "Rate limit exceeded");
			return [`${puuid}-m0`];
		});
		const game = await buildOverlayGame(query);
		if (!game.inGame) throw new Error("expected a game");
		expect(fetchAndStoreMatch).not.toHaveBeenCalled();
		expect(game.players[2].unavailable).toContain("today");
	});

	it("has no today record for custom games", async () => {
		vi.mocked(getLiveGame).mockResolvedValue(liveGame(0) as never);
		const game = await buildOverlayGame(query);
		if (!game.inGame) throw new Error("expected a game");
		expect(getMatchIdsByPuuid).not.toHaveBeenCalled();
		expect(game.players.every((p) => p.today === null && !p.unavailable.includes("today"))).toBe(true);
	});

	it("adds the main role from stored matches, skipping bots", async () => {
		const players = [participant(0), participant(1, "", ""), ...Array.from({ length: 8 }, (_, i) => participant(i + 2))];
		vi.mocked(getLiveGame).mockResolvedValue(liveGame(420, players) as never);
		const game = await buildOverlayGame(query);
		if (!game.inGame) throw new Error("expected a game");
		expect(game.players[0].role).toBe("MIDDLE");
		expect(game.players[1].role).toBeNull();
		expect(storedPositionCounts).not.toHaveBeenCalledWith("");
		expect(storedPositionCounts).toHaveBeenCalledTimes(9);
	});

	it("serves a teammate's request from the cache with their own card as self", async () => {
		await buildOverlayGame(query, 0);
		vi.mocked(resolveAccount).mockResolvedValue({ puuid: "p1", gameName: "Name1", tagLine: "EUW" });
		const game = await buildOverlayGame({ ...query, gameName: "Name1" }, 30_000);
		if (!game.inGame) throw new Error("expected a game");
		expect(getLiveGame).toHaveBeenCalledTimes(1);
		expect(game.players.find((p) => p.isSelf)?.puuid).toBe("p1");
		await buildOverlayGame(query, 61_000);
		expect(getLiveGame).toHaveBeenCalledTimes(2);
	});
});
