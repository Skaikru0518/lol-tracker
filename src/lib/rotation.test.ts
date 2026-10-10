import { describe, expect, it } from "vitest";
import {
	parseCachedRotation,
	rotationCacheState,
	serializeRotation,
	toFreeRotation,
	ROTATION_MAX_AGE_MS,
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

describe("rotationCacheState", () => {
	const at = (msAgo: number) => ({
		fetchedAt: new Date(now.getTime() - msAgo).toISOString(),
		freeChampionIds: [1],
	});

	it("is missing without a cache", () => {
		expect(rotationCacheState(null, now)).toBe("missing");
	});

	it("is fresh within the max age", () => {
		expect(rotationCacheState(at(ROTATION_MAX_AGE_MS - 1000), now)).toBe("fresh");
	});

	it("is stale after the max age", () => {
		expect(rotationCacheState(at(ROTATION_MAX_AGE_MS + 1000), now)).toBe("stale");
	});

	it("is stale for a timestamp in the future", () => {
		expect(rotationCacheState(at(-60_000), now)).toBe("stale");
	});
});
