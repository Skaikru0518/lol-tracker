import { beforeEach, describe, expect, it, vi } from "vitest";
import { RiotApiError } from "@/lib/riot/riot";

vi.mock("@/lib/summoner/profile/account", () => ({ resolveAccount: vi.fn() }));
vi.mock("@/lib/summoner/profile/summoner", () => ({ resolveSummoner: vi.fn() }));
vi.mock("@/lib/summoner/profile/ranked", () => ({ resolveRankedEntries: vi.fn() }));
vi.mock("@/lib/summoner/champions/mastery", () => ({ resolveTopMasteries: vi.fn() }));

const { resolveAccount } = await import("@/lib/summoner/profile/account");
const { resolveSummoner } = await import("@/lib/summoner/profile/summoner");
const { resolveRankedEntries } = await import("@/lib/summoner/profile/ranked");
const { resolveTopMasteries } = await import("@/lib/summoner/champions/mastery");
const { decodeSlug, getSummonerProfile, PROFILE_MASTERY_COUNT } = await import("./get-profile");

const account = { puuid: "p1", gameName: "Cool Guy", tagLine: "EUNE" };
const summoner = { puuid: "p1", profileIconId: 1, summonerLevel: 30, revisionDate: 1 };

describe("decodeSlug", () => {
	it("decodes percent-encoded slugs", () => {
		expect(decodeSlug("Cool%20Guy-EUNE")).toBe("Cool Guy-EUNE");
	});

	it("leaves already-decoded slugs alone", () => {
		expect(decodeSlug("Cool Guy-EUNE")).toBe("Cool Guy-EUNE");
	});

	it("returns malformed escapes unchanged instead of throwing", () => {
		expect(decodeSlug("bad%E0%A4%A-EUNE")).toBe("bad%E0%A4%A-EUNE");
	});
});

describe("getSummonerProfile", () => {
	beforeEach(() => {
		vi.mocked(resolveAccount).mockReset().mockResolvedValue(account);
		vi.mocked(resolveSummoner).mockReset().mockResolvedValue(summoner);
		vi.mocked(resolveRankedEntries).mockReset().mockResolvedValue([]);
		vi.mocked(resolveTopMasteries)
			.mockReset()
			.mockResolvedValue([
				{ puuid: "p1", championId: 267, championLevel: 10, championPoints: 412000, lastPlayTime: 1 },
			]);
	});

	it("resolves an encoded slug with a dash in the game name", async () => {
		const profile = await getSummonerProfile("Cool-Guy%20X-EUNE");
		expect(resolveAccount).toHaveBeenCalledWith("Cool-Guy X", "EUNE");
		expect(profile).toEqual({ account, summoner, ranked: [], topMasteryChampionId: 267 });
	});

	it("asks for the same mastery count as the mastery panel", async () => {
		await getSummonerProfile("Cool%20Guy-EUNE");
		expect(resolveTopMasteries).toHaveBeenCalledWith("p1", PROFILE_MASTERY_COUNT);
	});

	it("returns null for a slug without a tag line", async () => {
		expect(await getSummonerProfile("Skaikru")).toBeNull();
		expect(resolveAccount).not.toHaveBeenCalled();
	});

	it("returns null when Riot does not know the account", async () => {
		vi.mocked(resolveAccount).mockRejectedValue(new RiotApiError(404, "Not Found"));
		expect(await getSummonerProfile("Nobody-0000")).toBeNull();
	});

	it("returns null when the account exists but has no summoner on this platform", async () => {
		vi.mocked(resolveSummoner).mockRejectedValue(new RiotApiError(404, "Not Found"));
		expect(await getSummonerProfile("Agurin-EUW")).toBeNull();
		expect(resolveRankedEntries).not.toHaveBeenCalled();
	});

	it("rethrows summoner errors other than 404", async () => {
		vi.mocked(resolveSummoner).mockRejectedValue(new RiotApiError(500, "Riot API error: 500"));
		await expect(getSummonerProfile("Cool%20Guy-EUNE")).rejects.toBeInstanceOf(RiotApiError);
	});

	it("rethrows Riot errors other than 404", async () => {
		vi.mocked(resolveAccount).mockRejectedValue(new RiotApiError(429, "Rate limit exceeded"));
		await expect(getSummonerProfile("Cool%20Guy-EUNE")).rejects.toBeInstanceOf(RiotApiError);
	});

	it("still returns the profile when masteries fail", async () => {
		vi.mocked(resolveTopMasteries).mockRejectedValue(new RiotApiError(503, "Riot API error: 503"));
		const profile = await getSummonerProfile("Cool%20Guy-EUNE");
		expect(profile?.topMasteryChampionId).toBeNull();
	});
});
