# Achievement Milestones and Seasons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add permanent tiered milestones and per-season achievements (with progress, rarity, reached dates and an Overview highlight) next to the existing rolling Current form achievements.

**Architecture:** Pure evaluators turn aggregated per-account inputs (champion totals from one SQL aggregate, win sequence, LP snapshots, current ranks, masteries) into `{ achievementId, scope, value, tier }` rows; a max-merge keeps tiers from dropping and records when each tier was first seen; rows live in a new `AchievementProgress` table. The existing POST `/api/achievements` and the achievements cron recompute them; the cron also stores rarity in `AppSettings`. The Achievements tab renders three sections from one typed payload.

**Tech Stack:** Next.js 16 App Router, Prisma 7 (pg adapter, Postgres JSONB), Zod, TanStack Query 5, Tailwind 4, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-11-achievement-milestones-design.md`

## Global Constraints

- pnpm only (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm vitest run <path>`); never npm.
- Never apply migrations (`prisma migrate deploy/dev`, `db push`, reset). Write the schema change and the SQL file, run `pnpm prisma generate`; the user applies `prisma/migrations/20261011120000_add_achievement_progress`.
- Eligible games: queues 420, 440, 710 and `gameDuration >= 300` — reuse `ACHIEVEMENT_QUEUE_IDS` / `MIN_ACHIEVEMENT_GAME_SECONDS` from `src/lib/achievements/eligibility.ts`.
- Tiers: 4 — Bronze `#cd7f32`, Silver `#aab2bd`, Gold `#f1c40f`, Platinum `#4fd1c5`; locked is grey.
- Seasons: `{ id: "2025", label: "Season 2025", start: "2025-01-09T11:00:00Z" }`, `{ id: "2026", label: "Season 2026", start: "2026-01-08T11:00:00Z" }`.
- Comments: JSDoc and single-line `//` only, sparse; no multi-line inline comment blocks.
- Every API response has a Zod schema and exported type in `src/lib/validators/`; no `any`.
- Small components, one per file; subfolders over big files.
- Sizes in rem-based Tailwind classes (no `px` in new code except SVG viewBoxes and image width/height attributes).
- Use `<img>` for `/achi/*.svg`, not `next/image`. No emoji.
- No keyboard-navigation work (mouse/touch only).
- Commit once, at the end of the plan (Task 11), after a pre-commit review. Intermediate tasks end with verification, not commits.
- Browser checks only on `http://localhost:3000/summoner/Skaikru-HEAVN` (no new Riot ID lookups); the Riot dev key is rate-limited, so do not reload in loops.
- Tasks touching `AchievementProgress` cannot be browser-verified until the user applies the migration; say so instead of verifying.

## Review Focus

- An account with no eligible games: every milestone still gets a row (`value` 0, Peak Rank `-1`), Peak Rank and mastery milestones still evaluate from snapshots/masteries — pinned in Task 3.
- A deranked player keeps Peak Rank and Season Peak tiers (max-merge) — pinned in Task 5.
- Closed seasons: backfilled once when no row exists and the season has data; never rewritten later; empty closed seasons create no rows — pinned in Task 6 (`seasonsToCompute`, `hasSeasonData`).
- Rarity absent (before the first cron run) → payload `rarity: null` and no rarity text in the UI — pinned in Tasks 7 and 9.
- `reachedAt` keeps old dates and only appends for newly reached tiers, including several tiers reached at once — pinned in Task 5.

---

## File Structure

**Create (lib):**
- `src/lib/achievements/tiers.ts` — tier names/colors, `tierFor`, rank-tier ordinals, `highestTierOrdinal`.
- `src/lib/achievements/seasons.ts` — `SEASONS`, `seasonRange`, `currentSeason`, `seasonFor`.
- `src/lib/achievements/progress/types.ts` — shared input/result types.
- `src/lib/achievements/milestones/definitions.ts` — 14 milestone defs.
- `src/lib/achievements/milestones/evaluate.ts` — `evaluateMilestones`.
- `src/lib/achievements/seasonal/definitions.ts` — 8 seasonal defs.
- `src/lib/achievements/seasonal/evaluate.ts` — `evaluateSeasonal`, `longestWinStreak`.
- `src/lib/achievements/progress/merge.ts` — `mergeProgress`.
- `src/lib/achievements/progress/backfill.ts` — `seasonsToCompute`, `hasSeasonData`.
- `src/lib/achievements/progress/rarity.ts` — `computeRarityShares`, `loadRarity`, `saveRarity`.
- `src/lib/achievements/progress/query.ts` — DB reads.
- `src/lib/achievements/progress/save.ts` — `recomputeProgress`.
- `src/lib/achievements/payload.ts` — `loadAchievementPayload`.
- `src/lib/achievements/display.ts` — `progressView`, `topMilestones`, `rarityText`, `seasonOptions`, `formatProgressValue`.
- `src/lib/validators/achievements.ts` — payload and rarity schemas.

**Create (UI):** `src/components/summoner/achievements/{tier-frame,progress-bar,progress-card,milestone-section,season-section,form-section}.tsx`.

**Create (other):** 21 new SVGs in `public/achi/`, `prisma/migrations/20261011120000_add_achievement_progress/migration.sql`, `src/components/changelog/changes/2026-10-11/metadata.ts`, tests next to each lib file.

**Modify:** `prisma/schema.prisma`, `src/lib/achievements/profile/{definitions,detect,detect.test}.ts`, `src/app/api/achievements/route.ts`, `src/app/api/cron/achievements/route.ts`, `src/hooks/useAchievements.ts`, `src/components/summoner/achievements/achievements-tab.tsx`, `src/components/summoner/overview/achievement-preview.tsx`, `src/components/changelog/registry.ts`.

**Delete:** `public/achi/{diamond-plus,master-plus,challenger}.svg`; `public/achi/pentakill.svg` is renamed to `pentakiller.svg`.

---

### Task 1: Tiers and seasons

**Files:**
- Create: `src/lib/achievements/tiers.ts`, `src/lib/achievements/seasons.ts`
- Test: `src/lib/achievements/tiers.test.ts`, `src/lib/achievements/seasons.test.ts`

**Interfaces:**
- Produces:
  - `TIER_NAMES: readonly ["Bronze","Silver","Gold","Platinum"]`, `TIER_COLORS: readonly string[]` (same order), `LOCKED_COLOR = "#7f8c8d"`
  - `tierFor(value: number, thresholds: readonly number[]): number` — count of thresholds `<= value` (0..thresholds.length)
  - `RANK_TIERS: readonly string[]` (IRON..CHALLENGER), `rankTierOrdinal(tier: string): number` (-1 unknown), `highestTierOrdinal(tiers: string[]): number` (-1 when empty), `rankTierName(ordinal: number): string` ("Unranked" for -1, else title case, e.g. "Grandmaster")
  - `interface Season { id: string; label: string; start: string }`, `SEASONS: Season[]`
  - `seasonRange(season: Season): { from: Date; to: Date | null }` (`to` = next season start, null for last)
  - `currentSeason(now?: Date): Season` (last season whose start ≤ now; first season if now is before all)
  - `seasonFor(date: Date): Season | null` (null before the first season)

- [ ] **Step 1: Write the failing tests**

`src/lib/achievements/tiers.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { highestTierOrdinal, rankTierName, rankTierOrdinal, tierFor } from "./tiers";

describe("tierFor", () => {
	it("counts reached thresholds, boundaries included", () => {
		expect(tierFor(0, [50, 200, 500, 1000])).toBe(0);
		expect(tierFor(49, [50, 200, 500, 1000])).toBe(0);
		expect(tierFor(50, [50, 200, 500, 1000])).toBe(1);
		expect(tierFor(999, [50, 200, 500, 1000])).toBe(3);
		expect(tierFor(5000, [50, 200, 500, 1000])).toBe(4);
		expect(tierFor(1, [1])).toBe(1);
	});
});

describe("rank tiers", () => {
	it("orders Iron to Challenger and rejects unknown tiers", () => {
		expect(rankTierOrdinal("IRON")).toBe(0);
		expect(rankTierOrdinal("EMERALD")).toBe(5);
		expect(rankTierOrdinal("CHALLENGER")).toBe(9);
		expect(rankTierOrdinal("UNRANKED")).toBe(-1);
	});

	it("finds the highest tier, -1 for none", () => {
		expect(highestTierOrdinal(["GOLD", "DIAMOND", "EMERALD"])).toBe(6);
		expect(highestTierOrdinal([])).toBe(-1);
	});

	it("names ordinals in title case", () => {
		expect(rankTierName(8)).toBe("Grandmaster");
		expect(rankTierName(-1)).toBe("Unranked");
	});
});
```

`src/lib/achievements/seasons.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { SEASONS, currentSeason, seasonFor, seasonRange } from "./seasons";

describe("seasons", () => {
	it("starts each ranked year at the Riot reset", () => {
		expect(SEASONS.map((s) => s.id)).toEqual(["2025", "2026"]);
		expect(seasonRange(SEASONS[0])).toEqual({ from: new Date("2025-01-09T11:00:00Z"), to: new Date("2026-01-08T11:00:00Z") });
		expect(seasonRange(SEASONS[1]).to).toBeNull();
	});

	it("picks the season a date falls in", () => {
		expect(seasonFor(new Date("2026-01-08T10:59:59Z"))?.id).toBe("2025");
		expect(seasonFor(new Date("2026-01-08T11:00:00Z"))?.id).toBe("2026");
		expect(seasonFor(new Date("2024-06-01T00:00:00Z"))).toBeNull();
	});

	it("treats the latest started season as current", () => {
		expect(currentSeason(new Date("2026-10-11T00:00:00Z")).id).toBe("2026");
		expect(currentSeason(new Date("2025-03-01T00:00:00Z")).id).toBe("2025");
	});
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run src/lib/achievements/tiers.test.ts src/lib/achievements/seasons.test.ts`
Expected: FAIL — "Cannot find module './tiers'" / "./seasons".

- [ ] **Step 3: Implement**

`src/lib/achievements/tiers.ts`:
```ts
export const TIER_NAMES = ["Bronze", "Silver", "Gold", "Platinum"] as const;
export const TIER_COLORS = ["#cd7f32", "#aab2bd", "#f1c40f", "#4fd1c5"] as const;
export const LOCKED_COLOR = "#7f8c8d";

/** How many thresholds `value` has reached (0 = none). */
export function tierFor(value: number, thresholds: readonly number[]): number {
	return thresholds.filter((t) => value >= t).length;
}

export const RANK_TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"] as const;

/** Iron 0 … Challenger 9; -1 for anything else. */
export function rankTierOrdinal(tier: string): number {
	return (RANK_TIERS as readonly string[]).indexOf(tier);
}

/** Highest rank tier ordinal among `tiers`; -1 when there is none. */
export function highestTierOrdinal(tiers: string[]): number {
	return Math.max(-1, ...tiers.map(rankTierOrdinal));
}

/** `Grandmaster` for 8, `Unranked` for -1. */
export function rankTierName(ordinal: number): string {
	const tier = RANK_TIERS[ordinal];
	return tier ? tier.charAt(0) + tier.slice(1).toLowerCase() : "Unranked";
}
```

`src/lib/achievements/seasons.ts`:
```ts
export interface Season {
	id: string;
	label: string;
	start: string;
}

/** Riot ranked years, oldest first; a new reset is one more line. */
export const SEASONS: Season[] = [
	{ id: "2025", label: "Season 2025", start: "2025-01-09T11:00:00Z" },
	{ id: "2026", label: "Season 2026", start: "2026-01-08T11:00:00Z" },
];

/** A season runs until the next one starts; the last one is open-ended. */
export function seasonRange(season: Season): { from: Date; to: Date | null } {
	const next = SEASONS[SEASONS.findIndex((s) => s.id === season.id) + 1];
	return { from: new Date(season.start), to: next ? new Date(next.start) : null };
}

/** The season `date` falls in; null before the first one. */
export function seasonFor(date: Date): Season | null {
	return [...SEASONS].reverse().find((s) => new Date(s.start) <= date) ?? null;
}

/** The latest season that has started (the first one before any has). */
export function currentSeason(now: Date = new Date()): Season {
	return seasonFor(now) ?? SEASONS[0];
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm vitest run src/lib/achievements/tiers.test.ts src/lib/achievements/seasons.test.ts`
Expected: PASS (6 tests).

---

### Task 2: Shared types and definitions

**Files:**
- Create: `src/lib/achievements/progress/types.ts`, `src/lib/achievements/milestones/definitions.ts`, `src/lib/achievements/seasonal/definitions.ts`
- Test: `src/lib/achievements/milestones/definitions.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
```ts
// progress/types.ts
export interface ChampionTotals { championName: string; games: number; wins: number; pentas: number; quadras: number; kills: number; assists: number; vision: number; turrets: number; epics: number }
export interface TierSnapshot { queueType: string; tier: string; createdAt: Date }
export interface CurrentRank { queueType: string; tier: string }
export interface MasteryPoint { championLevel: number; championPoints: number }
export interface MilestoneInputs { champions: ChampionTotals[]; snapshots: TierSnapshot[]; ranked: CurrentRank[]; masteries: MasteryPoint[] }
export interface SeasonalInputs { champions: ChampionTotals[]; wins: boolean[]; snapshots: TierSnapshot[]; ranked: CurrentRank[] | null }
export interface ProgressResult { achievementId: string; scope: string; value: number; tier: number }
export interface StoredProgress extends ProgressResult { reachedAt: Date[] }
export type ProgressDisplay = "count" | "points" | "rank";
export interface ProgressDef { id: string; name: string; description: string; icon: string; color: string; thresholds: readonly number[]; display: ProgressDisplay }
export const ALL_TIME_SCOPE = "all";
```
  - `MILESTONES: ProgressDef[]` (14, thresholds length 4), `getMilestone(id)`.
  - `SEASONAL: ProgressDef[]` (8; length 1 except `season-peak` length 4), `getSeasonal(id)`.
  - `RANK_THRESHOLDS = [5, 6, 7, 8] as const` (Emerald, Diamond, Master, Grandmaster+) exported from `milestones/definitions.ts`.

- [ ] **Step 1: Write the failing test**

`src/lib/achievements/milestones/definitions.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { MILESTONES, RANK_THRESHOLDS } from "./definitions";
import { SEASONAL } from "../seasonal/definitions";

describe("progress definitions", () => {
	it("has 14 four-tier milestones with ascending thresholds", () => {
		expect(MILESTONES).toHaveLength(14);
		for (const def of MILESTONES) {
			expect(def.thresholds).toHaveLength(4);
			expect([...def.thresholds].sort((a, b) => a - b)).toEqual([...def.thresholds]);
		}
		expect(MILESTONES.find((m) => m.id === "peak-rank")?.thresholds).toEqual(RANK_THRESHOLDS);
	});

	it("has 8 seasonal achievements, only Season Peak tiered", () => {
		expect(SEASONAL).toHaveLength(8);
		expect(SEASONAL.filter((s) => s.thresholds.length === 4).map((s) => s.id)).toEqual(["season-peak"]);
	});

	it("uses unique ids and an icon per achievement", () => {
		const ids = [...MILESTONES, ...SEASONAL].map((d) => d.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const def of [...MILESTONES, ...SEASONAL]) expect(def.icon).toBe(def.id);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/lib/achievements/milestones/definitions.test.ts`
Expected: FAIL — "Cannot find module './definitions'".

- [ ] **Step 3: Implement**

`src/lib/achievements/progress/types.ts`: exactly the block in **Produces** above, each interface with a one-line JSDoc:
```ts
/** Per-champion sums over a player's eligible games in some time range. */
export interface ChampionTotals {
	championName: string;
	games: number;
	wins: number;
	pentas: number;
	quadras: number;
	kills: number;
	assists: number;
	vision: number;
	turrets: number;
	epics: number;
}

/** One stored LP snapshot, reduced to its tier. */
export interface TierSnapshot {
	queueType: string;
	tier: string;
	createdAt: Date;
}

/** A current ranked entry, reduced to its tier. */
export interface CurrentRank {
	queueType: string;
	tier: string;
}

export interface MasteryPoint {
	championLevel: number;
	championPoints: number;
}

export interface MilestoneInputs {
	champions: ChampionTotals[];
	snapshots: TierSnapshot[];
	ranked: CurrentRank[];
	masteries: MasteryPoint[];
}

/** Inputs for one season; `ranked` is null for a closed season (current ranks say nothing about it). */
export interface SeasonalInputs {
	champions: ChampionTotals[];
	wins: boolean[];
	snapshots: TierSnapshot[];
	ranked: CurrentRank[] | null;
}

export interface ProgressResult {
	achievementId: string;
	scope: string;
	value: number;
	tier: number;
}

/** A saved row: `reachedAt[i]` is when tier i+1 was first detected. */
export interface StoredProgress extends ProgressResult {
	reachedAt: Date[];
}

export type ProgressDisplay = "count" | "points" | "rank";

export interface ProgressDef {
	id: string;
	name: string;
	description: string;
	icon: string;
	color: string;
	thresholds: readonly number[];
	display: ProgressDisplay;
}

/** Scope of all-time milestone rows; seasonal rows use the season id. */
export const ALL_TIME_SCOPE = "all";
```

`src/lib/achievements/milestones/definitions.ts`:
```ts
import { type ProgressDef } from "../progress/types";

/** Emerald, Diamond, Master, Grandmaster+ as rank tier ordinals. */
export const RANK_THRESHOLDS = [5, 6, 7, 8] as const;

/** All-time, tiered achievements over stored ranked games; they never go down. */
export const MILESTONES: ProgressDef[] = [
	{ id: "veteran", name: "Veteran", description: "Ranked games played", icon: "veteran", color: "#95a5a6", thresholds: [50, 200, 500, 1000], display: "count" },
	{ id: "winner", name: "Winner", description: "Ranked games won", icon: "winner", color: "#2ecc71", thresholds: [25, 100, 250, 500], display: "count" },
	{ id: "pentakiller", name: "Pentakiller", description: "Pentakills in ranked games", icon: "pentakiller", color: "#e74c3c", thresholds: [1, 5, 15, 30], display: "count" },
	{ id: "multikiller", name: "Multikiller", description: "Quadrakills in ranked games", icon: "multikiller", color: "#e67e22", thresholds: [5, 25, 75, 150], display: "count" },
	{ id: "slayer", name: "Slayer", description: "Kills in ranked games", icon: "slayer", color: "#c0392b", thresholds: [500, 2000, 5000, 10000], display: "count" },
	{ id: "wingman", name: "Wingman", description: "Assists in ranked games", icon: "wingman", color: "#1abc9c", thresholds: [1000, 4000, 10000, 20000], display: "count" },
	{ id: "visionary", name: "Visionary", description: "Total vision score in ranked games", icon: "visionary", color: "#3498db", thresholds: [5000, 20000, 50000, 100000], display: "count" },
	{ id: "demolisher", name: "Demolisher", description: "Turrets destroyed in ranked games", icon: "demolisher", color: "#e74c3c", thresholds: [25, 100, 250, 500], display: "count" },
	{ id: "epic-hunter", name: "Epic Hunter", description: "Dragons and barons slain in ranked games", icon: "epic-hunter", color: "#8e44ad", thresholds: [25, 100, 250, 500], display: "count" },
	{ id: "champion-pool", name: "Champion Pool", description: "Different champions with a ranked win", icon: "champion-pool", color: "#16a085", thresholds: [10, 25, 50, 80], display: "count" },
	{ id: "one-champ-army", name: "One Champ Army", description: "Ranked wins on your best champion", icon: "one-champ-army", color: "#e91e63", thresholds: [25, 75, 150, 300], display: "count" },
	{ id: "mastery-collector", name: "Mastery Collector", description: "Champions at mastery level 10 or higher", icon: "mastery-collector", color: "#9b59b6", thresholds: [1, 5, 10, 20], display: "count" },
	{ id: "devotion", name: "Devotion", description: "Mastery points on your most played champion", icon: "devotion", color: "#f39c12", thresholds: [100_000, 500_000, 1_000_000, 2_000_000], display: "points" },
	{ id: "peak-rank", name: "Peak Rank", description: "Highest tier reached in any ranked queue", icon: "peak-rank", color: "#5b8bf5", thresholds: RANK_THRESHOLDS, display: "rank" },
];

export function getMilestone(id: string): ProgressDef | undefined {
	return MILESTONES.find((m) => m.id === id);
}
```

`src/lib/achievements/seasonal/definitions.ts`:
```ts
import { RANK_THRESHOLDS } from "../milestones/definitions";
import { type ProgressDef } from "../progress/types";

/** Achievements of one ranked season; earned ones stay for that season. */
export const SEASONAL: ProgressDef[] = [
	{ id: "season-grinder", name: "Season Grinder", description: "Play 100 ranked games this season", icon: "season-grinder", color: "#95a5a6", thresholds: [100], display: "count" },
	{ id: "season-winner", name: "Season Winner", description: "Win 50 ranked games this season", icon: "season-winner", color: "#2ecc71", thresholds: [50], display: "count" },
	{ id: "iron-will", name: "Iron Will", description: "Keep a 55%+ win rate over 50+ ranked games this season", icon: "iron-will", color: "#7f8c8d", thresholds: [50], display: "count" },
	{ id: "hot-streak", name: "Hot Streak", description: "Win 7 ranked games in a row this season", icon: "hot-streak", color: "#e74c3c", thresholds: [7], display: "count" },
	{ id: "main-character", name: "Main Character", description: "Play 30 ranked games on one champion this season", icon: "main-character", color: "#e91e63", thresholds: [30], display: "count" },
	{ id: "promoted", name: "Promoted", description: "Climb at least one tier in a ranked queue this season", icon: "promoted", color: "#f1c40f", thresholds: [1], display: "count" },
	{ id: "triple-threat", name: "Triple Threat", description: "Be ranked in Solo, Flex and 5s this season", icon: "triple-threat", color: "#3498db", thresholds: [3], display: "count" },
	{ id: "season-peak", name: "Season Peak", description: "Highest tier reached this season", icon: "season-peak", color: "#5b8bf5", thresholds: RANK_THRESHOLDS, display: "rank" },
];

export function getSeasonal(id: string): ProgressDef | undefined {
	return SEASONAL.find((s) => s.id === id);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/lib/achievements/milestones/definitions.test.ts && pnpm typecheck`
Expected: PASS (3 tests); typecheck exit 0.

---

### Task 3: Milestone evaluator

**Files:**
- Create: `src/lib/achievements/milestones/evaluate.ts`
- Test: `src/lib/achievements/milestones/evaluate.test.ts`

**Interfaces:**
- Consumes: `MILESTONES`, `MilestoneInputs`, `ProgressResult`, `ALL_TIME_SCOPE` (Task 2); `tierFor`, `highestTierOrdinal` (Task 1).
- Produces: `evaluateMilestones(inputs: MilestoneInputs): ProgressResult[]` — exactly one result per `MILESTONES` entry, in definition order, `scope: "all"`.

- [ ] **Step 1: Write the failing test**

`src/lib/achievements/milestones/evaluate.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { type ChampionTotals, type MilestoneInputs } from "../progress/types";
import { evaluateMilestones } from "./evaluate";

function champ(championName: string, overrides: Partial<ChampionTotals> = {}): ChampionTotals {
	return { championName, games: 0, wins: 0, pentas: 0, quadras: 0, kills: 0, assists: 0, vision: 0, turrets: 0, epics: 0, ...overrides };
}

const empty: MilestoneInputs = { champions: [], snapshots: [], ranked: [], masteries: [] };

function byId(inputs: MilestoneInputs) {
	return Object.fromEntries(evaluateMilestones(inputs).map((r) => [r.achievementId, r]));
}

describe("evaluateMilestones", () => {
	it("returns every milestone at zero for an account without games, Peak Rank at -1", () => {
		const results = evaluateMilestones(empty);
		expect(results).toHaveLength(14);
		expect(results.every((r) => r.scope === "all" && r.tier === 0)).toBe(true);
		expect(byId(empty)["peak-rank"].value).toBe(-1);
		expect(byId(empty).veteran.value).toBe(0);
	});

	it("sums champion totals into the counting milestones", () => {
		const r = byId({
			...empty,
			champions: [champ("Ahri", { games: 150, wins: 80, pentas: 2, kills: 900, epics: 30 }), champ("Lux", { games: 60, wins: 30, quadras: 5 })],
		});
		expect(r.veteran).toMatchObject({ value: 210, tier: 2 });
		expect(r.winner).toMatchObject({ value: 110, tier: 2 });
		expect(r.pentakiller).toMatchObject({ value: 2, tier: 1 });
		expect(r.multikiller).toMatchObject({ value: 5, tier: 1 });
		expect(r.slayer).toMatchObject({ value: 900, tier: 1 });
		expect(r["epic-hunter"]).toMatchObject({ value: 30, tier: 1 });
	});

	it("counts champions with a win and the best champion's wins", () => {
		const champions = [champ("Ahri", { games: 40, wins: 26 }), champ("Lux", { games: 3, wins: 0 }), ...Array.from({ length: 9 }, (_, i) => champ(`C${i}`, { games: 1, wins: 1 }))];
		const r = byId({ ...empty, champions });
		expect(r["champion-pool"]).toMatchObject({ value: 10, tier: 1 });
		expect(r["one-champ-army"]).toMatchObject({ value: 26, tier: 1 });
	});

	it("reads mastery milestones even without games", () => {
		const r = byId({ ...empty, masteries: [{ championLevel: 12, championPoints: 600_000 }, { championLevel: 10, championPoints: 90_000 }, { championLevel: 7, championPoints: 50_000 }] });
		expect(r["mastery-collector"]).toMatchObject({ value: 2, tier: 1 });
		expect(r.devotion).toMatchObject({ value: 600_000, tier: 2 });
	});

	it("takes Peak Rank from the highest snapshot or current rank in any queue", () => {
		const r = byId({
			...empty,
			snapshots: [{ queueType: "RANKED_FLEX_SR", tier: "DIAMOND", createdAt: new Date("2025-05-01") }],
			ranked: [{ queueType: "RANKED_SOLO_5x5", tier: "EMERALD" }],
		});
		expect(r["peak-rank"]).toMatchObject({ value: 6, tier: 2 });
		expect(byId({ ...empty, ranked: [{ queueType: "RANKED_SOLO_5x5", tier: "CHALLENGER" }] })["peak-rank"].tier).toBe(4);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/lib/achievements/milestones/evaluate.test.ts`
Expected: FAIL — "Cannot find module './evaluate'".

- [ ] **Step 3: Implement**

`src/lib/achievements/milestones/evaluate.ts`:
```ts
import { highestTierOrdinal, tierFor } from "../tiers";
import { ALL_TIME_SCOPE, type ChampionTotals, type MilestoneInputs, type ProgressResult } from "../progress/types";
import { MILESTONES } from "./definitions";

const sum = (champions: ChampionTotals[], field: keyof Omit<ChampionTotals, "championName">) => champions.reduce((s, c) => s + c[field], 0);

/** Raw value of every milestone from the inputs. */
function milestoneValues({ champions, snapshots, ranked, masteries }: MilestoneInputs): Record<string, number> {
	return {
		veteran: sum(champions, "games"),
		winner: sum(champions, "wins"),
		pentakiller: sum(champions, "pentas"),
		multikiller: sum(champions, "quadras"),
		slayer: sum(champions, "kills"),
		wingman: sum(champions, "assists"),
		visionary: sum(champions, "vision"),
		demolisher: sum(champions, "turrets"),
		"epic-hunter": sum(champions, "epics"),
		"champion-pool": champions.filter((c) => c.wins > 0).length,
		"one-champ-army": Math.max(0, ...champions.map((c) => c.wins)),
		"mastery-collector": masteries.filter((m) => m.championLevel >= 10).length,
		devotion: Math.max(0, ...masteries.map((m) => m.championPoints)),
		"peak-rank": highestTierOrdinal([...snapshots.map((s) => s.tier), ...ranked.map((r) => r.tier)]),
	};
}

/** One all-time result per milestone, in definition order. */
export function evaluateMilestones(inputs: MilestoneInputs): ProgressResult[] {
	const values = milestoneValues(inputs);
	return MILESTONES.map((def) => {
		const value = values[def.id];
		return { achievementId: def.id, scope: ALL_TIME_SCOPE, value, tier: tierFor(value, def.thresholds) };
	});
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/lib/achievements/milestones/evaluate.test.ts`
Expected: PASS (5 tests).

---

### Task 4: Seasonal evaluator

**Files:**
- Create: `src/lib/achievements/seasonal/evaluate.ts`
- Test: `src/lib/achievements/seasonal/evaluate.test.ts`

**Interfaces:**
- Consumes: `SEASONAL`, `SeasonalInputs`, `ProgressResult` (Task 2); `tierFor`, `rankTierOrdinal`, `highestTierOrdinal` (Task 1).
- Produces:
  - `longestWinStreak(wins: boolean[]): number`
  - `evaluateSeasonal(seasonId: string, inputs: SeasonalInputs): ProgressResult[]` — one result per `SEASONAL` entry in definition order, `scope: seasonId`; **omits `triple-threat` when `inputs.ranked === null`**.

- [ ] **Step 1: Write the failing test**

`src/lib/achievements/seasonal/evaluate.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { type ChampionTotals, type SeasonalInputs } from "../progress/types";
import { evaluateSeasonal, longestWinStreak } from "./evaluate";

function champ(championName: string, games: number, wins: number): ChampionTotals {
	return { championName, games, wins, pentas: 0, quadras: 0, kills: 0, assists: 0, vision: 0, turrets: 0, epics: 0 };
}

const base: SeasonalInputs = { champions: [], wins: [], snapshots: [], ranked: [] };

function byId(inputs: SeasonalInputs) {
	return Object.fromEntries(evaluateSeasonal("2026", inputs).map((r) => [r.achievementId, r]));
}

describe("longestWinStreak", () => {
	it("finds the longest run of wins in order", () => {
		expect(longestWinStreak([true, true, false, true, true, true, false])).toBe(3);
		expect(longestWinStreak([])).toBe(0);
	});
});

describe("evaluateSeasonal", () => {
	it("scopes every result to the season", () => {
		const results = evaluateSeasonal("2026", base);
		expect(results).toHaveLength(8);
		expect(results.every((r) => r.scope === "2026")).toBe(true);
	});

	it("counts games, wins and the most played champion", () => {
		const r = byId({ ...base, champions: [champ("Ahri", 70, 40), champ("Lux", 35, 15)] });
		expect(r["season-grinder"]).toMatchObject({ value: 105, tier: 1 });
		expect(r["season-winner"]).toMatchObject({ value: 55, tier: 1 });
		expect(r["main-character"]).toMatchObject({ value: 70, tier: 1 });
	});

	it("needs 50 games and a 55% win rate for Iron Will", () => {
		expect(byId({ ...base, champions: [champ("Ahri", 49, 40)] })["iron-will"]).toMatchObject({ value: 49, tier: 0 });
		expect(byId({ ...base, champions: [champ("Ahri", 60, 32)] })["iron-will"]).toMatchObject({ value: 60, tier: 0 });
		expect(byId({ ...base, champions: [champ("Ahri", 60, 33)] })["iron-will"]).toMatchObject({ value: 60, tier: 1 });
	});

	it("awards Hot Streak for 7 straight wins", () => {
		expect(byId({ ...base, wins: [true, true, true, true, true, true, false, true] })["hot-streak"]).toMatchObject({ value: 6, tier: 0 });
		expect(byId({ ...base, wins: Array(7).fill(true) })["hot-streak"]).toMatchObject({ value: 7, tier: 1 });
	});

	it("awards Promoted when a queue's current tier is above its first snapshot of the season", () => {
		const snapshots = [
			{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", createdAt: new Date("2026-01-10") },
			{ queueType: "RANKED_FLEX_SR", tier: "PLATINUM", createdAt: new Date("2026-01-11") },
		];
		expect(byId({ ...base, snapshots, ranked: [{ queueType: "RANKED_SOLO_5x5", tier: "GOLD" }, { queueType: "RANKED_FLEX_SR", tier: "GOLD" }] }).promoted.tier).toBe(0);
		expect(byId({ ...base, snapshots, ranked: [{ queueType: "RANKED_FLEX_SR", tier: "EMERALD" }] }).promoted).toMatchObject({ value: 1, tier: 1 });
	});

	it("uses the season's last snapshot for Promoted and skips Triple Threat in a closed season", () => {
		const snapshots = [
			{ queueType: "RANKED_SOLO_5x5", tier: "SILVER", createdAt: new Date("2025-02-01") },
			{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", createdAt: new Date("2025-11-01") },
		];
		const results = evaluateSeasonal("2025", { ...base, snapshots, ranked: null });
		expect(results.find((r) => r.achievementId === "promoted")?.tier).toBe(1);
		expect(results.some((r) => r.achievementId === "triple-threat")).toBe(false);
	});

	it("counts ranked queues for Triple Threat", () => {
		const ranked = [
			{ queueType: "RANKED_SOLO_5x5", tier: "GOLD" },
			{ queueType: "RANKED_FLEX_SR", tier: "GOLD" },
			{ queueType: "RANKED_PREMADE_5x5", tier: "SILVER" },
		];
		expect(byId({ ...base, ranked })["triple-threat"]).toMatchObject({ value: 3, tier: 1 });
		expect(byId({ ...base, ranked: ranked.slice(0, 2) })["triple-threat"]).toMatchObject({ value: 2, tier: 0 });
	});

	it("takes Season Peak from the season's snapshots and current ranks", () => {
		const r = byId({ ...base, snapshots: [{ queueType: "RANKED_SOLO_5x5", tier: "MASTER", createdAt: new Date("2026-03-01") }], ranked: [{ queueType: "RANKED_SOLO_5x5", tier: "DIAMOND" }] });
		expect(r["season-peak"]).toMatchObject({ value: 7, tier: 3 });
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/lib/achievements/seasonal/evaluate.test.ts`
Expected: FAIL — "Cannot find module './evaluate'".

- [ ] **Step 3: Implement**

`src/lib/achievements/seasonal/evaluate.ts`:
```ts
import { highestTierOrdinal, rankTierOrdinal, tierFor } from "../tiers";
import { type ProgressResult, type SeasonalInputs, type TierSnapshot } from "../progress/types";
import { SEASONAL } from "./definitions";

const IRON_WILL_PERCENT = 55;
const RANKED_QUEUES = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR", "RANKED_PREMADE_5x5"];

/** Longest run of consecutive wins. */
export function longestWinStreak(wins: boolean[]): number {
	let best = 0;
	let run = 0;
	for (const win of wins) {
		run = win ? run + 1 : 0;
		best = Math.max(best, run);
	}
	return best;
}

/** 1 when any queue ended (or currently is) above the tier of its first snapshot in the season. */
function promoted(snapshots: TierSnapshot[], ranked: SeasonalInputs["ranked"]): number {
	const sorted = [...snapshots].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
	return RANKED_QUEUES.some((queue) => {
		const inQueue = sorted.filter((s) => s.queueType === queue);
		if (inQueue.length === 0) return false;
		const latest = ranked ? ranked.find((r) => r.queueType === queue)?.tier : inQueue[inQueue.length - 1].tier;
		return latest !== undefined && rankTierOrdinal(latest) > rankTierOrdinal(inQueue[0].tier);
	})
		? 1
		: 0;
}

/** Results for one season, in definition order; Triple Threat needs current ranks and is left out otherwise. */
export function evaluateSeasonal(seasonId: string, inputs: SeasonalInputs): ProgressResult[] {
	const { champions, wins, snapshots, ranked } = inputs;
	const games = champions.reduce((s, c) => s + c.games, 0);
	const won = champions.reduce((s, c) => s + c.wins, 0);
	const values: Record<string, number> = {
		"season-grinder": games,
		"season-winner": won,
		"iron-will": games,
		"hot-streak": longestWinStreak(wins),
		"main-character": Math.max(0, ...champions.map((c) => c.games)),
		promoted: promoted(snapshots, ranked),
		"triple-threat": ranked ? RANKED_QUEUES.filter((q) => ranked.some((r) => r.queueType === q)).length : 0,
		"season-peak": highestTierOrdinal([...snapshots.map((s) => s.tier), ...(ranked ?? []).map((r) => r.tier)]),
	};

	return SEASONAL.filter((def) => ranked !== null || def.id !== "triple-threat").map((def) => {
		const value = values[def.id];
		const tier = def.id === "iron-will" ? (games >= def.thresholds[0] && won * 100 >= games * IRON_WILL_PERCENT ? 1 : 0) : tierFor(value, def.thresholds);
		return { achievementId: def.id, scope: seasonId, value, tier };
	});
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/lib/achievements/seasonal/evaluate.test.ts`
Expected: PASS (9 tests).

---

### Task 5: Merge rule

**Files:**
- Create: `src/lib/achievements/progress/merge.ts`
- Test: `src/lib/achievements/progress/merge.test.ts`

**Interfaces:**
- Consumes: `ProgressResult`, `StoredProgress` (Task 2).
- Produces: `mergeProgress(stored: StoredProgress | undefined, computed: ProgressResult, now: Date): StoredProgress`.

- [ ] **Step 1: Write the failing test**

`src/lib/achievements/progress/merge.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { mergeProgress } from "./merge";

const now = new Date("2026-10-11T12:00:00Z");
const earlier = new Date("2026-05-01T12:00:00Z");
const row = { achievementId: "veteran", scope: "all" };

describe("mergeProgress", () => {
	it("dates every tier reached on the first save", () => {
		expect(mergeProgress(undefined, { ...row, value: 600, tier: 3 }, now)).toEqual({ ...row, value: 600, tier: 3, reachedAt: [now, now, now] });
		expect(mergeProgress(undefined, { ...row, value: 3, tier: 0 }, now).reachedAt).toEqual([]);
	});

	it("keeps old dates and appends only newly reached tiers", () => {
		const stored = { ...row, value: 250, tier: 2, reachedAt: [earlier, earlier] };
		expect(mergeProgress(stored, { ...row, value: 1200, tier: 4 }, now)).toEqual({ ...row, value: 1200, tier: 4, reachedAt: [earlier, earlier, now, now] });
	});

	it("never lowers the tier, even when the value drops (derank, pruned games, partial mastery)", () => {
		const stored = { ...row, achievementId: "peak-rank", value: 7, tier: 3, reachedAt: [earlier, earlier, earlier] };
		expect(mergeProgress(stored, { ...row, achievementId: "peak-rank", value: 5, tier: 1 }, now)).toEqual({ ...stored, value: 5 });
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/lib/achievements/progress/merge.test.ts`
Expected: FAIL — "Cannot find module './merge'".

- [ ] **Step 3: Implement**

`src/lib/achievements/progress/merge.ts`:
```ts
import { type ProgressResult, type StoredProgress } from "./types";

/** New value, the higher tier, and a `now` date for each tier reached for the first time. */
export function mergeProgress(stored: StoredProgress | undefined, computed: ProgressResult, now: Date): StoredProgress {
	const reachedAt = stored?.reachedAt ?? [];
	const tier = Math.max(stored?.tier ?? 0, computed.tier);
	return {
		...computed,
		tier,
		reachedAt: [...reachedAt, ...Array.from({ length: Math.max(0, tier - reachedAt.length) }, () => now)],
	};
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/lib/achievements/progress/merge.test.ts`
Expected: PASS (3 tests).

---

### Task 6: Schema, migration, queries, backfill and save

**Files:**
- Modify: `prisma/schema.prisma` (add model + `Account.achievementProgress` relation)
- Create: `prisma/migrations/20261011120000_add_achievement_progress/migration.sql`, `src/lib/achievements/progress/backfill.ts`, `src/lib/achievements/progress/query.ts`, `src/lib/achievements/progress/save.ts`
- Test: `src/lib/achievements/progress/backfill.test.ts`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces:
  - `seasonsToCompute(existingScopes: Set<string>, now: Date): { season: Season; closed: boolean }[]` — the current season (closed: false) plus every closed season whose id is not in `existingScopes` (closed: true), oldest first.
  - `hasSeasonData(inputs: SeasonalInputs): boolean` — true when any champion has games or there is any snapshot.
  - `loadChampionTotals(puuid: string, range?: { from: Date; to: Date | null }): Promise<ChampionTotals[]>`
  - `loadWinSequence(puuid: string, range: { from: Date; to: Date | null }): Promise<boolean[]>`
  - `loadTierSnapshots(puuid: string, range?: { from: Date; to: Date | null }): Promise<TierSnapshot[]>`
  - `loadCurrentRanks(puuid: string): Promise<CurrentRank[]>`
  - `loadMasteries(puuid: string): Promise<MasteryPoint[]>`
  - `recomputeProgress(puuid: string, now?: Date): Promise<void>`

- [ ] **Step 1: Write the failing backfill test**

`src/lib/achievements/progress/backfill.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { hasSeasonData, seasonsToCompute } from "./backfill";

const now = new Date("2026-10-11T12:00:00Z");

describe("seasonsToCompute", () => {
	it("backfills a closed season once, then only the current season", () => {
		expect(seasonsToCompute(new Set(["all"]), now).map((s) => [s.season.id, s.closed])).toEqual([["2025", true], ["2026", false]]);
		expect(seasonsToCompute(new Set(["all", "2025", "2026"]), now).map((s) => s.season.id)).toEqual(["2026"]);
	});
});

describe("hasSeasonData", () => {
	it("is false for a season without games or snapshots", () => {
		expect(hasSeasonData({ champions: [], wins: [], snapshots: [], ranked: null })).toBe(false);
		expect(hasSeasonData({ champions: [], wins: [], snapshots: [{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", createdAt: now }], ranked: null })).toBe(true);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/lib/achievements/progress/backfill.test.ts`
Expected: FAIL — "Cannot find module './backfill'".

- [ ] **Step 3: Implement backfill**

`src/lib/achievements/progress/backfill.ts`:
```ts
import { SEASONS, currentSeason, type Season } from "../seasons";
import { type SeasonalInputs } from "./types";

/** The current season plus every closed season that has no rows yet; closed seasons are never rewritten. */
export function seasonsToCompute(existingScopes: Set<string>, now: Date): { season: Season; closed: boolean }[] {
	const current = currentSeason(now);
	return SEASONS.filter((s) => new Date(s.start) <= now)
		.filter((s) => s.id === current.id || !existingScopes.has(s.id))
		.map((season) => ({ season, closed: season.id !== current.id }));
}

/** Whether a season has anything to show; empty closed seasons get no rows. */
export function hasSeasonData(inputs: SeasonalInputs): boolean {
	return inputs.champions.some((c) => c.games > 0) || inputs.snapshots.length > 0;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/lib/achievements/progress/backfill.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Add the schema model**

In `prisma/schema.prisma`, add to `model Account` after `achievements      PlayerAchievement[]`:
```prisma
  achievementProgress AchievementProgress[]
```
Add after `model PlayerAchievement { … }`:
```prisma
/// Milestone (scope "all") and seasonal (scope = season id) progress; tiers only go up.
model AchievementProgress {
  puuid         String
  achievementId String
  scope         String
  value         Int
  tier          Int
  reachedAt     DateTime[]
  updatedAt     DateTime   @updatedAt

  account Account @relation(fields: [puuid], references: [puuid])

  @@id([puuid, achievementId, scope])
  @@index([achievementId, scope, tier])
}
```

- [ ] **Step 6: Write the migration SQL (do not apply it)**

`prisma/migrations/20261011120000_add_achievement_progress/migration.sql`:
```sql
-- CreateTable
CREATE TABLE "AchievementProgress" (
    "puuid" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "tier" INTEGER NOT NULL,
    "reachedAt" TIMESTAMP(3)[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AchievementProgress_pkey" PRIMARY KEY ("puuid","achievementId","scope")
);

-- CreateIndex
CREATE INDEX "AchievementProgress_achievementId_scope_tier_idx" ON "AchievementProgress"("achievementId", "scope", "tier");

-- AddForeignKey
ALTER TABLE "AchievementProgress" ADD CONSTRAINT "AchievementProgress_puuid_fkey" FOREIGN KEY ("puuid") REFERENCES "Account"("puuid") ON DELETE RESTRICT ON UPDATE CASCADE;
```

Run: `pnpm prisma generate`
Expected: "Generated Prisma Client" (no DB connection needed).

Then confirm the SQL matches the schema without touching the database:
Run: `pnpm prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`
Expected: an empty script (`-- This is an empty migration.`). If the command needs a shadow database, skip it and compare the SQL by eye against the model instead.

- [ ] **Step 7: Implement the queries**

Plan ruling: the spec describes one aggregate with `FILTER` columns per season; this plan calls the same aggregate once per time range instead (all-time, current season, each backfilled season). Same SQL shape, simpler code, and closed-season backfill needs per-season sums anyway.

`src/lib/achievements/progress/query.ts`:
```ts
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db";
import { ACHIEVEMENT_QUEUE_IDS, MIN_ACHIEVEMENT_GAME_SECONDS } from "../eligibility";
import { type ChampionTotals, type CurrentRank, type MasteryPoint, type TierSnapshot } from "./types";

export interface TimeRange {
	from: Date;
	to: Date | null;
}

/** Eligible games of one player, optionally limited to a time range. */
function eligibleGames(puuid: string, range?: TimeRange): Prisma.Sql {
	const from = range ? Prisma.sql`AND m."gameCreation" >= ${BigInt(range.from.getTime())}` : Prisma.empty;
	const to = range?.to ? Prisma.sql`AND m."gameCreation" < ${BigInt(range.to.getTime())}` : Prisma.empty;
	return Prisma.sql`
		FROM "Match" m
		CROSS JOIN LATERAL jsonb_array_elements(m.data->'info'->'participants') AS p
		WHERE m.data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
			AND p->>'puuid' = ${puuid}
			AND m."queueId" = ANY(${ACHIEVEMENT_QUEUE_IDS}::int[])
			AND m."gameDuration" >= ${MIN_ACHIEVEMENT_GAME_SECONDS}
			${from}
			${to}
	`;
}

/** Per-champion sums over the player's eligible games. */
export async function loadChampionTotals(puuid: string, range?: TimeRange): Promise<ChampionTotals[]> {
	return prisma.$queryRaw<ChampionTotals[]>`
		SELECT
			p->>'championName' AS "championName",
			COUNT(*)::int AS games,
			(COUNT(*) FILTER (WHERE (p->>'win')::boolean))::int AS wins,
			SUM((p->>'pentaKills')::int)::int AS pentas,
			SUM((p->>'quadraKills')::int)::int AS quadras,
			SUM((p->>'kills')::int)::int AS kills,
			SUM((p->>'assists')::int)::int AS assists,
			SUM((p->>'visionScore')::int)::int AS vision,
			SUM((p->>'turretKills')::int)::int AS turrets,
			SUM((p->>'dragonKills')::int + (p->>'baronKills')::int)::int AS epics
		${eligibleGames(puuid, range)}
		GROUP BY 1
	`;
}

/** Wins and losses of the player's eligible games in a range, oldest first. */
export async function loadWinSequence(puuid: string, range: TimeRange): Promise<boolean[]> {
	const rows = await prisma.$queryRaw<{ win: boolean }[]>`
		SELECT (p->>'win')::boolean AS win
		${eligibleGames(puuid, range)}
		ORDER BY m."gameCreation" ASC
	`;
	return rows.map((r) => r.win);
}

/** LP snapshots reduced to their tier, optionally limited to a range. */
export async function loadTierSnapshots(puuid: string, range?: TimeRange): Promise<TierSnapshot[]> {
	return prisma.lPHistory.findMany({
		where: { puuid, ...(range && { createdAt: { gte: range.from, ...(range.to && { lt: range.to }) } }) },
		select: { queueType: true, tier: true, createdAt: true },
		orderBy: { createdAt: "asc" },
	});
}

export async function loadCurrentRanks(puuid: string): Promise<CurrentRank[]> {
	return prisma.rankedEntry.findMany({ where: { puuid }, select: { queueType: true, tier: true } });
}

export async function loadMasteries(puuid: string): Promise<MasteryPoint[]> {
	return prisma.championMastery.findMany({ where: { puuid }, select: { championLevel: true, championPoints: true } });
}
```

- [ ] **Step 8: Implement save**

`src/lib/achievements/progress/save.ts`:
```ts
import { prisma } from "@/lib/server/db";
import { evaluateMilestones } from "../milestones/evaluate";
import { evaluateSeasonal } from "../seasonal/evaluate";
import { seasonRange } from "../seasons";
import { hasSeasonData, seasonsToCompute } from "./backfill";
import { mergeProgress } from "./merge";
import { loadChampionTotals, loadCurrentRanks, loadMasteries, loadTierSnapshots, loadWinSequence } from "./query";
import { type ProgressResult, type StoredProgress } from "./types";

const key = (r: { achievementId: string; scope: string }) => `${r.achievementId}:${r.scope}`;

/** Recomputes milestones and seasons for one account and upserts the merged rows. */
export async function recomputeProgress(puuid: string, now: Date = new Date()): Promise<void> {
	const stored = await prisma.achievementProgress.findMany({ where: { puuid } });
	const byKey = new Map<string, StoredProgress>(stored.map((s) => [key(s), s]));

	const [champions, snapshots, ranked, masteries] = await Promise.all([
		loadChampionTotals(puuid),
		loadTierSnapshots(puuid),
		loadCurrentRanks(puuid),
		loadMasteries(puuid),
	]);
	const computed: ProgressResult[] = evaluateMilestones({ champions, snapshots, ranked, masteries });

	for (const { season, closed } of seasonsToCompute(new Set(stored.map((s) => s.scope)), now)) {
		const range = seasonRange(season);
		const [seasonChampions, wins, seasonSnapshots] = await Promise.all([
			loadChampionTotals(puuid, range),
			loadWinSequence(puuid, range),
			loadTierSnapshots(puuid, range),
		]);
		const inputs = { champions: seasonChampions, wins, snapshots: seasonSnapshots, ranked: closed ? null : ranked };
		if (closed && !hasSeasonData(inputs)) continue;
		computed.push(...evaluateSeasonal(season.id, inputs));
	}

	await prisma.$transaction(
		computed.map((result) => {
			const merged = mergeProgress(byKey.get(key(result)), result, now);
			const data = { value: merged.value, tier: merged.tier, reachedAt: merged.reachedAt };
			return prisma.achievementProgress.upsert({
				where: { puuid_achievementId_scope: { puuid, achievementId: result.achievementId, scope: result.scope } },
				update: data,
				create: { puuid, achievementId: result.achievementId, scope: result.scope, ...data },
			});
		}),
	);
}
```

- [ ] **Step 9: Verify**

Run: `pnpm typecheck && pnpm vitest run src/lib/achievements`
Expected: typecheck exit 0; all achievement tests PASS.

---

### Task 7: Rarity, payload schema and API

**Files:**
- Create: `src/lib/achievements/progress/rarity.ts`, `src/lib/validators/achievements.ts`, `src/lib/achievements/payload.ts`
- Modify: `src/app/api/achievements/route.ts`, `src/app/api/cron/achievements/route.ts`
- Test: `src/lib/achievements/progress/rarity.test.ts`, `src/lib/validators/achievements.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 2, 6; `getAppSetting`, `setAppSetting` from `@/lib/server/app-settings`; existing `detectAchievements`, `loadAchievementMatches`.
- Produces:
  - `computeRarityShares(rows: { achievementId: string; scope: string; tier: number; count: number }[], players: number): Record<string, number[]>` — key `${id}:${scope}`; `shares[key][t-1]` = accounts with tier ≥ t / players, for t = 1..max tier present; `{}` when players is 0.
  - `RARITY_SETTING_KEY = "achievement-rarity"`; `saveRarity(now?: Date): Promise<void>`; `loadRarity(): Promise<Rarity | null>`.
  - Zod: `achievementPayloadSchema`, `rarityStoreSchema`; types `AchievementPayload`, `ProgressRow`, `Rarity`.
  - `loadAchievementPayload(puuid: string): Promise<AchievementPayload>`.

- [ ] **Step 1: Write the failing tests**

`src/lib/achievements/progress/rarity.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { computeRarityShares } from "./rarity";

describe("computeRarityShares", () => {
	it("gives the share of players at or above each tier", () => {
		const rows = [
			{ achievementId: "veteran", scope: "all", tier: 0, count: 6 },
			{ achievementId: "veteran", scope: "all", tier: 1, count: 2 },
			{ achievementId: "veteran", scope: "all", tier: 3, count: 2 },
			{ achievementId: "hot-streak", scope: "2026", tier: 1, count: 1 },
		];
		expect(computeRarityShares(rows, 10)).toEqual({ "veteran:all": [0.4, 0.2, 0.2], "hot-streak:2026": [0.1] });
	});

	it("is empty without players", () => {
		expect(computeRarityShares([{ achievementId: "veteran", scope: "all", tier: 1, count: 1 }], 0)).toEqual({});
	});
});
```

`src/lib/validators/achievements.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { achievementPayloadSchema } from "./achievements";

describe("achievementPayloadSchema", () => {
	it("accepts the API payload with and without rarity", () => {
		const payload = {
			form: [{ achievementId: "carry", earnedAt: "2026-10-11T12:00:00.000Z" }],
			progress: [{ achievementId: "veteran", scope: "all", value: 312, tier: 2, reachedAt: ["2026-10-11T12:00:00.000Z", "2026-10-11T12:00:00.000Z"] }],
			rarity: { players: 40, shares: { "veteran:all": [0.5, 0.2] } },
		};
		expect(achievementPayloadSchema.parse(payload)).toEqual(payload);
		expect(achievementPayloadSchema.parse({ ...payload, rarity: null }).rarity).toBeNull();
	});
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run src/lib/achievements/progress/rarity.test.ts src/lib/validators/achievements.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the validators**

`src/lib/validators/achievements.ts`:
```ts
import { z } from "zod";

export const rarityStoreSchema = z.object({
	computedAt: z.string(),
	players: z.number(),
	shares: z.record(z.string(), z.array(z.number())),
});

export const raritySchema = rarityStoreSchema.omit({ computedAt: true });

export const progressRowSchema = z.object({
	achievementId: z.string(),
	scope: z.string(),
	value: z.number(),
	tier: z.number(),
	reachedAt: z.array(z.string()),
});

export const achievementPayloadSchema = z.object({
	form: z.array(z.object({ achievementId: z.string(), earnedAt: z.string() })),
	progress: z.array(progressRowSchema),
	rarity: raritySchema.nullable(),
});

export type ProgressRow = z.infer<typeof progressRowSchema>;
export type Rarity = z.infer<typeof raritySchema>;
export type AchievementPayload = z.infer<typeof achievementPayloadSchema>;
```

- [ ] **Step 4: Implement rarity**

`src/lib/achievements/progress/rarity.ts`:
```ts
import { prisma } from "@/lib/server/db";
import { getAppSetting, setAppSetting } from "@/lib/server/app-settings";
import { rarityStoreSchema, type Rarity } from "@/lib/validators/achievements";
import { currentSeason } from "../seasons";
import { ALL_TIME_SCOPE } from "./types";

export const RARITY_SETTING_KEY = "achievement-rarity";

/** Share of `players` at or above each tier, per `${id}:${scope}`. */
export function computeRarityShares(rows: { achievementId: string; scope: string; tier: number; count: number }[], players: number): Record<string, number[]> {
	if (players === 0) return {};
	const shares: Record<string, number[]> = {};
	for (const row of rows) {
		if (row.tier === 0) continue;
		const list = (shares[`${row.achievementId}:${row.scope}`] ??= []);
		for (let t = 0; t < row.tier; t++) list[t] = (list[t] ?? 0) + row.count / players;
	}
	for (const list of Object.values(shares)) for (let t = 0; t < list.length; t++) list[t] = Math.round((list[t] ?? 0) * 1000) / 1000;
	return shares;
}

/** Counts every computed account (each has a Veteran row) and stores the shares for all-time and the current season. */
export async function saveRarity(now: Date = new Date()): Promise<void> {
	const scopes = [ALL_TIME_SCOPE, currentSeason(now).id];
	const [players, groups] = await Promise.all([
		prisma.achievementProgress.count({ where: { achievementId: "veteran", scope: ALL_TIME_SCOPE } }),
		prisma.achievementProgress.groupBy({ by: ["achievementId", "scope", "tier"], where: { scope: { in: scopes } }, _count: { _all: true } }),
	]);
	const rows = groups.map((g) => ({ achievementId: g.achievementId, scope: g.scope, tier: g.tier, count: g._count._all }));
	await setAppSetting(RARITY_SETTING_KEY, JSON.stringify({ computedAt: now.toISOString(), players, shares: computeRarityShares(rows, players) }));
}

/** Stored rarity, or null before the first cron run or when the stored JSON is unreadable. */
export async function loadRarity(): Promise<Rarity | null> {
	const raw = await getAppSetting(RARITY_SETTING_KEY);
	if (!raw) return null;
	try {
		const { players, shares } = rarityStoreSchema.parse(JSON.parse(raw));
		return { players, shares };
	} catch {
		return null;
	}
}
```

Note: `getAppSetting` logs the value with `console.log`; that existing behavior stays.

- [ ] **Step 5: Run to verify they pass**

Run: `pnpm vitest run src/lib/achievements/progress/rarity.test.ts src/lib/validators/achievements.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Implement the payload loader**

`src/lib/achievements/payload.ts`:
```ts
import { prisma } from "@/lib/server/db";
import { type AchievementPayload } from "@/lib/validators/achievements";
import { loadRarity } from "./progress/rarity";

/** Current form, milestone and seasonal rows plus rarity for one account. */
export async function loadAchievementPayload(puuid: string): Promise<AchievementPayload> {
	const [form, progress, rarity] = await Promise.all([
		prisma.playerAchievement.findMany({ where: { puuid }, select: { achievementId: true, earnedAt: true } }),
		prisma.achievementProgress.findMany({ where: { puuid }, select: { achievementId: true, scope: true, value: true, tier: true, reachedAt: true } }),
		loadRarity(),
	]);
	return {
		form: form.map((f) => ({ achievementId: f.achievementId, earnedAt: f.earnedAt.toISOString() })),
		progress: progress.map((p) => ({ ...p, reachedAt: p.reachedAt.map((d) => d.toISOString()) })),
		rarity,
	};
}
```

- [ ] **Step 7: Rewrite the achievements route**

Replace `src/app/api/achievements/route.ts` with:
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { loadAchievementPayload } from "@/lib/achievements/payload";
import { detectAchievements } from "@/lib/achievements/profile/detect";
import { loadAchievementMatches } from "@/lib/achievements/profile/query";
import { recomputeProgress } from "@/lib/achievements/progress/save";
import { type AchievementPayload } from "@/lib/validators/achievements";

type Response = NextResponse<{ error: string }> | NextResponse<AchievementPayload>;

export async function GET(req: NextRequest): Promise<Response> {
	const puuid = req.nextUrl.searchParams.get("puuid");
	if (!puuid) return NextResponse.json({ error: "puuid required" }, { status: 400 });

	return NextResponse.json(await loadAchievementPayload(puuid));
}

/** Recomputes Current form, milestones and seasons for one account, then returns its payload. */
export async function POST(req: NextRequest): Promise<Response> {
	const { puuid } = await req.json();
	if (!puuid) return NextResponse.json({ error: "puuid is required" }, { status: 400 });

	try {
		const earnedIds = detectAchievements({ matches: await loadAchievementMatches(puuid), puuid });
		if (earnedIds.length > 0) {
			await prisma.playerAchievement.createMany({ data: earnedIds.map((achievementId) => ({ puuid, achievementId })), skipDuplicates: true });
		}
		await prisma.playerAchievement.deleteMany({ where: { puuid, achievementId: { notIn: earnedIds } } });
		await recomputeProgress(puuid);
	} catch (error) {
		console.error("[api/achievements] detection failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}

	return NextResponse.json(await loadAchievementPayload(puuid));
}
```

- [ ] **Step 8: Extend the cron**

In `src/app/api/cron/achievements/route.ts`:
- add imports `import { recomputeProgress } from "@/lib/achievements/progress/save";` and `import { saveRarity } from "@/lib/achievements/progress/rarity";`;
- remove the `rankedEntry.findMany` lookup and the `ranked` argument (Task 8 drops the parameter);
- after the `deleteMany` inside the per-account `try`, add `await recomputeProgress(account.puuid);`;
- after the `for` loop, before the success response, add:
```ts
		await saveRarity();
```

- [ ] **Step 9: Verify**

Run: `pnpm typecheck`
Expected: exit 0 except errors from `detectAchievements` still taking `ranked` (fixed in Task 8) — if typecheck fails only on `ranked`, continue to Task 8 and re-run there.

---

### Task 8: Current form cleanup

**Files:**
- Modify: `src/lib/achievements/profile/definitions.ts`, `src/lib/achievements/profile/detect.ts`, `src/lib/achievements/profile/detect.test.ts`

**Interfaces:**
- Produces: `detectAchievements(input: { matches: AchievementMatch[]; puuid: string }): string[]` — no `ranked`; never returns `pentakill`, `diamond-plus`, `master-plus`, `challenger`. `AchievementDef["category"]` becomes `"combat" | "mastery" | "playstyle"`.

- [ ] **Step 1: Update the failing test first**

In `src/lib/achievements/profile/detect.test.ts`:
- replace the test `counts Ranked 5s games` body with:
```ts
		expect(detect([match({ deaths: 0, kills: 3 }, { queueId: 710 })])).toContain("perfect-kda");
```
- replace `const games = [1700, 450, 400, 1700, 450].map((queueId) => match({ win: true, pentaKills: 1 }, { queueId }));` with `const games = [1700, 450, 400, 1700, 450].map((queueId) => match({ win: true, deaths: 0, kills: 5 }, { queueId }));`
- add:
```ts
	it("leaves pentakills and rank to milestones", () => {
		const earned = detectAchievements({ matches: [match({ pentaKills: 1 })], puuid: ME });
		expect(earned).not.toContain("pentakill");
	});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/lib/achievements/profile/detect.test.ts`
Expected: FAIL — "leaves pentakills and rank to milestones" (pentakill still detected).

- [ ] **Step 3: Implement**

In `src/lib/achievements/profile/detect.ts`:
- delete `import { type RankedEntry } …`, the `ranked?: RankedEntry[];` field, `ranked` from the destructuring, the line `if (players.some((p) => p.pentaKills > 0)) earned.push("pentakill");` and the whole `// --- Rank (current tier, not match-based) ---` block;
- change the JSDoc to `/** Returns the Current form achievement IDs a player has earned from their ranked games (remakes excluded). */`.

In `src/lib/achievements/profile/definitions.ts`:
- delete the `pentakill`, `diamond-plus`, `master-plus` and `challenger` entries and the `// Rank` comment;
- change `category: "combat" | "mastery" | "rank" | "playstyle";` to `category: "combat" | "mastery" | "playstyle";`.

Keep `pentaKills` in the SQL projection and `achievementParticipantSchema` (match badges are unaffected; the field is harmless).

- [ ] **Step 4: Verify**

Run: `pnpm vitest run src/lib/achievements && pnpm typecheck`
Expected: PASS; typecheck errors only in `achievements-tab.tsx` (`"rank"` category) and hook consumers — fixed in Task 10. Note them and continue.

---

### Task 9: Display helpers and hook

**Files:**
- Create: `src/lib/achievements/display.ts`
- Modify: `src/hooks/useAchievements.ts`
- Test: `src/lib/achievements/display.test.ts`

**Interfaces:**
- Consumes: `ProgressDef` (Task 2), `TIER_NAMES`, `rankTierName` (Task 1), `ProgressRow`, `Rarity`, `AchievementPayload` (Task 7), `formatPoints` from `@/lib/shared/format`, `SEASONS`, `currentSeason` (Task 1).
- Produces:
  - `formatProgressValue(def: ProgressDef, value: number): string` — `count` → `value.toLocaleString("en-US")`; `points` → `formatPoints(value)`; `rank` → `rankTierName(value)`.
  - `interface ProgressView { tier: number; tierName: string | null; current: string; next: string | null; percent: number }`
  - `progressView(def: ProgressDef, row: ProgressRow | undefined): ProgressView` — `percent` = share of the way from the previous threshold (0 for tier 0) to the next one, 0..100; 100 and `next: null` at max tier; for binary defs `tierName` is `"Earned"` when tier 1.
  - `rarityText(rarity: Rarity | null, achievementId: string, scope: string, tier: number): string | null` — `"4% of players"` (whole percent, `"<1% of players"` below 1%); null when rarity is null, tier 0 or no share.
  - `topMilestones(rows: ProgressRow[], rarity: Rarity | null, count?: number): ProgressRow[]` — scope `"all"`, tier > 0, sorted by tier desc then share asc (missing share last), first `count` (default 3).
  - `seasonOptions(rows: ProgressRow[], now?: Date): { id: string; label: string }[]` — current season first, then archived seasons that have rows, newest first.
  - Hooks: `useAchievements(puuid)` → `useQuery<AchievementPayload>`; `useDetectAchievements()` stores the POST payload into the same key. Both parse with `achievementPayloadSchema`.

- [ ] **Step 1: Write the failing test**

`src/lib/achievements/display.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { getMilestone } from "./milestones/definitions";
import { getSeasonal } from "./seasonal/definitions";
import { progressView, rarityText, seasonOptions, topMilestones } from "./display";

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

	it("keeps a reached tier even when the value dropped below it", () => {
		expect(progressView(getMilestone("peak-rank")!, row("peak-rank", "all", 5, 3))).toMatchObject({ tier: 3, tierName: "Gold", current: "Emerald", next: "Grandmaster" });
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/lib/achievements/display.test.ts`
Expected: FAIL — "Cannot find module './display'".

- [ ] **Step 3: Implement**

`src/lib/achievements/display.ts`:
```ts
import { formatPoints } from "@/lib/shared/format";
import { type ProgressRow, type Rarity } from "@/lib/validators/achievements";
import { type ProgressDef, ALL_TIME_SCOPE } from "./progress/types";
import { SEASONS, currentSeason } from "./seasons";
import { TIER_NAMES, rankTierName } from "./tiers";

export interface ProgressView {
	tier: number;
	tierName: string | null;
	current: string;
	next: string | null;
	percent: number;
}

/** A value as the card shows it: `1,500`, `412k` or `Diamond`. */
export function formatProgressValue(def: ProgressDef, value: number): string {
	if (def.display === "points") return formatPoints(value);
	if (def.display === "rank") return rankTierName(value);
	return value.toLocaleString("en-US");
}

/** Tier label, current value, next target and bar fill (from the reached threshold to the next one). */
export function progressView(def: ProgressDef, row: ProgressRow | undefined): ProgressView {
	const tier = row?.tier ?? 0;
	const value = row?.value ?? 0;
	const max = def.thresholds.length;
	const tierName = tier === 0 ? null : max === 1 ? "Earned" : TIER_NAMES[tier - 1];
	if (tier >= max) return { tier, tierName, current: formatProgressValue(def, value), next: null, percent: 100 };

	const floor = tier === 0 ? 0 : def.thresholds[tier - 1];
	const target = def.thresholds[tier];
	const percent = Math.round(Math.min(Math.max((value - floor) / (target - floor), 0), 1) * 100);
	return { tier, tierName, current: formatProgressValue(def, value), next: formatProgressValue(def, target), percent };
}

/** `4% of players` for the reached tier; null without rarity data or a reached tier. */
export function rarityText(rarity: Rarity | null, achievementId: string, scope: string, tier: number): string | null {
	const share = tier > 0 ? rarity?.shares[`${achievementId}:${scope}`]?.[tier - 1] : undefined;
	if (share === undefined) return null;
	const percent = share * 100;
	return percent < 1 ? "<1% of players" : `${Math.round(percent)}% of players`;
}

/** The best reached milestones: highest tier first, then the rarest. */
export function topMilestones(rows: ProgressRow[], rarity: Rarity | null, count = 3): ProgressRow[] {
	const share = (r: ProgressRow) => rarity?.shares[`${r.achievementId}:${r.scope}`]?.[r.tier - 1] ?? Number.POSITIVE_INFINITY;
	return rows
		.filter((r) => r.scope === ALL_TIME_SCOPE && r.tier > 0)
		.sort((a, b) => b.tier - a.tier || share(a) - share(b))
		.slice(0, count);
}

/** The current season first, then archived seasons that have rows, newest first. */
export function seasonOptions(rows: ProgressRow[], now: Date = new Date()): { id: string; label: string }[] {
	const current = currentSeason(now);
	const scopes = new Set(rows.map((r) => r.scope));
	return [...SEASONS]
		.reverse()
		.filter((s) => s.id === current.id || (scopes.has(s.id) && new Date(s.start) < new Date(current.start)))
		.map(({ id, label }) => ({ id, label }));
}
```

Replace `src/hooks/useAchievements.ts` with:
```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { achievementPayloadSchema, type AchievementPayload } from "@/lib/validators/achievements";

async function fetchAchievements(puuid: string): Promise<AchievementPayload> {
	const res = await fetch(`/api/achievements?puuid=${puuid}`);
	if (!res.ok) throw new Error("Failed to fetch achievements");
	return achievementPayloadSchema.parse(await res.json());
}

async function detectAndSave(puuid: string): Promise<AchievementPayload> {
	const res = await fetch("/api/achievements", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ puuid }),
	});
	if (!res.ok) throw new Error("Failed to detect achievements");
	return achievementPayloadSchema.parse(await res.json());
}

export function useAchievements(puuid: string | undefined) {
	return useQuery<AchievementPayload>({
		queryKey: ["achievements", puuid],
		queryFn: () => fetchAchievements(puuid!),
		staleTime: 1000 * 60 * 5,
		enabled: !!puuid,
	});
}

export function useDetectAchievements() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ puuid }: { puuid: string }) => detectAndSave(puuid),
		onSuccess: (data, { puuid }) => {
			queryClient.setQueryData(["achievements", puuid], data);
		},
	});
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/lib/achievements/display.test.ts`
Expected: PASS (8 tests).

---

### Task 10: Icons and UI

**Files:**
- Create: 21 SVGs in `public/achi/` (see Step 1), `src/components/summoner/achievements/{tier-frame,progress-bar,progress-card,milestone-section,season-section,form-section}.tsx`
- Rename: `public/achi/pentakill.svg` → `public/achi/pentakiller.svg`
- Delete: `public/achi/diamond-plus.svg`, `public/achi/master-plus.svg`, `public/achi/challenger.svg`
- Modify: `src/components/summoner/achievements/achievements-tab.tsx`, `src/components/summoner/overview/achievement-preview.tsx`

**Interfaces:**
- Consumes: Tasks 1, 2, 7, 9; `Panel`, `PanelHeader` (`@/components/ui/panel`), `Chip` (`@/components/ui/chip`), `Tooltip*` (`@/components/ui/tooltip`), `useSummonerContext` (`@/components/summoner/shell/summoner-provider`), `earnedCount`, `ACHIEVEMENTS`.
- Produces: components
  - `TierFrame({ icon, tier, maxTier, children? })` — rounded square, border + tinted background in the tier color (`TIER_COLORS[tier-1]`, or `"#f1c40f"` for an earned binary, `LOCKED_COLOR` + grayscale when tier 0), icon `<img src="/achi/{icon}.svg" className="size-8">`.
  - `ProgressBar({ percent, color })`.
  - `ProgressCard({ def, row, rarity, scope })` — used by both milestone and season sections.
  - `MilestoneSection({ progress, rarity })`, `SeasonSection({ progress, rarity })`, `FormSection({ form })`.

- [ ] **Step 1: Create the icons**

Run this script from the repo root (write it to the session scratchpad, not the repo):
```python
import os

ICONS = {
    "veteran": ("#95a5a6", '<path d="M8 6h8v5a4 4 0 0 1-8 0z" fill="{c}" fill-opacity="0.25"/><path d="M10 15v2.5h4V15M8.5 18.5h7"/>'),
    "winner": ("#2ecc71", '<path d="M7 5.5h10v3.5a5 5 0 0 1-10 0z" fill="{c}" fill-opacity="0.25"/><path d="M7 7H5.5a2 2 0 0 0 2 3M17 7h1.5a2 2 0 0 1-2 3M12 14v3M9 18.5h6"/>'),
    "multikiller": ("#e67e22", '<path d="M6 8l3 3M9 8l-3 3M15 8l3 3M18 8l-3 3M6 14l3 3M9 14l-3 3M15 14l3 3M18 14l-3 3"/>'),
    "slayer": ("#c0392b", '<path d="M6 18L16 8M14 6h4v4" /><path d="M8 14l2 2M5 19l2-2" fill="{c}" fill-opacity="0.3"/>'),
    "wingman": ("#1abc9c", '<path d="M12 9c-2-3-6-3-7 0 2 0 4 1 5 3M12 9c2-3 6-3 7 0-2 0-4 1-5 3" fill="{c}" fill-opacity="0.2"/><circle cx="12" cy="14" r="2.2" fill="{c}" fill-opacity="0.3"/>'),
    "visionary": ("#3498db", '<path d="M12 5l1.5 3.5L17 9l-2.7 2.4.8 3.6L12 13.2 8.9 15l.8-3.6L7 9l3.5-.5z" fill="{c}" fill-opacity="0.25"/><path d="M12 17v2"/>'),
    "demolisher": ("#e74c3c", '<path d="M8 18V9l2-2h4l2 2v9z" fill="{c}" fill-opacity="0.2"/><path d="M8 11h8M10.5 18v-3h3v3M13 5l2 2"/>'),
    "epic-hunter": ("#8e44ad", '<path d="M6 15c0-4 3-8 6-9 3 1 6 5 6 9-2-1-4-1-6 1-2-2-4-2-6-1z" fill="{c}" fill-opacity="0.25"/><circle cx="10" cy="11" r="0.8" fill="{c}" stroke="none"/><circle cx="14" cy="11" r="0.8" fill="{c}" stroke="none"/>'),
    "champion-pool": ("#16a085", '<circle cx="8.5" cy="9" r="2.3" fill="{c}" fill-opacity="0.3"/><circle cx="15.5" cy="9" r="2.3" fill="{c}" fill-opacity="0.3"/><circle cx="8.5" cy="15.5" r="2.3" fill="{c}" fill-opacity="0.3"/><circle cx="15.5" cy="15.5" r="2.3" fill="{c}" fill-opacity="0.3"/>'),
    "one-champ-army": ("#e91e63", '<circle cx="12" cy="9" r="3" fill="{c}" fill-opacity="0.3"/><path d="M7 19c0-2.8 2.2-5 5-5s5 2.2 5 5"/><path d="M5 9h2M17 9h2M12 3.5V5"/>'),
    "mastery-collector": ("#9b59b6", '<path d="M12 5l5 3v5c0 3-2.2 5-5 6-2.8-1-5-3-5-6V8z" fill="{c}" fill-opacity="0.2"/><path d="M10 12l1.5 1.5L14.5 10"/>'),
    "devotion": ("#f39c12", '<path d="M12 18s-6-3.6-6-8a3.2 3.2 0 0 1 6-1.6A3.2 3.2 0 0 1 18 10c0 4.4-6 8-6 8z" fill="{c}" fill-opacity="0.25"/>'),
    "peak-rank": ("#5b8bf5", '<path d="M4.5 18l5-8 3 4 2-3 5 7z" fill="{c}" fill-opacity="0.25"/><path d="M14.5 11V5.5l3 1.2-3 1.2"/>'),
    "season-grinder": ("#95a5a6", '<rect x="6" y="7" width="12" height="11" rx="1.5" fill="{c}" fill-opacity="0.15"/><path d="M6 10.5h12M9 5.5v3M15 5.5v3M9 13.5h2M13 13.5h2M9 16h2"/>'),
    "season-winner": ("#2ecc71", '<rect x="6" y="7" width="12" height="11" rx="1.5" fill="{c}" fill-opacity="0.15"/><path d="M6 10.5h12M9 5.5v3M15 5.5v3M9.5 14.5l1.8 1.8 3.4-3.4"/>'),
    "iron-will": ("#7f8c8d", '<path d="M12 5l6 2.5v4.5c0 3.5-2.6 6-6 7-3.4-1-6-3.5-6-7V7.5z" fill="{c}" fill-opacity="0.25"/><path d="M9 12h6M12 9v6"/>'),
    "hot-streak": ("#e74c3c", '<path d="M12 4.5c1 2.5 4.5 4 4.5 8a4.5 4.5 0 0 1-9 0c0-2 1-3 2-4 0 1.5.8 2.5 1.8 2.8C11 9 11 7 12 4.5z" fill="{c}" fill-opacity="0.3"/>'),
    "main-character": ("#e91e63", '<circle cx="12" cy="9" r="3" fill="{c}" fill-opacity="0.3"/><path d="M7 19c0-2.8 2.2-5 5-5s5 2.2 5 5"/><path d="M12 3l.8 1.5 1.7.2-1.2 1.1.3 1.7L12 6.7l-1.6.8.3-1.7-1.2-1.1 1.7-.2z" fill="{c}" stroke="none"/>'),
    "promoted": ("#f1c40f", '<path d="M7 14l5-5 5 5M7 18l5-5 5 5" />'),
    "triple-threat": ("#3498db", '<circle cx="12" cy="8" r="2.4" fill="{c}" fill-opacity="0.3"/><circle cx="7.5" cy="15" r="2.4" fill="{c}" fill-opacity="0.3"/><circle cx="16.5" cy="15" r="2.4" fill="{c}" fill-opacity="0.3"/>'),
    "season-peak": ("#5b8bf5", '<path d="M4.5 18l5-8 3 4 2-3 5 7z" fill="{c}" fill-opacity="0.25"/><circle cx="17" cy="7" r="1.8" fill="{c}" fill-opacity="0.4"/>'),
}

TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10.5" fill="{c}" fill-opacity="0.1"/>
  {body}
</svg>
"""

for name, (color, body) in ICONS.items():
    with open(os.path.join("public", "achi", f"{name}.svg"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(TEMPLATE.format(c=color, body=body.format(c=color)))
print(len(ICONS), "icons written")
```
Then:
```bash
git mv public/achi/pentakill.svg public/achi/pentakiller.svg
git rm -q public/achi/diamond-plus.svg public/achi/master-plus.svg public/achi/challenger.svg
```
Expected: "21 icons written"; `ls public/achi | wc -l` shows 43 (26 − 4 + 21 = 43, counting `pentakiller.svg`).

Check icon coverage:
Run: `node -e "const fs=require('fs');const ids=[...fs.readFileSync('src/lib/achievements/milestones/definitions.ts','utf8').matchAll(/icon: \"([^\"]+)\"/g),...fs.readFileSync('src/lib/achievements/seasonal/definitions.ts','utf8').matchAll(/icon: \"([^\"]+)\"/g),...fs.readFileSync('src/lib/achievements/profile/definitions.ts','utf8').matchAll(/icon: \"([^\"]+)\"/g)].map(m=>m[1]);const missing=ids.filter(i=>!fs.existsSync('public/achi/'+i+'.svg'));console.log(missing.length?'missing '+missing:'all icons present')"`
Expected: `all icons present`.

- [ ] **Step 2: Shared pieces**

`src/components/summoner/achievements/tier-frame.tsx`:
```tsx
import { cn } from "@/lib/utils";
import { LOCKED_COLOR, TIER_COLORS } from "@/lib/achievements/tiers";

const EARNED_COLOR = "#f1c40f";

/** Tier color of a reached tier; binary achievements use one earned color. */
export function tierColor(tier: number, maxTier: number): string {
	if (tier === 0) return LOCKED_COLOR;
	return maxTier === 1 ? EARNED_COLOR : TIER_COLORS[tier - 1];
}

/** Achievement icon framed in its tier color; locked icons are grey. */
export function TierFrame({ icon, tier, maxTier }: { icon: string; tier: number; maxTier: number }) {
	const color = tierColor(tier, maxTier);
	return (
		<div className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg border-2", tier === 0 && "grayscale opacity-60")} style={{ borderColor: color, backgroundColor: `${color}1a` }}>
			<img src={`/achi/${icon}.svg`} alt="" width={32} height={32} className="size-8" />
		</div>
	);
}
```

`src/components/summoner/achievements/progress-bar.tsx`:
```tsx
/** Thin progress bar in a given color. */
export function ProgressBar({ percent, color }: { percent: number; color: string }) {
	return (
		<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
			<div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
		</div>
	);
}
```

- [ ] **Step 3: Progress card**

`src/components/summoner/achievements/progress-card.tsx`:
```tsx
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { progressView, rarityText } from "@/lib/achievements/display";
import { TIER_NAMES } from "@/lib/achievements/tiers";
import { type ProgressDef } from "@/lib/achievements/progress/types";
import { type ProgressRow, type Rarity } from "@/lib/validators/achievements";
import { ProgressBar } from "./progress-bar";
import { TierFrame, tierColor } from "./tier-frame";

/** One milestone or seasonal achievement: tier frame, progress to the next tier, rarity and reached dates. */
export function ProgressCard({ def, row, rarity, scope }: { def: ProgressDef; row: ProgressRow | undefined; rarity: Rarity | null; scope: string }) {
	const view = progressView(def, row);
	const maxTier = def.thresholds.length;
	const color = tierColor(view.tier, maxTier);
	const rarityLabel = rarityText(rarity, def.id, scope, view.tier);
	const reached = row?.reachedAt ?? [];

	const card = (
		<div className="flex items-start gap-3 rounded-md border p-3">
			<TierFrame icon={def.icon} tier={view.tier} maxTier={maxTier} />
			<div className="min-w-0 flex-1 space-y-1.5">
				<div className="flex items-baseline justify-between gap-2">
					<p className="truncate text-sm font-semibold text-foreground">{def.name}</p>
					<span className="shrink-0 text-xs font-semibold" style={{ color }}>
						{view.tierName ?? "Locked"}
					</span>
				</div>
				<p className="text-xs text-muted-foreground">{def.description}</p>
				<ProgressBar percent={view.percent} color={color} />
				<div className="flex justify-between gap-2 text-2xs text-muted-foreground">
					<span>{view.next ? `${view.current} / ${view.next}` : view.current}</span>
					{rarityLabel && <span>{rarityLabel}</span>}
				</div>
			</div>
		</div>
	);

	if (reached.length === 0) return card;
	return (
		<Tooltip>
			<TooltipTrigger asChild>{card}</TooltipTrigger>
			<TooltipContent>
				{reached.map((date, i) => (
					<p key={date + i}>
						{maxTier === 1 ? "Earned" : TIER_NAMES[i]}: {new Date(date).toLocaleDateString()}
					</p>
				))}
			</TooltipContent>
		</Tooltip>
	);
}
```

- [ ] **Step 4: Sections**

`src/components/summoner/achievements/milestone-section.tsx`:
```tsx
import { Panel, PanelHeader } from "@/components/ui/panel";
import { MILESTONES } from "@/lib/achievements/milestones/definitions";
import { ALL_TIME_SCOPE } from "@/lib/achievements/progress/types";
import { type ProgressRow, type Rarity } from "@/lib/validators/achievements";
import { ProgressCard } from "./progress-card";

/** All-time milestones with tiers, progress and rarity. */
export function MilestoneSection({ progress, rarity }: { progress: ProgressRow[]; rarity: Rarity | null }) {
	const rows = new Map(progress.filter((p) => p.scope === ALL_TIME_SCOPE).map((p) => [p.achievementId, p]));
	const reached = MILESTONES.filter((m) => (rows.get(m.id)?.tier ?? 0) > 0).length;
	return (
		<Panel>
			<PanelHeader title="Milestones" actions={<span className="text-xs text-muted-foreground">{reached} of {MILESTONES.length} unlocked</span>} />
			<div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
				{MILESTONES.map((def) => (
					<ProgressCard key={def.id} def={def} row={rows.get(def.id)} rarity={rarity} scope={ALL_TIME_SCOPE} />
				))}
			</div>
		</Panel>
	);
}
```

`src/components/summoner/achievements/season-section.tsx`:
```tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { seasonOptions } from "@/lib/achievements/display";
import { SEASONAL } from "@/lib/achievements/seasonal/definitions";
import { type ProgressRow, type Rarity } from "@/lib/validators/achievements";
import { ProgressCard } from "./progress-card";

/** Seasonal achievements of the selected season; closed seasons show what was earned then. */
export function SeasonSection({ progress, rarity }: { progress: ProgressRow[]; rarity: Rarity | null }) {
	const options = seasonOptions(progress);
	const [seasonId, setSeasonId] = useState(options[0].id);
	const rows = new Map(progress.filter((p) => p.scope === seasonId).map((p) => [p.achievementId, p]));
	const closed = seasonId !== options[0].id;
	const defs = closed ? SEASONAL.filter((d) => rows.has(d.id)) : SEASONAL;

	return (
		<Panel>
			<PanelHeader
				title="Season"
				actions={
					options.length > 1 ? (
						<div className="flex gap-1.5">
							{options.map((o) => (
								<button
									key={o.id}
									type="button"
									onClick={() => setSeasonId(o.id)}
									className={cn("h-7 rounded-md border px-2.5 text-xs font-medium transition-colors", o.id === seasonId ? "border-primary/50 bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground")}
								>
									{o.label}
								</button>
							))}
						</div>
					) : (
						<span className="text-xs text-muted-foreground">{options[0].label}</span>
					)
				}
			/>
			<div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
				{defs.map((def) => (
					<ProgressCard key={def.id} def={def} row={rows.get(def.id)} rarity={closed ? null : rarity} scope={seasonId} />
				))}
			</div>
		</Panel>
	);
}
```

`src/components/summoner/achievements/form-section.tsx`:
```tsx
import { cn } from "@/lib/utils";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { earnedCount } from "@/lib/achievements/profile/count";
import { ACHIEVEMENTS } from "@/lib/achievements/profile/definitions";
import { type AchievementPayload } from "@/lib/validators/achievements";

/** Rolling Current form achievements from the last ranked games; these come and go. */
export function FormSection({ form }: { form: AchievementPayload["form"] }) {
	const earned = new Map(form.map((a) => [a.achievementId, a.earnedAt]));
	return (
		<Panel>
			<PanelHeader title="Current form" actions={<span className="text-xs text-muted-foreground">{earnedCount(form, ACHIEVEMENTS)} of {ACHIEVEMENTS.length} active</span>} />
			<div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
				{ACHIEVEMENTS.map((a) => {
					const earnedAt = earned.get(a.id);
					return (
						<div key={a.id} className={cn("flex items-start gap-3 rounded-md border p-3", !earnedAt && "opacity-50 grayscale")}>
							<img src={`/achi/${a.icon}.svg`} alt="" width={32} height={32} className="size-8 shrink-0" />
							<div className="min-w-0">
								<p className="text-sm font-semibold" style={{ color: earnedAt ? a.color : undefined }}>
									{a.name}
								</p>
								<p className="text-xs text-muted-foreground">{a.description}</p>
							</div>
						</div>
					);
				})}
			</div>
		</Panel>
	);
}
```

- [ ] **Step 5: Tab and preview**

Replace `src/components/summoner/achievements/achievements-tab.tsx` with:
```tsx
"use client";

import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAchievements } from "@/hooks/useAchievements";
import { FormSection } from "./form-section";
import { MilestoneSection } from "./milestone-section";
import { SeasonSection } from "./season-section";

/** Milestones, the season's achievements and the Current form, from one payload. */
export function AchievementsTab() {
	const { puuid } = useSummonerContext();
	const { data } = useAchievements(puuid);
	const progress = data?.progress ?? [];
	const rarity = data?.rarity ?? null;

	return (
		<TooltipProvider delayDuration={200}>
			<div className="space-y-4">
				<MilestoneSection progress={progress} rarity={rarity} />
				<SeasonSection progress={progress} rarity={rarity} />
				<FormSection form={data?.form ?? []} />
			</div>
		</TooltipProvider>
	);
}
```

In `src/components/summoner/overview/achievement-preview.tsx`:
- import `topMilestones`, `getMilestone`, `TIER_NAMES` and `tierColor` (from `@/components/summoner/achievements/tier-frame`);
- compute:
```tsx
	const top = topMilestones(saved?.progress ?? [], saved?.rarity ?? null);
	const earnedIds = new Set(saved?.form.map((a) => a.achievementId) ?? []);
	const earned = ACHIEVEMENTS.filter((a) => earnedIds.has(a.id));
	const formShown = earned.slice(0, Math.max(0, PREVIEW_COUNT - top.length));
	const hidden = earned.length - formShown.length;
	if (top.length === 0 && earned.length === 0) return null;
```
- set `const PREVIEW_COUNT = 6;` (three milestones plus up to three form chips);
- render the milestone chips first, each:
```tsx
				{top.map((row) => {
					const def = getMilestone(row.achievementId);
					if (!def) return null;
					return (
						<Tooltip key={row.achievementId}>
							<TooltipTrigger asChild>
								<Chip color={tierColor(row.tier, 4)} className="h-6 px-2 text-xs">
									{def.name} · {TIER_NAMES[row.tier - 1]}
								</Chip>
							</TooltipTrigger>
							<TooltipContent>
								<p>{def.description}</p>
							</TooltipContent>
						</Tooltip>
					);
				})}
```
- then the existing form chips mapped over `formShown` instead of `earned.slice(0, PREVIEW_COUNT)`;
- the link text becomes `{hidden > 0 ? \`+${hidden} more\` : "See all"} &rarr;`.

- [ ] **Step 6: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: typecheck exit 0; lint shows only the 4 known `any` errors in `src/app/api/matches/**`; all tests PASS.

Browser: the new table does not exist until the user applies the migration — the POST will 500 and GET will throw on `achievementProgress`. Do not browser-verify the tab; report that it needs `pnpm prisma migrate deploy` first. If the user has already applied it, open `http://localhost:3000/summoner/Skaikru-HEAVN/achievements` once and check the three sections render, cards show progress, and the Overview shows tier chips.

---

### Task 11: Changelog, review and commit

**Files:**
- Create: `src/components/changelog/changes/2026-10-11/metadata.ts`
- Modify: `src/components/changelog/registry.ts`

- [ ] **Step 1: Changelog entry**

`src/components/changelog/changes/2026-10-11/metadata.ts`:
```ts
import { type ChangelogEntry } from "../../changelog-type";

const changelog: ChangelogEntry = {
	slug: "2026-10-11",
	title: "Milestones and Seasons",
	date: "2026-10-11",
	summary: "Achievements now come in three layers: permanent milestones with Bronze to Platinum tiers, a list for each ranked season, and the Current form from your latest games.",
	changes: [
		{
			category: "feature",
			title: "Milestones",
			description: "Fourteen all-time milestones such as Veteran, Pentakiller, Champion Pool and Peak Rank, each with four tiers, a progress bar, the date you reached each tier and how rare it is among tracked players.",
		},
		{
			category: "feature",
			title: "Season achievements",
			description: "Eight achievements per ranked season, from Season Grinder to Hot Streak and Season Peak. Earned ones stay for the season, and past seasons are kept.",
		},
		{
			category: "improvement",
			title: "Profile highlights",
			description: "The profile overview shows your three best milestones next to your current form.",
		},
	],
};

export default changelog;
```

In `src/components/changelog/registry.ts` add `import changelog_2026_10_11 from "./changes/2026-10-11/metadata";` above the 2026-10-10 import and put `changelog_2026_10_11,` first in `changelogs`.

Run: `pnpm vitest run src/lib/changelog && pnpm typecheck`
Expected: PASS; exit 0.

- [ ] **Step 2: Full verification**

Run: `pnpm typecheck && pnpm test && pnpm lint`
Expected: typecheck 0; all tests pass; lint only the 4 known `any` errors.

- [ ] **Step 3: Pre-commit review**

Dispatch a reviewer on the most capable model with `git diff main...HEAD` plus the untracked files, the spec, this plan and its Review Focus. Fix Critical/Important findings with a failing test first; list minors in the final report.

- [ ] **Step 4: Commit**

```bash
git add -A prisma src public docs/superpowers/plans/2026-10-11-achievement-milestones.md
git commit -m "feat: achievement milestones and seasons

Permanent Bronze-to-Platinum milestones and per-season achievements
next to the rolling Current form, stored in AchievementProgress with
max-merge, reached dates and cron-computed rarity. The Achievements
tab shows all three layers and the Overview highlights the top three
milestones. Pentakill and the rank achievements move to milestones.

Migration to apply: prisma/migrations/20261011120000_add_achievement_progress

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Expected: one commit on `feat/achievement-milestones`; not pushed.
