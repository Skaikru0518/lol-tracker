import { describe, expect, it } from "vitest";
import { isPlatform, platformFromRiotRegion, platformUrl } from "./platforms";

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
});
