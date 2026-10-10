import { describe, expect, it } from "vitest";
import {
	parseCachedRotation,
	rotationCacheState,
	serializeRotation,
	toFreeRotation,
	lastRotationReset,
} from "./rotation";

const now = new Date("2026-10-10T12:00:00Z");

describe("toFreeRotation", () => {
	it("reads the current Riot shape", () => {
		expect(toFreeRotation({ sr: [1, 2], newplayer: [3] })).toEqual({ freeChampionIds: [1, 2] });
	});

	it("reads the legacy Riot shape", () => {
		expect(
			toFreeRotation({ freeChampionIds: [4], freeChampionIdsForNewPlayers: [5], maxNewPlayerLevel: 10 }),
		).toEqual({ freeChampionIds: [4] });
	});

	it.each([{}, { sr: "x" }, null, []])("throws on an unknown shape %j", (raw) => {
		expect(() => toFreeRotation(raw)).toThrow();
	});
});

describe("parseCachedRotation", () => {
	it("round-trips a serialized rotation", () => {
		expect(parseCachedRotation(serializeRotation([1, 2, 3], now))).toEqual({
			fetchedAt: "2026-10-10T12:00:00.000Z",
			freeChampionIds: [1, 2, 3],
		});
	});

	it.each([null, "", "{bad", "[]", '{"fetchedAt":"x"}', '{"fetchedAt":"2026-10-10T12:00:00Z","freeChampionIds":["a"]}'])(
		"treats %j as missing",
		(raw) => {
			expect(parseCachedRotation(raw)).toBeNull();
		},
	);

	it("rejects an unparseable date", () => {
		expect(parseCachedRotation('{"fetchedAt":"yesterday","freeChampionIds":[1]}')).toBeNull();
	});
});

describe("lastRotationReset", () => {
	it("is the most recent Tuesday 00:00 UTC", () => {
		expect(lastRotationReset(new Date("2026-10-10T15:00:00Z")).toISOString()).toBe("2026-10-06T00:00:00.000Z");
		expect(lastRotationReset(new Date("2026-10-06T00:00:00Z")).toISOString()).toBe("2026-10-06T00:00:00.000Z");
		expect(lastRotationReset(new Date("2026-10-05T23:59:00Z")).toISOString()).toBe("2026-09-29T00:00:00.000Z");
	});
});

describe("rotationCacheState", () => {
	const cache = (iso: string) => ({ fetchedAt: iso, freeChampionIds: [1] });

	it("is missing without a cache", () => {
		expect(rotationCacheState(null, new Date("2026-10-10T12:00:00Z"))).toBe("missing");
	});

	it("stays fresh through the week once fetched after the Tuesday reset", () => {
		expect(rotationCacheState(cache("2026-10-07T20:00:00Z"), new Date("2026-10-12T09:00:00Z"))).toBe("fresh");
	});

	it("is stale once a new Tuesday reset has passed", () => {
		expect(rotationCacheState(cache("2026-10-12T09:00:00Z"), new Date("2026-10-13T01:00:00Z"))).toBe("stale");
	});

	it("refreshes every six hours during the 36 hours after a reset, when Riot may still be swapping", () => {
		expect(rotationCacheState(cache("2026-10-13T01:00:00Z"), new Date("2026-10-13T08:00:00Z"))).toBe("stale");
		expect(rotationCacheState(cache("2026-10-13T05:00:00Z"), new Date("2026-10-13T08:00:00Z"))).toBe("fresh");
	});

	it("is stale for a timestamp in the future", () => {
		expect(rotationCacheState(cache("2026-10-11T00:00:00Z"), new Date("2026-10-10T12:00:00Z"))).toBe("stale");
	});
});
