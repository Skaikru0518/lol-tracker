import { describe, expect, it, vi } from "vitest";

const match = { metadata: { matchId: "EUN1_1" }, info: { queueId: 420, gameMode: "CLASSIC", gameDuration: 1800, gameCreation: 1761350400000, participants: [] } };

vi.mock("@/lib/riot/matches", () => ({ getMatchById: vi.fn() }));
vi.mock("@/lib/server/db", () => ({ prisma: { match: { upsert: vi.fn() } } }));

const { getMatchById } = await import("@/lib/riot/matches");
const { prisma } = await import("@/lib/server/db");
const { fetchAndStoreMatch } = await import("./store");

describe("fetchAndStoreMatch", () => {
	it("stores a fetched match once and returns it", async () => {
		vi.mocked(getMatchById).mockResolvedValue(match as never);
		expect(await fetchAndStoreMatch("EUN1_1")).toBe(match);
		const args = vi.mocked(prisma.match.upsert).mock.calls[0][0];
		expect(args.where).toEqual({ matchId: "EUN1_1" });
		expect(args.update).toEqual({});
		expect(args.create.gameCreation).toBe(BigInt(1761350400000));
		expect(args.create.queueId).toBe(420);
	});
});
