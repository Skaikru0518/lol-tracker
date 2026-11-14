import { describe, expect, it } from "vitest";
import { dayKeyIn } from "@/lib/lp-history/summary";
import { type LPSnapshot } from "@/lib/validators/lp-history";
import { buildPromoCard, promoMetadata } from "./promo-card";

const snap = (id: string, createdAt: string, tier: string, rank: string, lp: number, wins: number, losses: number): LPSnapshot => ({ id, createdAt, tier, rank, lp, wins, losses });

// Budapest is UTC+1 in November
const snapshots = [
	snap("old", "2026-11-12T20:00:00Z", "DIAMOND", "I", 40, 100, 90),
	snap("w1", "2026-11-13T18:00:00Z", "DIAMOND", "I", 62, 101, 90),
	snap("l1", "2026-11-13T19:00:00Z", "DIAMOND", "I", 45, 101, 91),
	snap("w2", "2026-11-13T20:00:00Z", "DIAMOND", "I", 70, 102, 91),
	snap("promo", "2026-11-13T22:30:00Z", "MASTER", "I", 0, 103, 91),
	snap("next", "2026-11-13T23:30:00Z", "MASTER", "I", 21, 104, 91),
];

describe("dayKeyIn", () => {
	it("puts a late-evening UTC game on the next Budapest day", () => {
		expect(dayKeyIn("2026-11-13T23:30:00Z", "Europe/Budapest")).toBe("2026-11-14");
		expect(dayKeyIn("2026-11-13T22:30:00Z", "Europe/Budapest")).toBe("2026-11-13");
	});
});

describe("buildPromoCard", () => {
	it("describes the promotion and that Budapest day's games", () => {
		expect(buildPromoCard(snapshots, "promo", "Velmora#MOON", "RANKED_SOLO_5x5", 81)).toEqual({
			tier: "MASTER",
			label: "Master",
			from: "Diamond I",
			queue: "Ranked Solo",
			day: "2026-11-13",
			wins: 3,
			losses: 1,
			netLp: 60,
			avgScore: 81,
			riotId: "Velmora#MOON",
		});
	});

	it("is null for a snapshot that is not a promotion, or unknown", () => {
		expect(buildPromoCard(snapshots, "w2", "Velmora#MOON", "RANKED_SOLO_5x5", null)).toBeNull();
		expect(buildPromoCard(snapshots, "nope", "Velmora#MOON", "RANKED_SOLO_5x5", null)).toBeNull();
		const demotion = [snap("a", "2026-11-13T18:00:00Z", "EMERALD", "I", 10, 10, 10), snap("b", "2026-11-13T19:00:00Z", "EMERALD", "II", 80, 10, 11)];
		expect(buildPromoCard(demotion, "b", "Velmora#MOON", "RANKED_FLEX_SR", null)).toBeNull();
	});

	it("names a division promotion with its division", () => {
		const up = [snap("a", "2026-11-13T18:00:00Z", "EMERALD", "II", 90, 10, 10), snap("b", "2026-11-13T19:00:00Z", "EMERALD", "I", 5, 11, 10)];
		expect(buildPromoCard(up, "b", "X#1", "RANKED_FLEX_SR", null)).toMatchObject({ label: "Emerald I", from: "Emerald II", queue: "Ranked Flex" });
	});
});

describe("promoMetadata", () => {
	it("says who was promoted to what", () => {
		expect(promoMetadata(buildPromoCard(snapshots, "promo", "Velmora#MOON", "RANKED_SOLO_5x5", null)!)).toEqual({
			title: "Velmora#MOON promoted to Master",
			description: "Diamond I → Master · Ranked Solo",
		});
	});
});
