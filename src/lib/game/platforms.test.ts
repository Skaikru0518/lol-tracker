import { describe, expect, it } from "vitest";
import { isPlatform, platformFromMatchId, platformFromRiotRegion, platformUrl, storedPlatform } from "./platforms";

describe("platforms", () => {
	it("recognises supported platforms only", () => {
		expect(["eune", "euw", "na", "", null].map(isPlatform)).toEqual([true, true, false, false, false]);
	});

	it("builds the platform host URL", () => {
		expect(platformUrl("euw")).toBe("https://euw1.api.riotgames.com");
		expect(platformUrl("eune")).toBe("https://eun1.api.riotgames.com");
	});

	it("maps Riot's active region to a platform", () => {
		expect(platformFromRiotRegion("eun1")).toBe("eune");
		expect(platformFromRiotRegion("EUW1")).toBe("euw");
		expect(platformFromRiotRegion("na1")).toBeNull();
		expect(platformFromRiotRegion(null)).toBeNull();
	});

	it("reads a stored platform, ignoring unknown values", () => {
		expect(storedPlatform("euw")).toBe("euw");
		expect(storedPlatform("na")).toBeNull();
		expect(storedPlatform(null)).toBeNull();
	});

	it("reads the platform from a match id prefix", () => {
		expect(platformFromMatchId("EUW1_7012345678")).toBe("euw");
		expect(platformFromMatchId("EUN1_4015015446")).toBe("eune");
		expect(platformFromMatchId("NA1_123")).toBe("eune");
	});
});
