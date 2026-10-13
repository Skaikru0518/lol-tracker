import { describe, expect, it } from "vitest";
import { CUTOFF_TTL_MS, lowestLp, refreshCutoffs, RETRY_AFTER_MS, toCutoffs } from "./apex-cutoffs";

const NOW = 1_800_000_000_000;
const lows = { grandmaster: 250, challenger: 600 };
const fetchLows = async (tier: "grandmaster" | "challenger") => lows[tier];

describe("lowestLp", () => {
	it("picks the lowest LP and is null for an empty league", () => {
		expect(lowestLp([{ leaguePoints: 700 }, { leaguePoints: 612 }, { leaguePoints: 905 }])).toBe(612);
		expect(lowestLp([])).toBeNull();
	});
});

describe("refreshCutoffs", () => {
	it("fetches missing queues", async () => {
		const { cache, changed } = await refreshCutoffs({}, {}, fetchLows, NOW);
		expect(changed).toBe(true);
		expect(cache.RANKED_SOLO_5x5).toEqual({ ...lows, fetchedAt: NOW });
		expect(cache.RANKED_FLEX_SR).toEqual({ ...lows, fetchedAt: NOW });
	});

	it("skips Riot while the cache is fresh", async () => {
		let calls = 0;
		const cached = { RANKED_SOLO_5x5: { ...lows, fetchedAt: NOW - 1000 }, RANKED_FLEX_SR: { ...lows, fetchedAt: NOW - 1000 } };
		const { changed } = await refreshCutoffs(cached, {}, async () => (calls++, 1), NOW);
		expect(calls).toBe(0);
		expect(changed).toBe(false);
	});

	it("keeps the stale value when Riot fails", async () => {
		const stale = { RANKED_SOLO_5x5: { ...lows, fetchedAt: NOW - CUTOFF_TTL_MS - 1 } };
		const { cache } = await refreshCutoffs(stale, {}, async () => { throw new Error("429"); }, NOW);
		expect(cache.RANKED_SOLO_5x5).toEqual(stale.RANKED_SOLO_5x5);
	});

	it("stays empty without throwing when the first fetch fails", async () => {
		const { cache, changed } = await refreshCutoffs({}, {}, async () => { throw new Error("429"); }, NOW);
		expect(cache).toEqual({});
		expect(changed).toBe(false);
	});
});

describe("refreshCutoffs backoff", () => {
	it("records a failed attempt and skips Riot until the retry window passes", async () => {
		let calls = 0;
		const failing = async () => {
			calls++;
			throw new Error("503");
		};
		const { attempts } = await refreshCutoffs({}, {}, failing, NOW);
		expect(attempts.RANKED_SOLO_5x5).toBe(NOW);
		calls = 0;
		await refreshCutoffs({}, attempts, failing, NOW + RETRY_AFTER_MS - 1);
		expect(calls).toBe(0);
		await refreshCutoffs({}, attempts, failing, NOW + RETRY_AFTER_MS);
		expect(calls).toBeGreaterThan(0);
	});

	it("backs off after an empty league too", async () => {
		const { cache, attempts } = await refreshCutoffs({}, {}, async () => null, NOW);
		expect(cache).toEqual({});
		expect(attempts.RANKED_FLEX_SR).toBe(NOW);
	});
});

describe("refreshCutoffs force", () => {
	it("refetches a fresh cache and ignores the backoff", async () => {
		let calls = 0;
		const cached = { RANKED_SOLO_5x5: { ...lows, fetchedAt: NOW - 1000 }, RANKED_FLEX_SR: { ...lows, fetchedAt: NOW - 1000 } };
		const { cache } = await refreshCutoffs(cached, { RANKED_SOLO_5x5: NOW - 1000 }, async (tier) => (calls++, tier === "grandmaster" ? 300 : 700), NOW, { force: true });
		expect(calls).toBe(4);
		expect(cache.RANKED_SOLO_5x5).toEqual({ grandmaster: 300, challenger: 700, fetchedAt: NOW });
	});
});

describe("toCutoffs", () => {
	it("drops the fetch time", () => {
		expect(toCutoffs({ RANKED_FLEX_SR: { ...lows, fetchedAt: NOW } })).toEqual({ RANKED_FLEX_SR: lows });
	});
});
