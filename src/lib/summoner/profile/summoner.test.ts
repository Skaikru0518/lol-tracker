import { beforeEach, describe, expect, it, vi } from "vitest";
import { RiotApiError } from "@/lib/riot/riot";

vi.mock("@/lib/riot/summoner", () => ({ getSummonerByPuuid: vi.fn() }));
vi.mock("@/lib/server/db", () => ({
	prisma: { summoner: { findUnique: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() } },
}));

const { getSummonerByPuuid } = await import("@/lib/riot/summoner");
const { prisma } = await import("@/lib/server/db");
const { resolveSummoner } = await import("./summoner");

const staleRow = { puuid: "p1", profileIconId: 1, summonerLevel: 30, revisionDate: BigInt(1), updatedAt: new Date(0) };
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("resolveSummoner", () => {
	beforeEach(() => {
		vi.mocked(getSummonerByPuuid).mockReset();
		vi.mocked(prisma.summoner.findUnique).mockReset().mockResolvedValue(staleRow as never);
		vi.mocked(prisma.summoner.deleteMany).mockReset();
	});

	it("drops the cached summoner when its platform no longer has it, so the next load re-locates the account", async () => {
		vi.mocked(getSummonerByPuuid).mockRejectedValue(new RiotApiError(404, "Not Found"));
		await resolveSummoner("eune", "p1", "eune");
		await flush();
		expect(prisma.summoner.deleteMany).toHaveBeenCalledWith({ where: { puuid: "p1" } });
	});

	it("keeps the cached summoner when the refresh fails for another reason", async () => {
		vi.mocked(getSummonerByPuuid).mockRejectedValue(new RiotApiError(503, "Unavailable"));
		await resolveSummoner("eune", "p1", "eune");
		await flush();
		expect(prisma.summoner.deleteMany).not.toHaveBeenCalled();
	});
});
