import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: { account: { findMany: vi.fn() } } }));

const { prisma } = await import("@/lib/db");
const { searchSummoners } = await import("./search");

describe("searchSummoners", () => {
	beforeEach(() => {
		vi.mocked(prisma.account.findMany).mockReset();
		vi.mocked(prisma.account.findMany).mockResolvedValue([]);
	});

	it("escapes LIKE wildcards in the exact-name query too (Prisma's insensitive equals is ILIKE)", async () => {
		await searchSummoners({ name: "Sk_ikru%", tag: null });
		const names = vi.mocked(prisma.account.findMany).mock.calls.map((call) => (call[0] as { where: { gameName: object } }).where.gameName);
		expect(names).toContainEqual({ equals: String.raw`Sk\_ikru\%`, mode: "insensitive" });
		expect(names).toContainEqual({ startsWith: String.raw`Sk\_ikru\%`, mode: "insensitive" });
	});
});
