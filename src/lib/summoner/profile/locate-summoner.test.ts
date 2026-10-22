import { beforeEach, describe, expect, it, vi } from "vitest";
import { RiotApiError } from "@/lib/riot/riot";

vi.mock("@/lib/riot/account", () => ({ getActiveRegion: vi.fn() }));
vi.mock("./summoner", () => ({ resolveSummoner: vi.fn() }));
vi.mock("./account", () => ({ resolveAccount: vi.fn() }));
vi.mock("@/lib/server/db", () => ({
	prisma: {
		account: { findUnique: vi.fn(), update: vi.fn() },
		rankedEntry: { deleteMany: vi.fn() },
		championMastery: { deleteMany: vi.fn() },
		$transaction: vi.fn().mockResolvedValue([]),
	},
}));

const { getActiveRegion } = await import("@/lib/riot/account");
const { resolveSummoner } = await import("./summoner");
const { prisma } = await import("@/lib/server/db");
const { locateSummoner } = await import("./locate-summoner");

const summoner = { puuid: "p1", profileIconId: 1, summonerLevel: 30, revisionDate: 1 };

describe("locateSummoner", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(resolveSummoner).mockImplementation(async (platform) => (platform === "euw" ? summoner : null));
		vi.mocked(getActiveRegion).mockResolvedValue({ puuid: "p1", game: "lol", region: "euw1" });
	});

	it("moves an account to its new platform and drops the old platform's ranked and mastery rows", async () => {
		vi.mocked(prisma.account.findUnique).mockResolvedValue({ platform: "eune" } as never);
		expect(await locateSummoner("p1", null)).toEqual({ platform: "euw", summoner });
		expect(prisma.rankedEntry.deleteMany).toHaveBeenCalledWith({ where: { puuid: "p1" } });
		expect(prisma.championMastery.deleteMany).toHaveBeenCalledWith({ where: { puuid: "p1" } });
		expect(prisma.account.update).toHaveBeenCalledWith({ where: { puuid: "p1" }, data: { platform: "euw", masteriesSyncedAt: null } });
	});

	it("only records the platform of a newly resolved account", async () => {
		vi.mocked(prisma.account.findUnique).mockResolvedValue({ platform: null } as never);
		await locateSummoner("p1", null);
		expect(prisma.rankedEntry.deleteMany).not.toHaveBeenCalled();
		expect(prisma.account.update).toHaveBeenCalledWith({ where: { puuid: "p1" }, data: { platform: "euw" } });
	});

	it("leaves the account alone when it stays on its platform", async () => {
		vi.mocked(prisma.account.findUnique).mockResolvedValue({ platform: "euw" } as never);
		await locateSummoner("p1", null);
		expect(prisma.account.update).not.toHaveBeenCalled();
	});

	it("rethrows active-region errors other than 404", async () => {
		vi.mocked(prisma.account.findUnique).mockResolvedValue({ platform: "eune" } as never);
		vi.mocked(getActiveRegion).mockRejectedValue(new RiotApiError(429, "Rate limit exceeded"));
		await expect(locateSummoner("p1", null)).rejects.toBeInstanceOf(RiotApiError);
	});
});
