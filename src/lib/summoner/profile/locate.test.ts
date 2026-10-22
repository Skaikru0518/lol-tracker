import { describe, expect, it } from "vitest";
import { type Platform } from "@/lib/game/platforms";
import { locatePlatform } from "./locate";

function fakeRiot(found: Platform[], region: string | null) {
	const tried: Platform[] = [];
	let regionCalls = 0;
	return {
		tried,
		regionCalls: () => regionCalls,
		deps: {
			trySummoner: async (p: Platform) => {
				tried.push(p);
				return found.includes(p) ? { on: p } : null;
			},
			activeRegion: async () => {
				regionCalls++;
				return region;
			},
		},
	};
}

describe("locatePlatform", () => {
	it("uses the hint when a summoner is found there", async () => {
		const riot = fakeRiot(["euw"], "euw1");
		expect(await locatePlatform({ hint: "euw", stored: "eune" }, riot.deps)).toEqual({ platform: "euw", summoner: { on: "euw" } });
		expect(riot.regionCalls()).toBe(0);
	});

	it("falls back from the hint to the stored platform", async () => {
		const riot = fakeRiot(["eune"], null);
		expect((await locatePlatform({ hint: "euw", stored: "eune" }, riot.deps))?.platform).toBe("eune");
		expect(riot.tried).toEqual(["euw", "eune"]);
	});

	it("asks Riot for the active region when nothing else works", async () => {
		const riot = fakeRiot(["euw"], "euw1");
		expect((await locatePlatform({ stored: "eune" }, riot.deps))?.platform).toBe("euw");
		expect(riot.tried).toEqual(["eune", "euw"]);
	});

	it("never tries a platform twice", async () => {
		const riot = fakeRiot([], "eun1");
		expect(await locatePlatform({ hint: "eune", stored: "eune" }, riot.deps)).toBeNull();
		expect(riot.tried).toEqual(["eune"]);
	});

	it("is not found for an unsupported active region", async () => {
		const riot = fakeRiot(["euw"], "na1");
		expect(await locatePlatform({ stored: "eune" }, riot.deps)).toBeNull();
	});

	it("without hint or stored platform goes straight to the active region", async () => {
		const riot = fakeRiot(["euw"], "euw1");
		expect((await locatePlatform({}, riot.deps))?.platform).toBe("euw");
		expect(riot.tried).toEqual(["euw"]);
	});
});
