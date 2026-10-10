import { describe, expect, it } from "vitest";
import { getMilestone } from "./milestones/definitions";
import { getSeasonal } from "./seasonal/definitions";
import { ironWillNote, progressView, rarityText, seasonOptions, tierLabel, topMilestones } from "./display";

const veteran = getMilestone("veteran")!;
const row = (achievementId: string, scope: string, value: number, tier: number) => ({ achievementId, scope, value, tier, reachedAt: [] });

describe("progressView", () => {
	it("shows the way from the reached threshold to the next one", () => {
		expect(progressView(veteran, row("veteran", "all", 350, 2))).toEqual({ tier: 2, tierName: "Silver", current: "350", next: "500", percent: 50 });
		expect(progressView(veteran, undefined)).toEqual({ tier: 0, tierName: null, current: "0", next: "50", percent: 0 });
	});

	it("fills the bar at Platinum and names ranks and binary tiers", () => {
		expect(progressView(veteran, row("veteran", "all", 1500, 4))).toMatchObject({ tierName: "Platinum", current: "1,500", next: null, percent: 100 });
		expect(progressView(getMilestone("peak-rank")!, row("peak-rank", "all", 6, 2))).toMatchObject({ current: "Diamond", next: "Master" });
		expect(progressView(getSeasonal("hot-streak")!, row("hot-streak", "2026", 7, 1))).toMatchObject({ tierName: "Earned", percent: 100 });
	});

	it("names rank tiers after the rank, not the metal", () => {
		expect(progressView(getMilestone("peak-rank")!, row("peak-rank", "all", 7, 3))).toMatchObject({ tierName: "Master", next: "Grandmaster" });
		expect(progressView(getSeasonal("season-peak")!, row("season-peak", "2026", 9, 4))).toMatchObject({ tierName: "Grandmaster+" });
	});
});

describe("rarityText", () => {
	const rarity = { players: 200, shares: { "veteran:all": [0.5, 0.04, 0.004] } };
	it("formats the share of the current tier", () => {
		expect(rarityText(rarity, "veteran", "all", 2)).toBe("4% of players");
		expect(rarityText(rarity, "veteran", "all", 3)).toBe("<1% of players");
	});
	it("hides rarity before the first cron run or for locked tiers", () => {
		expect(rarityText(null, "veteran", "all", 2)).toBeNull();
		expect(rarityText(rarity, "veteran", "all", 0)).toBeNull();
	});
});

describe("topMilestones", () => {
	it("orders by tier, then rarest", () => {
		const rows = [row("veteran", "all", 600, 3), row("winner", "all", 300, 3), row("slayer", "all", 100, 0), row("hot-streak", "2026", 7, 1), row("visionary", "all", 6000, 1)];
		const rarity = { players: 10, shares: { "veteran:all": [1, 1, 0.5], "winner:all": [1, 1, 0.1] } };
		expect(topMilestones(rows, rarity).map((r) => r.achievementId)).toEqual(["winner", "veteran", "visionary"]);
	});
});

describe("seasonOptions", () => {
	it("lists the current season first, then archived seasons with rows", () => {
		const now = new Date("2026-10-11T00:00:00Z");
		expect(seasonOptions([row("hot-streak", "2025", 7, 1)], now)).toEqual([{ id: "2026", label: "Season 2026" }, { id: "2025", label: "Season 2025" }]);
		expect(seasonOptions([], now)).toEqual([{ id: "2026", label: "Season 2026" }]);
	});
});

describe("tierLabel", () => {
	it("uses metals for counting milestones and ranks for peaks", () => {
		expect(tierLabel(veteran, 3)).toBe("Gold");
		expect(tierLabel(getMilestone("peak-rank")!, 1)).toBe("Emerald");
		expect(tierLabel(getMilestone("peak-rank")!, 4)).toBe("Grandmaster+");
		expect(tierLabel(getSeasonal("hot-streak")!, 1)).toBe("Earned");
	});
});

describe("ironWillNote", () => {
	it("explains a locked Iron Will once 50 games are played", () => {
		expect(ironWillNote(row("iron-will", "2026", 62, 0), row("season-winner", "2026", 31, 0))).toBe("50% win rate · needs 55%");
		expect(ironWillNote(row("iron-will", "2026", 40, 0), row("season-winner", "2026", 30, 0))).toBeNull();
		expect(ironWillNote(row("iron-will", "2026", 60, 1), row("season-winner", "2026", 40, 0))).toBeNull();
	});
});
