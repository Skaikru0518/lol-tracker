import { beforeEach, describe, expect, it, vi } from "vitest";
import { RiotApiError } from "@/lib/riot/riot";

vi.mock("@/lib/summoner/profile/account", () => ({ resolveAccount: vi.fn() }));
vi.mock("@/lib/summoner/profile/locate-summoner", () => ({ locateSummoner: vi.fn() }));
vi.mock("@/lib/summoner/profile/ranked", () => ({ saveRankedEntries: vi.fn() }));
vi.mock("@/lib/riot/ranked", () => ({ getRankedByPuuid: vi.fn() }));
vi.mock("@/lib/riot/matches", () => ({ getMatchIdsByPuuid: vi.fn() }));
vi.mock("@/lib/riot/spectator", () => ({ getLiveGame: vi.fn() }));
vi.mock("@/lib/match/store", () => ({ fetchAndStoreMatch: vi.fn() }));
vi.mock("@/lib/game/icon-helpers", () => ({
	getDDragonVersion: vi.fn().mockResolvedValue("16.21.1"),
	getChampionMap: vi.fn().mockResolvedValue({ 103: { id: "Ahri" } }),
}));
vi.mock("@/lib/server/db", () => ({
	prisma: {
		rankedEntry: { findUnique: vi.fn() },
		match: { findMany: vi.fn() },
		lPHistory: { findFirst: vi.fn() },
	},
}));

const { resolveAccount } = await import("@/lib/summoner/profile/account");
const { locateSummoner } = await import("@/lib/summoner/profile/locate-summoner");
const { saveRankedEntries } = await import("@/lib/summoner/profile/ranked");
const { getRankedByPuuid } = await import("@/lib/riot/ranked");
const { getMatchIdsByPuuid } = await import("@/lib/riot/matches");
const { getLiveGame } = await import("@/lib/riot/spectator");
const { fetchAndStoreMatch } = await import("@/lib/match/store");
const { prisma } = await import("@/lib/server/db");
const { buildWidgetData, clearWidgetState } = await import("./widget-data");

const MIN = 60_000;
const NOW = 100 * 60 * MIN;
const SLUG = "Skaikru-HEAVN";

function match(id: string, start: number, win = true) {
	return {
		metadata: { matchId: id },
		info: { gameCreation: start, gameDuration: 1800, queueId: 420, participants: [{ puuid: "me", championName: "Ahri", win, kills: 1, deaths: 2, assists: 3 }] },
	};
}

let entry = { tier: "EMERALD", rank: "II", leaguePoints: 54, wins: 22, losses: 19 };

beforeEach(() => {
	vi.clearAllMocks();
	clearWidgetState();
	entry = { tier: "EMERALD", rank: "II", leaguePoints: 54, wins: 22, losses: 19 };
	vi.mocked(resolveAccount).mockResolvedValue({ puuid: "me", gameName: "Skaikru", tagLine: "HEAVN" } as never);
	vi.mocked(locateSummoner).mockResolvedValue({ platform: "eune", summoner: {} } as never);
	vi.mocked(getRankedByPuuid).mockResolvedValue([]);
	vi.mocked(prisma.rankedEntry.findUnique).mockImplementation((async () => entry) as never);
	vi.mocked(getMatchIdsByPuuid).mockResolvedValue(["m2", "m1"]);
	vi.mocked(prisma.match.findMany).mockResolvedValue([{ matchId: "m1", data: match("m1", NOW - 90 * MIN) }] as never);
	vi.mocked(fetchAndStoreMatch).mockResolvedValue(match("m2", NOW - 50 * MIN, false) as never);
	vi.mocked(prisma.lPHistory.findFirst).mockResolvedValue({ tier: "EMERALD", rank: "II", lp: 60, wins: 21, losses: 18 } as never);
	vi.mocked(getLiveGame).mockRejectedValue(new RiotApiError(404, "not in game"));
});

describe("buildWidgetData", () => {
	it("returns rank, the auto session and its LP change", async () => {
		const data = await buildWidgetData(SLUG, { queue: "solo", live: false }, NOW);
		expect(data).toMatchObject({ gameName: "Skaikru", tagLine: "HEAVN", platform: "eune", rank: { tier: "EMERALD", division: "II", leaguePoints: 54 }, lpChange: -6, liveChampion: null });
		expect(data?.games.map((g) => [g.matchId, g.win])).toEqual([["m1", true], ["m2", false]]);
		expect(fetchAndStoreMatch).toHaveBeenCalledWith("m2");
		expect(saveRankedEntries).toHaveBeenCalledWith("me", []);
	});

	it("filters by since instead of the auto window", async () => {
		const data = await buildWidgetData(SLUG, { queue: "solo", since: NOW - 60 * MIN, live: false }, NOW);
		expect(data?.games.map((g) => g.matchId)).toEqual(["m2"]);
	});

	it("asks for the flex queue", async () => {
		await buildWidgetData(SLUG, { queue: "flex", live: false }, NOW);
		expect(getMatchIdsByPuuid).toHaveBeenCalledWith("me", 20, 0, expect.objectContaining({ queue: 440 }));
		expect(prisma.rankedEntry.findUnique).toHaveBeenCalledWith({ where: { puuid_queueType: { puuid: "me", queueType: "RANKED_FLEX_SR" } } });
	});

	it("is null for an unknown Riot ID", async () => {
		vi.mocked(resolveAccount).mockRejectedValue(new RiotApiError(404, "nope"));
		expect(await buildWidgetData(SLUG, { queue: "solo", live: false }, NOW)).toBeNull();
		expect(await buildWidgetData("no-dash-at-end-", { queue: "solo", live: false }, NOW)).toBeNull();
	});

	it("refreshes ranked at most once a minute", async () => {
		await buildWidgetData(SLUG, { queue: "solo", live: false }, NOW);
		await buildWidgetData(SLUG, { queue: "solo", live: false }, NOW + 30_000);
		expect(getRankedByPuuid).toHaveBeenCalledTimes(1);
		await buildWidgetData(SLUG, { queue: "solo", live: false }, NOW + MIN);
		expect(getRankedByPuuid).toHaveBeenCalledTimes(2);
	});

	it("refetches match ids only when W/L changed or after five minutes", async () => {
		await buildWidgetData(SLUG, { queue: "solo", live: false }, NOW);
		await buildWidgetData(SLUG, { queue: "solo", live: false }, NOW + 2 * MIN);
		expect(getMatchIdsByPuuid).toHaveBeenCalledTimes(1);

		entry = { ...entry, wins: 23 };
		await buildWidgetData(SLUG, { queue: "solo", live: false }, NOW + 3 * MIN);
		expect(getMatchIdsByPuuid).toHaveBeenCalledTimes(2);

		await buildWidgetData(SLUG, { queue: "solo", live: false }, NOW + 8 * MIN);
		expect(getMatchIdsByPuuid).toHaveBeenCalledTimes(3);
	});

	it("checks the live game only when asked, at most every two minutes", async () => {
		await buildWidgetData(SLUG, { queue: "solo", live: false }, NOW);
		expect(getLiveGame).not.toHaveBeenCalled();

		vi.mocked(getLiveGame).mockResolvedValue({ participants: [{ puuid: "me", championId: 103 }] } as never);
		const live = await buildWidgetData(SLUG, { queue: "solo", live: true }, NOW);
		expect(live?.liveChampion).toBe("Ahri");
		await buildWidgetData(SLUG, { queue: "solo", live: true }, NOW + MIN);
		expect(getLiveGame).toHaveBeenCalledTimes(1);
		await buildWidgetData(SLUG, { queue: "solo", live: true }, NOW + 2 * MIN);
		expect(getLiveGame).toHaveBeenCalledTimes(2);
	});

	it("stops calling Riot after a 429 and returns what is stored", async () => {
		vi.mocked(getRankedByPuuid).mockRejectedValue(new RiotApiError(429, "limited"));
		const data = await buildWidgetData(SLUG, { queue: "solo", live: true }, NOW);
		expect(getMatchIdsByPuuid).not.toHaveBeenCalled();
		expect(getLiveGame).not.toHaveBeenCalled();
		expect(data?.rank).toEqual({ tier: "EMERALD", division: "II", leaguePoints: 54 });
		expect(data?.games).toEqual([]);
	});

	it("keeps going without LP change when the baseline is stale", async () => {
		vi.mocked(prisma.lPHistory.findFirst).mockResolvedValue({ tier: "EMERALD", rank: "II", lp: 60, wins: 19, losses: 18 } as never);
		const data = await buildWidgetData(SLUG, { queue: "solo", live: false }, NOW);
		expect(data?.lpChange).toBeNull();
	});

	it("shows unranked with the session still there", async () => {
		vi.mocked(prisma.rankedEntry.findUnique).mockResolvedValue(null);
		const data = await buildWidgetData(SLUG, { queue: "solo", live: false }, NOW);
		expect(data?.rank).toBeNull();
		expect(data?.lpChange).toBeNull();
		expect(data?.games).toHaveLength(2);
	});
});
