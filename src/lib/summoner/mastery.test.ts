import { beforeEach, describe, expect, it, vi } from "vitest";
import { RiotApiError } from "@/lib/riot/riot";

vi.mock("@/lib/riot/mastery", () => ({ getAllMasteries: vi.fn(), getTopMasteries: vi.fn() }));
vi.mock("@/lib/db", () => ({
	prisma: {
		championMastery: { findMany: vi.fn(), upsert: vi.fn() },
		account: { findUnique: vi.fn(), updateMany: vi.fn() },
		$transaction: vi.fn().mockResolvedValue([]),
	},
}));

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
		vi.mocked(prisma.championMastery.findMany).mockResolvedValue([]);
		vi.mocked(prisma.account.findUnique).mockResolvedValue({ masteriesSyncedAt: null } as never);
	});

	it("asks Riot for legacy top-5 rows that were never fully synced", async () => {
		const legacy = Array.from({ length: 8 }, (_, i) => ({ id: String(i), puuid: "p1", championId: i + 1, championLevel: 5, championPoints: 100, lastPlayTime: BigInt(1), updatedAt: new Date() }));
		vi.mocked(prisma.championMastery.findMany).mockResolvedValue(legacy as never);
		vi.mocked(getAllMasteries).mockResolvedValue([riotRow]);
		await resolveAllMasteries("p1");
		expect(getAllMasteries).toHaveBeenCalledWith("p1");
	});

	it("asks Riot when nothing is stored and returns every champion with a numeric lastPlayTime", async () => {
		vi.mocked(getAllMasteries).mockResolvedValue([riotRow, { ...riotRow, championId: 99, championPoints: 10 }]);
		const result = await resolveAllMasteries("p1");
		expect(result.map((m) => m.championId)).toEqual([267, 99]);
		expect(typeof result[0].lastPlayTime).toBe("number");
		expect(getAllMasteries).toHaveBeenCalledWith("p1");
	});

	it("serves the stored list without calling Riot once a full sync is recent", async () => {
		vi.mocked(prisma.account.findUnique).mockResolvedValue({ masteriesSyncedAt: new Date() } as never);
		const stored = Array.from({ length: 8 }, (_, i) => ({ id: String(i), puuid: "p1", championId: i + 1, championLevel: 5, championPoints: 1000 - i, lastPlayTime: BigInt(1), updatedAt: new Date() }));
		vi.mocked(prisma.championMastery.findMany).mockResolvedValue(stored as never);
		const result = await resolveAllMasteries("p1");
		expect(result).toHaveLength(8);
		expect(getAllMasteries).not.toHaveBeenCalled();
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

	it("stores every champion Riot returned and marks the list synced", async () => {
		vi.mocked(prisma.$transaction).mockClear();
		vi.mocked(getAllMasteries).mockResolvedValue([riotRow, { ...riotRow, championId: 99 }]);
		await resolveAllMasteries("p1");
		await vi.waitFor(() => expect(prisma.$transaction).toHaveBeenCalledTimes(1));
		const [operations] = vi.mocked(prisma.$transaction).mock.calls[0] as unknown as [unknown[]];
		expect(operations).toHaveLength(3);
		expect(prisma.account.updateMany).toHaveBeenCalledWith({ where: { puuid: "p1" }, data: { masteriesSyncedAt: expect.any(Date) } });
	});

	it("serves a stale full list and refreshes it once in the background, even for parallel requests", async () => {
		vi.mocked(prisma.$transaction).mockClear();
		const stored = [{ id: "a", puuid: "p1", championId: 267, championLevel: 10, championPoints: 5, lastPlayTime: BigInt(1), updatedAt: new Date() }];
		vi.mocked(prisma.championMastery.findMany).mockResolvedValue(stored as never);
		vi.mocked(prisma.account.findUnique).mockResolvedValue({ masteriesSyncedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) } as never);
		let release!: (rows: (typeof riotRow)[]) => void;
		vi.mocked(getAllMasteries).mockReturnValue(new Promise((resolve) => (release = resolve)));
		const [first, second] = await Promise.all([resolveAllMasteries("p1"), resolveAllMasteries("p1")]);
		expect(first.map((m) => m.championPoints)).toEqual([5]);
		expect(second).toHaveLength(1);
		expect(getAllMasteries).toHaveBeenCalledTimes(1);
		release([riotRow]);
		await vi.waitFor(() => expect(prisma.$transaction).toHaveBeenCalledTimes(1));
	});
});
