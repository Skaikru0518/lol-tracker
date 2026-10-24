import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./riot", () => ({ EUROPE_URL: "https://europe.api.riotgames.com", riotFetch: vi.fn().mockResolvedValue([]) }));

const { riotFetch } = await import("./riot");
const { getMatchIdsByPuuid } = await import("./matches");

describe("getMatchIdsByPuuid", () => {
	beforeEach(() => vi.mocked(riotFetch).mockClear());

	it("adds startTime and queue filters to the ids request", async () => {
		await getMatchIdsByPuuid("p1", 20, 0, { startTime: 1761350400, queue: 420 });
		const url = new URL(vi.mocked(riotFetch).mock.calls[0][0]);
		expect(url.searchParams.get("count")).toBe("20");
		expect(url.searchParams.get("startTime")).toBe("1761350400");
		expect(url.searchParams.get("queue")).toBe("420");
	});

	it("omits filters that are not given", async () => {
		await getMatchIdsByPuuid("p1", 20);
		const url = new URL(vi.mocked(riotFetch).mock.calls[0][0]);
		expect(url.searchParams.has("startTime")).toBe(false);
		expect(url.searchParams.has("queue")).toBe(false);
	});
});
