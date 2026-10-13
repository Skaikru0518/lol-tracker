import { describe, expect, it } from "vitest";
import { exactLpChanges, lpChangesForGames } from "./lp-estimate";

const snap = (createdAt: string, lp: number, wins: number | null, losses: number | null, rank = "IV") => ({
	id: createdAt,
	tier: "EMERALD",
	rank,
	lp,
	wins,
	losses,
	createdAt,
});
const game = (id: string, end: string, win: boolean) => ({ id, end: Date.parse(end), win });

describe("lpChangesForGames", () => {
	it("keeps the exact change when one game sits between two snapshots", () => {
		const changes = lpChangesForGames([snap("2026-10-11T20:00:00Z", 0, 126, 99), snap("2026-10-11T21:00:00Z", 25, 127, 99)], [game("lux", "2026-10-11T20:40:00Z", true)]);
		expect(changes.get("lux")).toBe(25);
	});

	it("splits a mixed session using the player's known win gain", () => {
		const snapshots = [snap("2026-10-11T20:00:00Z", 0, 126, 99), snap("2026-10-11T21:00:00Z", 25, 127, 99), snap("2026-10-12T22:41:00Z", 85, 130, 100)];
		const games = [
			game("lux", "2026-10-11T20:40:00Z", true),
			game("xerath", "2026-10-12T19:44:00Z", true),
			game("seraphine", "2026-10-12T20:22:00Z", true),
			game("karma", "2026-10-12T21:01:00Z", false),
			game("thresh", "2026-10-12T21:26:00Z", true),
		];
		const changes = lpChangesForGames(snapshots, games);
		expect(["xerath", "seraphine", "karma", "thresh"].map((id) => changes.get(id))).toEqual([25, 25, -15, 25]);
	});

	it("splits equally when every game in the gap has the same result", () => {
		const changes = lpChangesForGames([snap("2026-10-12T10:00:00Z", 10, 10, 10), snap("2026-10-12T12:00:00Z", 70, 13, 10)], [
			game("a", "2026-10-12T10:30:00Z", true),
			game("b", "2026-10-12T11:00:00Z", true),
			game("c", "2026-10-12T11:30:00Z", true),
		]);
		expect([changes.get("a"), changes.get("b"), changes.get("c")]).toEqual([20, 20, 20]);
	});

	it("assumes equal gains and losses without a known win gain", () => {
		const changes = lpChangesForGames([snap("2026-10-12T10:00:00Z", 10, 10, 10), snap("2026-10-12T12:00:00Z", 30, 12, 11)], [
			game("a", "2026-10-12T10:30:00Z", true),
			game("b", "2026-10-12T11:00:00Z", false),
			game("c", "2026-10-12T11:30:00Z", true),
		]);
		expect([changes.get("a"), changes.get("b"), changes.get("c")]).toEqual([20, -20, 20]);
	});

	it("leaves a gap out when it cannot be split or does not match the stored games", () => {
		const even = lpChangesForGames([snap("2026-10-12T10:00:00Z", 10, 10, 10), snap("2026-10-12T12:00:00Z", 10, 11, 11)], [
			game("a", "2026-10-12T10:30:00Z", true),
			game("b", "2026-10-12T11:00:00Z", false),
		]);
		expect(even.size).toBe(0);
		const missing = lpChangesForGames([snap("2026-10-12T10:00:00Z", 10, 10, 10), snap("2026-10-12T12:00:00Z", 70, 13, 10)], [game("a", "2026-10-12T10:30:00Z", true)]);
		expect(missing.size).toBe(0);
	});

	it("uses the exact win nearest in time, since LP gains drift with MMR", () => {
		const snapshots = [
			snap("2026-10-01T10:00:00Z", 0, 100, 90),
			snap("2026-10-01T11:00:00Z", 22, 101, 90),
			snap("2026-10-02T10:00:00Z", 44, 102, 90),
			snap("2026-10-11T20:00:00Z", 0, 126, 99),
			snap("2026-10-11T21:00:00Z", 25, 127, 99),
			snap("2026-10-12T22:41:00Z", 85, 130, 100),
		];
		const games = [
			game("old1", "2026-10-01T10:40:00Z", true),
			game("old2", "2026-10-02T09:40:00Z", true),
			game("lux", "2026-10-11T20:40:00Z", true),
			game("xerath", "2026-10-12T19:44:00Z", true),
			game("seraphine", "2026-10-12T20:22:00Z", true),
			game("karma", "2026-10-12T21:01:00Z", false),
			game("thresh", "2026-10-12T21:26:00Z", true),
		];
		const changes = lpChangesForGames(snapshots, games);
		expect(["xerath", "seraphine", "karma", "thresh"].map((id) => changes.get(id))).toEqual([25, 25, -15, 25]);
	});
});

describe("exactLpChanges", () => {
	it("keeps only gaps with one game", () => {
		const snapshots = [snap("2026-10-11T20:00:00Z", 0, 126, 99), snap("2026-10-11T21:00:00Z", 25, 127, 99), snap("2026-10-12T22:41:00Z", 85, 130, 100)];
		const games = [
			game("lux", "2026-10-11T20:40:00Z", true),
			game("xerath", "2026-10-12T19:44:00Z", true),
			game("seraphine", "2026-10-12T20:22:00Z", true),
			game("karma", "2026-10-12T21:01:00Z", false),
		];
		expect([...exactLpChanges(snapshots, games)]).toEqual([["lux", 25]]);
	});

	it("skips a gap whose W/L counters disagree with the stored games", () => {
		const snapshots = [snap("2026-10-11T20:00:00Z", 0, 126, 99), snap("2026-10-11T21:00:00Z", 40, 128, 99)];
		expect(exactLpChanges(snapshots, [game("lux", "2026-10-11T20:40:00Z", true)]).size).toBe(0);
	});

	it("is empty without two snapshots", () => {
		expect(exactLpChanges([snap("2026-10-11T20:00:00Z", 0, 126, 99)], [game("lux", "2026-10-11T20:40:00Z", true)]).size).toBe(0);
	});
});
