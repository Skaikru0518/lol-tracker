import { beforeEach, describe, expect, it, vi } from "vitest";
import { RiotApiError } from "@/lib/riot/riot";

vi.mock("@/lib/riot/mastery", () => ({ getAllMasteries: vi.fn(), getTopMasteries: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { championMastery: { findMany: vi.fn(), upsert: vi.fn() } } }));

const { getAllMasteries } = await import("@/lib/riot/mastery");
const { prisma } = await import("@/lib/db");
const { resolveAllMasteries } = await import("./mastery");

const riotRow = {
	puuid: "p1",
	championId: 267,
	championLevel: 10,
	championPoints: 412000,
	lastPlayTime: 1_700_000_000_000,
	championPointsSinceLastLevel: 0,
	championPointsUntilNextLevel: 0,
};

describe("resolveAllMasteries", () => {
	beforeEach(() => {
		vi.mocked(getAllMasteries).mockReset();
		vi.mocked(prisma.championMastery.findMany).mockReset();
	});

	it("returns every champion from Riot with a numeric lastPlayTime", async () => {
		vi.mocked(getAllMasteries).mockResolvedValue([riotRow, { ...riotRow, championId: 99, championPoints: 10 }]);
		const result = await resolveAllMasteries("p1");
		expect(result.map((m) => m.championId)).toEqual([267, 99]);
		expect(typeof result[0].lastPlayTime).toBe("number");
		expect(prisma.championMastery.findMany).not.toHaveBeenCalled();
	});

	it("falls back to stored rows ordered by points when Riot fails", async () => {
		vi.mocked(getAllMasteries).mockRejectedValue(new RiotApiError(503, "Riot API error: 503"));
		vi.mocked(prisma.championMastery.findMany).mockResolvedValue([
			{ id: "a", puuid: "p1", championId: 267, championLevel: 10, championPoints: 412000, lastPlayTime: BigInt(5), updatedAt: new Date() },
		] as never);
		const result = await resolveAllMasteries("p1");
		expect(result).toEqual([
			expect.objectContaining({ championId: 267, championPoints: 412000, lastPlayTime: 5 }),
		]);
		expect(prisma.championMastery.findMany).toHaveBeenCalledWith({ where: { puuid: "p1" }, orderBy: { championPoints: "desc" } });
	});

	it("returns an empty list for a player with no mastery", async () => {
		vi.mocked(getAllMasteries).mockResolvedValue([]);
		expect(await resolveAllMasteries("p1")).toEqual([]);
	});
});
