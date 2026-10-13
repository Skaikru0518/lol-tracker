# Performance Score (phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Score every ranked game 0–100 per player against role baselines and the lane opponent, and show it on the match row and in a new Performance tab on the match detail page.

**Architecture:** A daily cron computes per-role quantiles of 19 metrics from stored ranked games with one SQL query and stores them as JSON in a new `PerformanceBaseline` table. The client fetches the newest baseline once (1 h cache) and runs pure scoring functions from `src/lib/performance/` on match data it already has. Scores are never stored.

**Tech Stack:** Next.js 16 App Router, Prisma 7 (pg adapter, raw SQL with `percentile_cont`), Zod 4, TanStack Query 5, Tailwind 4, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-13-performance-score-design.md`

## Global Constraints

- pnpm only. Never apply migrations; write `prisma/migrations/20261013120000_add_performance_baseline/migration.sql` and run `pnpm prisma generate`.
- Eligible games: `isAchievementEligible(queueId, gameDuration)` from `src/lib/achievements/eligibility.ts` (420/440/710, ≥ 300 s).
- Roles: `TOP`, `JUNGLE`, `MIDDLE`, `BOTTOM`, `UTILITY` (Riot `teamPosition`).
- Grades: S+ ≥ 90, S ≥ 80, A ≥ 70, B ≥ 55, C ≥ 40, D < 40.
- Baseline window 60 days, keep newest 30 rows, 21 quantiles (0 to 1 in 0.05 steps).
- Logic lives in `src/lib/performance/`.
- **Comments: almost none.** No JSDoc on constants, obvious functions, components or route handlers. Only a single-line `//` where the code cannot say *why*.
- Zod schema plus exported type for every API response; no `any`.
- One small component per file; rem-based Tailwind sizes; no keyboard-navigation work.
- The dev Riot key is shared with prod. Do at most one browser check, and stop the dev server afterwards.
- One commit at the end (Task 8).

## Review Focus

- A role baseline with too few games (fewer than 30): the game is not scored (null), never a crash. Pinned in Task 4.
- Older stored matches without `champExperience`, `damageDealtToObjectives` or `objectivesStolen`: the score is computed from the remaining metrics. Pinned in Tasks 3 and 4.
- No unique lane opponent (empty `teamPosition`, or two players in the same role on one team): no Laning category, weights renormalised, `opponent: null`. Pinned in Tasks 3 and 4.
- Remakes and non-ranked queues: `scorePerformance` returns null. Pinned in Task 4.
- No baseline row yet: the API returns `null`, and the row and tab hide the score. Pinned in Task 5 (schema) and Task 7 (UI).

---

## File Structure

- Create `src/lib/performance/roles.ts`: `ROLES`, `Role`, `ROLE_LABELS`, `asRole`.
- Create `src/lib/performance/grades.ts`: `GRADES`, `Grade`, `gradeFor`, `GRADE_COLORS`.
- Create `src/lib/performance/weights.ts`: categories, metric ids, membership, labels, role weights.
- Create `src/lib/performance/percentile.ts`: `QUANTILE_STEPS`, `percentileOf`.
- Create `src/lib/performance/metrics.ts`: `laneOpponent`, `playerMetrics`.
- Create `src/lib/performance/score.ts`: `scorePerformance` and the result types.
- Create `src/lib/performance/format.ts`: `formatMetric`.
- Create `src/lib/performance/baselines-query.ts`: the quantile SQL (server).
- Create `src/lib/performance/baselines.ts`: `computeAndSaveBaselines`, `latestBaselines` (server).
- Create `src/lib/validators/performance.ts`: `baselinesSchema`, `Baselines`.
- Create `src/app/api/performance/baselines/route.ts` and `src/app/api/cron/performance-baselines/route.ts`.
- Create `src/hooks/usePerformanceBaselines.ts`.
- Create `src/components/match/performance/{score-circle,category-card,metric-table,opponent-diff}.tsx` and `src/components/match/player-tabs/performance-tab.tsx`.
- Modify `src/lib/validators/match.ts`, `prisma/schema.prisma`, `src/components/match/player-tabs/player-tabs.tsx`, `src/components/summoner/matches/match-row.tsx`, `src/components/changelog/registry.ts`.
- Create `prisma/migrations/20261013120000_add_performance_baseline/migration.sql` and `src/components/changelog/changes/2026-10-13/metadata.ts`.

---

### Task 1: Roles, grades and weights

**Files:**
- Create: `src/lib/performance/roles.ts`, `src/lib/performance/grades.ts`, `src/lib/performance/weights.ts`
- Test: `src/lib/performance/grades.test.ts`, `src/lib/performance/weights.test.ts`

**Interfaces:**
- Produces:
  - `ROLES`, `type Role`, `ROLE_LABELS: Record<Role, string>`, `asRole(position: string): Role | null`
  - `GRADES`, `type Grade`, `gradeFor(score: number): Grade`, `GRADE_COLORS: Record<Grade, string>`
  - `CATEGORIES`, `type CategoryId`, `CATEGORY_LABELS`, `METRIC_IDS`, `type MetricId`, `CATEGORY_METRICS: Record<CategoryId, MetricId[]>`, `LOWER_IS_BETTER: ReadonlySet<MetricId>`, `METRIC_LABELS: Record<MetricId, string>`, `ROLE_WEIGHTS: Record<Role, Record<CategoryId, number>>`

- [ ] **Step 1: Write the failing tests**

`src/lib/performance/grades.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { gradeFor } from "./grades";

describe("gradeFor", () => {
	it("maps score boundaries to grades", () => {
		expect([100, 90, 89, 80, 79, 70, 69, 55, 54, 40, 39, 0].map(gradeFor)).toEqual(["S+", "S+", "S", "S", "A", "A", "B", "B", "C", "C", "D", "D"]);
	});
});
```

`src/lib/performance/weights.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { asRole, ROLES } from "./roles";
import { CATEGORIES, CATEGORY_METRICS, METRIC_IDS, ROLE_WEIGHTS } from "./weights";

describe("weights", () => {
	it("sums every role's category weights to 100", () => {
		for (const role of ROLES) expect(CATEGORIES.reduce((s, c) => s + ROLE_WEIGHTS[role][c], 0)).toBe(100);
	});

	it("puts every metric in at least one category", () => {
		const used = new Set(Object.values(CATEGORY_METRICS).flat());
		expect(METRIC_IDS.filter((m) => !used.has(m))).toEqual([]);
	});
});

describe("asRole", () => {
	it("accepts Riot positions only", () => {
		expect(asRole("UTILITY")).toBe("UTILITY");
		expect(asRole("")).toBeNull();
		expect(asRole("Invalid")).toBeNull();
	});
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run src/lib/performance`
Expected: FAIL, "Cannot find module './grades'" / "./roles".

- [ ] **Step 3: Implement**

`src/lib/performance/roles.ts`:
```ts
export const ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = { TOP: "Top", JUNGLE: "Jungle", MIDDLE: "Mid", BOTTOM: "Bot", UTILITY: "Support" };

export function asRole(position: string): Role | null {
	return (ROLES as readonly string[]).includes(position) ? (position as Role) : null;
}
```

`src/lib/performance/grades.ts`:
```ts
export const GRADES = ["S+", "S", "A", "B", "C", "D"] as const;
export type Grade = (typeof GRADES)[number];

const MIN_SCORE: [Grade, number][] = [["S+", 90], ["S", 80], ["A", 70], ["B", 55], ["C", 40], ["D", 0]];

export function gradeFor(score: number): Grade {
	return MIN_SCORE.find(([, min]) => score >= min)?.[0] ?? "D";
}

export const GRADE_COLORS: Record<Grade, string> = {
	"S+": "#f5c542",
	S: "#a78bfa",
	A: "#34c38f",
	B: "#5b8bf5",
	C: "#f39c12",
	D: "#ef5350",
};
```

`src/lib/performance/weights.ts`:
```ts
import { type Role } from "./roles";

export const CATEGORIES = ["laning", "farming", "combat", "teamfight", "objectives", "vision"] as const;
export type CategoryId = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<CategoryId, string> = {
	laning: "Laning",
	farming: "Farming",
	combat: "Combat",
	teamfight: "Teamfight",
	objectives: "Objectives",
	vision: "Vision",
};

export const METRIC_IDS = [
	"goldDiffPerMin",
	"xpDiffPerMin",
	"csDiffPerMin",
	"damageDiffPerMin",
	"csPerMin",
	"goldPerMin",
	"kda",
	"deathsPerMin",
	"killParticipation",
	"damageShare",
	"damageTakenShare",
	"objectiveDamagePerMin",
	"epicKills",
	"structureKills",
	"steals",
	"visionPerMin",
	"wardsPlacedPerMin",
	"wardsKilledPerMin",
	"controlWards",
] as const;
export type MetricId = (typeof METRIC_IDS)[number];

export const CATEGORY_METRICS: Record<CategoryId, MetricId[]> = {
	laning: ["goldDiffPerMin", "xpDiffPerMin", "csDiffPerMin", "damageDiffPerMin"],
	farming: ["csPerMin", "goldPerMin"],
	combat: ["kda", "deathsPerMin", "killParticipation"],
	teamfight: ["damageShare", "damageTakenShare", "killParticipation"],
	objectives: ["objectiveDamagePerMin", "epicKills", "structureKills", "steals"],
	vision: ["visionPerMin", "wardsPlacedPerMin", "wardsKilledPerMin", "controlWards"],
};

export const LOWER_IS_BETTER: ReadonlySet<MetricId> = new Set(["deathsPerMin"]);

export const METRIC_LABELS: Record<MetricId, string> = {
	goldDiffPerMin: "Gold diff / min",
	xpDiffPerMin: "XP diff / min",
	csDiffPerMin: "CS diff / min",
	damageDiffPerMin: "Damage diff / min",
	csPerMin: "CS / min",
	goldPerMin: "Gold / min",
	kda: "KDA",
	deathsPerMin: "Deaths / min",
	killParticipation: "Kill participation",
	damageShare: "Team damage share",
	damageTakenShare: "Damage taken share",
	objectiveDamagePerMin: "Objective damage / min",
	epicKills: "Dragons and barons",
	structureKills: "Turrets and inhibitors",
	steals: "Objective steals",
	visionPerMin: "Vision score / min",
	wardsPlacedPerMin: "Wards placed / min",
	wardsKilledPerMin: "Wards killed / min",
	controlWards: "Control wards",
};

export const ROLE_WEIGHTS: Record<Role, Record<CategoryId, number>> = {
	TOP: { laning: 25, farming: 15, combat: 20, teamfight: 20, objectives: 15, vision: 5 },
	JUNGLE: { laning: 10, farming: 15, combat: 20, teamfight: 20, objectives: 25, vision: 10 },
	MIDDLE: { laning: 25, farming: 15, combat: 25, teamfight: 20, objectives: 10, vision: 5 },
	BOTTOM: { laning: 20, farming: 25, combat: 20, teamfight: 20, objectives: 10, vision: 5 },
	UTILITY: { laning: 15, farming: 5, combat: 15, teamfight: 30, objectives: 10, vision: 25 },
};
```

- [ ] **Step 4: Run to verify they pass**

Run: `pnpm vitest run src/lib/performance`
Expected: PASS (4 tests).

---

### Task 2: Percentile

**Files:**
- Create: `src/lib/performance/percentile.ts`
- Test: `src/lib/performance/percentile.test.ts`

**Interfaces:**
- Produces: `QUANTILE_STEPS: number[]` (21 values, 0 to 1 in 0.05 steps) and `percentileOf(value: number, quantiles: number[]): number` (0–100).

- [ ] **Step 1: Write the failing test**

`src/lib/performance/percentile.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { percentileOf, QUANTILE_STEPS } from "./percentile";

const linear = Array.from({ length: 21 }, (_, i) => i);

describe("QUANTILE_STEPS", () => {
	it("runs from 0 to 1 in 5% steps", () => {
		expect(QUANTILE_STEPS).toHaveLength(21);
		expect(QUANTILE_STEPS[0]).toBe(0);
		expect(QUANTILE_STEPS[20]).toBe(1);
		expect(QUANTILE_STEPS[10]).toBeCloseTo(0.5);
	});
});

describe("percentileOf", () => {
	it("interpolates between quantiles", () => {
		expect(percentileOf(10, linear)).toBe(50);
		expect(percentileOf(2.5, linear)).toBe(12.5);
	});

	it("clamps outside the distribution", () => {
		expect(percentileOf(-1, linear)).toBe(0);
		expect(percentileOf(99, linear)).toBe(100);
	});

	it("puts a value inside a flat run at the run's middle", () => {
		const zeroHeavy = [...Array(10).fill(0), ...Array.from({ length: 11 }, (_, i) => i + 1)];
		expect(percentileOf(0, zeroHeavy)).toBe(22.5);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/lib/performance/percentile.test.ts`
Expected: FAIL, "Cannot find module './percentile'".

- [ ] **Step 3: Implement**

`src/lib/performance/percentile.ts`:
```ts
export const QUANTILE_STEPS = Array.from({ length: 21 }, (_, i) => i / 20);

export function percentileOf(value: number, quantiles: number[]): number {
	const last = quantiles.length - 1;
	const step = 100 / last;
	if (value < quantiles[0]) return 0;
	if (value > quantiles[last]) return 100;

	const first = quantiles.indexOf(value);
	if (first !== -1) {
		const lastEqual = quantiles.lastIndexOf(value);
		return ((first + lastEqual) / 2) * step;
	}

	const i = quantiles.findIndex((q, idx) => idx < last && q < value && value < quantiles[idx + 1]);
	return (i + (value - quantiles[i]) / (quantiles[i + 1] - quantiles[i])) * step;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/lib/performance/percentile.test.ts`
Expected: PASS (4 tests).

---

### Task 3: Metric extraction

**Files:**
- Modify: `src/lib/validators/match.ts` (three optional participant fields)
- Create: `src/lib/performance/metrics.ts`
- Test: `src/lib/performance/metrics.test.ts`

**Interfaces:**
- Consumes: `MetricId` (Task 1), `Participant` from `@/lib/validators/match`.
- Produces:
  - `type MetricValues = Partial<Record<MetricId, number>>`
  - `laneOpponent(player: Participant, participants: Participant[]): Participant | null`
  - `playerMetrics(player: Participant, participants: Participant[], gameDuration: number): { values: MetricValues; opponent: Participant | null }`

- [ ] **Step 1: Add the optional fields**

In `src/lib/validators/match.ts`, inside `participantSchema`, after `baronKills: z.number(),` add:
```ts
	champExperience: z.number().optional(),
	damageDealtToObjectives: z.number().optional(),
	objectivesStolen: z.number().optional(),
```

- [ ] **Step 2: Write the failing test**

`src/lib/performance/metrics.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { type Participant } from "@/lib/validators/match";
import { laneOpponent, playerMetrics } from "./metrics";

function p(overrides: Partial<Participant>): Participant {
	return {
		puuid: "x",
		teamId: 100,
		teamPosition: "MIDDLE",
		championName: "Ahri",
		kills: 0,
		deaths: 0,
		assists: 0,
		totalMinionsKilled: 0,
		neutralMinionsKilled: 0,
		goldEarned: 0,
		totalDamageDealtToChampions: 0,
		totalDamageTaken: 0,
		visionScore: 0,
		wardsPlaced: 0,
		wardsKilled: 0,
		visionWardsBoughtInGame: 0,
		turretKills: 0,
		inhibitorKills: 0,
		dragonKills: 0,
		baronKills: 0,
		...overrides,
	} as Participant;
}

const me = p({ puuid: "me", kills: 5, deaths: 2, assists: 7, totalMinionsKilled: 200, neutralMinionsKilled: 10, goldEarned: 12000, totalDamageDealtToChampions: 20000, totalDamageTaken: 15000, visionScore: 30, wardsPlaced: 10, wardsKilled: 4, visionWardsBoughtInGame: 3, turretKills: 2, dragonKills: 1, champExperience: 15000, damageDealtToObjectives: 9000, objectivesStolen: 1 });
const ally = p({ puuid: "ally", teamPosition: "TOP", kills: 3, totalDamageDealtToChampions: 20000, totalDamageTaken: 15000 });
const opp = p({ puuid: "opp", teamId: 200, championName: "Syndra", totalMinionsKilled: 170, goldEarned: 10500, totalDamageDealtToChampions: 17000, champExperience: 13500 });

describe("laneOpponent", () => {
	it("finds the enemy with the same position", () => {
		expect(laneOpponent(me, [me, ally, opp])?.puuid).toBe("opp");
	});

	it("is null without a unique opponent or position", () => {
		expect(laneOpponent(p({ teamPosition: "" }), [me, opp])).toBeNull();
		expect(laneOpponent(me, [me, opp, p({ puuid: "opp2", teamId: 200 })])).toBeNull();
		expect(laneOpponent(me, [me, opp, p({ puuid: "mate", teamId: 100 })])).toBeNull();
	});
});

describe("playerMetrics", () => {
	it("computes per-minute, share and diff metrics", () => {
		const { values, opponent } = playerMetrics(me, [me, ally, opp], 1800);
		expect(opponent?.puuid).toBe("opp");
		expect(values.csPerMin).toBeCloseTo(7);
		expect(values.goldPerMin).toBeCloseTo(400);
		expect(values.goldDiffPerMin).toBeCloseTo(50);
		expect(values.xpDiffPerMin).toBeCloseTo(50);
		expect(values.csDiffPerMin).toBeCloseTo(4/3);
		expect(values.kda).toBe(6);
		expect(values.killParticipation).toBeCloseTo(12 / 8);
		expect(values.damageShare).toBeCloseTo(0.5);
		expect(values.damageTakenShare).toBeCloseTo(0.5);
		expect(values.epicKills).toBe(1);
		expect(values.structureKills).toBe(2);
		expect(values.steals).toBe(1);
		expect(values.controlWards).toBe(3);
	});

	it("leaves out laning metrics without an opponent and optional fields when missing", () => {
		const old = p({ puuid: "old", kills: 1 });
		const { values, opponent } = playerMetrics(old, [old], 1200);
		expect(opponent).toBeNull();
		expect(values.goldDiffPerMin).toBeUndefined();
		expect(values.objectiveDamagePerMin).toBeUndefined();
		expect(values.steals).toBeUndefined();
		expect(values.csPerMin).toBe(0);
	});

	it("gives zero kill participation when the team has no kills", () => {
		const solo = p({ puuid: "solo" });
		expect(playerMetrics(solo, [solo], 1200).values.killParticipation).toBe(0);
	});
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm vitest run src/lib/performance/metrics.test.ts`
Expected: FAIL, "Cannot find module './metrics'".

- [ ] **Step 4: Implement**

`src/lib/performance/metrics.ts`:
```ts
import { type Participant } from "@/lib/validators/match";
import { type MetricId } from "./weights";

export type MetricValues = Partial<Record<MetricId, number>>;

const cs = (p: Participant) => p.totalMinionsKilled + p.neutralMinionsKilled;

export function laneOpponent(player: Participant, participants: Participant[]): Participant | null {
	if (!player.teamPosition) return null;
	const samePosition = participants.filter((p) => p.teamPosition === player.teamPosition);
	const enemies = samePosition.filter((p) => p.teamId !== player.teamId);
	const mates = samePosition.filter((p) => p.teamId === player.teamId);
	return enemies.length === 1 && mates.length === 1 ? enemies[0] : null;
}

export function playerMetrics(player: Participant, participants: Participant[], gameDuration: number): { values: MetricValues; opponent: Participant | null } {
	const minutes = gameDuration / 60;
	const team = participants.filter((p) => p.teamId === player.teamId);
	const teamKills = team.reduce((s, p) => s + p.kills, 0);
	const teamDamage = team.reduce((s, p) => s + p.totalDamageDealtToChampions, 0);
	const teamTaken = team.reduce((s, p) => s + p.totalDamageTaken, 0);
	const opponent = laneOpponent(player, participants);

	const values: MetricValues = {
		csPerMin: cs(player) / minutes,
		goldPerMin: player.goldEarned / minutes,
		kda: (player.kills + player.assists) / Math.max(player.deaths, 1),
		deathsPerMin: player.deaths / minutes,
		killParticipation: teamKills > 0 ? (player.kills + player.assists) / teamKills : 0,
		damageShare: teamDamage > 0 ? player.totalDamageDealtToChampions / teamDamage : 0,
		damageTakenShare: teamTaken > 0 ? player.totalDamageTaken / teamTaken : 0,
		epicKills: player.dragonKills + player.baronKills,
		structureKills: player.turretKills + player.inhibitorKills,
		visionPerMin: player.visionScore / minutes,
		wardsPlacedPerMin: player.wardsPlaced / minutes,
		wardsKilledPerMin: player.wardsKilled / minutes,
		controlWards: player.visionWardsBoughtInGame,
	};
	if (player.damageDealtToObjectives !== undefined) values.objectiveDamagePerMin = player.damageDealtToObjectives / minutes;
	if (player.objectivesStolen !== undefined) values.steals = player.objectivesStolen;

	if (opponent) {
		values.goldDiffPerMin = (player.goldEarned - opponent.goldEarned) / minutes;
		values.csDiffPerMin = (cs(player) - cs(opponent)) / minutes;
		values.damageDiffPerMin = (player.totalDamageDealtToChampions - opponent.totalDamageDealtToChampions) / minutes;
		if (player.champExperience !== undefined && opponent.champExperience !== undefined) {
			values.xpDiffPerMin = (player.champExperience - opponent.champExperience) / minutes;
		}
	}
	return { values, opponent };
}
```

Note: in the test, `killParticipation` is (5+7)/(5+3) = 1.5 because the fixture's assists exceed the team's kills. That is fine for a pure-function check.

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm vitest run src/lib/performance/metrics.test.ts && pnpm typecheck`
Expected: PASS (5 tests); typecheck exit 0.

---

### Task 4: Scoring

**Files:**
- Create: `src/lib/validators/performance.ts`, `src/lib/performance/score.ts`
- Test: `src/lib/performance/score.test.ts`, `src/lib/validators/performance.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3; `isAchievementEligible` from `@/lib/achievements/eligibility`; `Match` from `@/lib/validators/match`.
- Produces:
  - `baselinesSchema`, `type Baselines = { computedAt: string; sampleSize: number; roles: Partial<Record<Role, { games: number; metrics: Partial<Record<MetricId, number[]>> }>> }`
  - `MIN_BASELINE_GAMES = 30`
  - `interface PerformanceScore { role: Role; score: number; grade: Grade; categories: CategoryScore[]; opponent: OpponentDiff | null }`
  - `interface CategoryScore { id: CategoryId; score: number; grade: Grade; metrics: { id: MetricId; value: number; percentile: number }[] }`
  - `interface OpponentDiff { championName: string; goldDiff: number; xpDiff: number | null; csDiff: number; damageDiff: number }`
  - `scorePerformance(match: Match, puuid: string, baselines: Baselines | null): PerformanceScore | null`

- [ ] **Step 1: Write the failing tests**

`src/lib/validators/performance.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { baselinesSchema } from "./performance";

describe("baselinesSchema", () => {
	it("accepts a baseline payload with some roles", () => {
		const payload = { computedAt: "2026-10-13T03:00:00.000Z", sampleSize: 900, roles: { MIDDLE: { games: 180, metrics: { csPerMin: Array(21).fill(6) } } } };
		expect(baselinesSchema.parse(payload)).toEqual(payload);
	});

	it("allows null when no baseline exists yet", () => {
		expect(baselinesSchema.nullable().parse(null)).toBeNull();
	});
});
```

`src/lib/performance/score.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { type Match, type Participant } from "@/lib/validators/match";
import { type Baselines } from "@/lib/validators/performance";
import { METRIC_IDS } from "./weights";
import { scorePerformance } from "./score";

function p(overrides: Partial<Participant>): Participant {
	return {
		puuid: "x",
		teamId: 100,
		teamPosition: "MIDDLE",
		championName: "Ahri",
		kills: 2,
		deaths: 2,
		assists: 2,
		totalMinionsKilled: 180,
		neutralMinionsKilled: 0,
		goldEarned: 10000,
		totalDamageDealtToChampions: 15000,
		totalDamageTaken: 12000,
		visionScore: 20,
		wardsPlaced: 8,
		wardsKilled: 2,
		visionWardsBoughtInGame: 2,
		turretKills: 1,
		inhibitorKills: 0,
		dragonKills: 0,
		baronKills: 0,
		champExperience: 13000,
		damageDealtToObjectives: 5000,
		objectivesStolen: 0,
		...overrides,
	} as Participant;
}

function match(participants: Participant[], info: { queueId?: number; gameDuration?: number } = {}): Match {
	return { metadata: { matchId: "M" }, info: { queueId: info.queueId ?? 420, gameDuration: info.gameDuration ?? 1800, gameCreation: 0, gameMode: "CLASSIC", participants, teams: [] } } as Match;
}

/** A distribution whose median equals the fixture values, so the average player scores 50. */
function baselinesAround(values: Partial<Record<string, number>>, games = 500): Baselines {
	const metrics = Object.fromEntries(METRIC_IDS.map((id) => {
		const center = values[id] ?? 0;
		return [id, Array.from({ length: 21 }, (_, i) => center + (i - 10))];
	}));
	return { computedAt: "2026-10-13T00:00:00.000Z", sampleSize: games, roles: { MIDDLE: { games, metrics } } };
}

const me = p({ puuid: "me" });
const opp = p({ puuid: "opp", teamId: 200, championName: "Syndra" });

describe("scorePerformance", () => {
	it("scores a player at the role median as 50 (grade C) with all six categories", () => {
		const m = match([me, opp]);
		const result = scorePerformance(m, "me", baselinesAround({ csPerMin: 6, goldPerMin: 10000 / 30, kda: 2, deathsPerMin: 2 / 30, killParticipation: 2, damageShare: 1, damageTakenShare: 1, objectiveDamagePerMin: 5000 / 30, epicKills: 0, structureKills: 1, steals: 0, visionPerMin: 20 / 30, wardsPlacedPerMin: 8 / 30, wardsKilledPerMin: 2 / 30, controlWards: 2 }));
		expect(result?.role).toBe("MIDDLE");
		expect(result?.categories.map((c) => c.id)).toEqual(["laning", "farming", "combat", "teamfight", "objectives", "vision"]);
		expect(result?.score).toBe(50);
		expect(result?.grade).toBe("C");
		expect(result?.opponent).toEqual({ championName: "Syndra", goldDiff: 0, xpDiff: 0, csDiff: 0, damageDiff: 0 });
	});

	it("ranks far-above-baseline play as S+", () => {
		const star = p({ puuid: "me", kills: 15, deaths: 0, assists: 10, totalMinionsKilled: 300, goldEarned: 20000, totalDamageDealtToChampions: 40000, visionScore: 60, wardsPlaced: 30, wardsKilled: 15, visionWardsBoughtInGame: 10, turretKills: 5, dragonKills: 3, baronKills: 1, damageDealtToObjectives: 30000, objectivesStolen: 2, champExperience: 20000, totalDamageTaken: 30000 });
		const result = scorePerformance(match([star, opp]), "me", baselinesAround({ deathsPerMin: 20, killParticipation: -20, damageShare: -20, damageTakenShare: -20 }));
		expect(result?.grade).toBe("S+");
	});

	it("drops Laning and renormalises when there is no unique opponent", () => {
		const result = scorePerformance(match([me]), "me", baselinesAround({}));
		expect(result?.categories.some((c) => c.id === "laning")).toBe(false);
		expect(result?.opponent).toBeNull();
		expect(result?.score).toBeGreaterThanOrEqual(0);
	});

	it("still scores older matches without the optional fields", () => {
		const old = p({ puuid: "me", champExperience: undefined, damageDealtToObjectives: undefined, objectivesStolen: undefined });
		const result = scorePerformance(match([old, opp]), "me", baselinesAround({}));
		expect(result).not.toBeNull();
		expect(result?.opponent?.xpDiff).toBeNull();
		const objectives = result?.categories.find((c) => c.id === "objectives");
		expect(objectives?.metrics.map((m) => m.id)).toEqual(["epicKills", "structureKills"]);
	});

	it("returns null for non-ranked games, remakes, missing players, roles or baselines", () => {
		const b = baselinesAround({});
		expect(scorePerformance(match([me, opp], { queueId: 450 }), "me", b)).toBeNull();
		expect(scorePerformance(match([me, opp], { gameDuration: 200 }), "me", b)).toBeNull();
		expect(scorePerformance(match([me, opp]), "nobody", b)).toBeNull();
		expect(scorePerformance(match([p({ puuid: "me", teamPosition: "" })]), "me", b)).toBeNull();
		expect(scorePerformance(match([me, opp]), "me", null)).toBeNull();
		expect(scorePerformance(match([me, opp]), "me", baselinesAround({}, 10))).toBeNull();
	});
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `pnpm vitest run src/lib/performance/score.test.ts src/lib/validators/performance.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the validator**

`src/lib/validators/performance.ts`:
```ts
import { z } from "zod";
import { ROLES } from "@/lib/performance/roles";
import { METRIC_IDS } from "@/lib/performance/weights";

const roleBaselineSchema = z.object({
	games: z.number(),
	metrics: z.partialRecord(z.enum(METRIC_IDS), z.array(z.number())),
});

export const baselinesSchema = z.object({
	computedAt: z.string(),
	sampleSize: z.number(),
	roles: z.partialRecord(z.enum(ROLES), roleBaselineSchema),
});

export type Baselines = z.infer<typeof baselinesSchema>;
```

- [ ] **Step 4: Implement scoring**

`src/lib/performance/score.ts`:
```ts
import { isAchievementEligible } from "@/lib/achievements/eligibility";
import { type Match, type Participant } from "@/lib/validators/match";
import { type Baselines } from "@/lib/validators/performance";
import { gradeFor, type Grade } from "./grades";
import { playerMetrics } from "./metrics";
import { percentileOf } from "./percentile";
import { asRole, type Role } from "./roles";
import { CATEGORIES, CATEGORY_METRICS, LOWER_IS_BETTER, ROLE_WEIGHTS, type CategoryId, type MetricId } from "./weights";

export const MIN_BASELINE_GAMES = 30;

export interface CategoryScore {
	id: CategoryId;
	score: number;
	grade: Grade;
	metrics: { id: MetricId; value: number; percentile: number }[];
}

export interface OpponentDiff {
	championName: string;
	goldDiff: number;
	xpDiff: number | null;
	csDiff: number;
	damageDiff: number;
}

export interface PerformanceScore {
	role: Role;
	score: number;
	grade: Grade;
	categories: CategoryScore[];
	opponent: OpponentDiff | null;
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

export function scorePerformance(match: Match, puuid: string, baselines: Baselines | null): PerformanceScore | null {
	const { info } = match;
	if (!baselines || !isAchievementEligible(info.queueId, info.gameDuration)) return null;
	const player = info.participants.find((p) => p.puuid === puuid);
	const role = player ? asRole(player.teamPosition) : null;
	const baseline = role ? baselines.roles[role] : undefined;
	if (!player || !role || !baseline || baseline.games < MIN_BASELINE_GAMES) return null;

	const { values, opponent } = playerMetrics(player, info.participants, info.gameDuration);
	const categories: CategoryScore[] = [];
	for (const id of CATEGORIES) {
		const metrics = CATEGORY_METRICS[id].flatMap((metric) => {
			const value = values[metric];
			const quantiles = baseline.metrics[metric];
			if (value === undefined || !quantiles) return [];
			const raw = percentileOf(value, quantiles);
			return [{ id: metric, value, percentile: LOWER_IS_BETTER.has(metric) ? 100 - raw : raw }];
		});
		if (metrics.length === 0) continue;
		const score = Math.round(mean(metrics.map((m) => m.percentile)));
		categories.push({ id, score, grade: gradeFor(score), metrics });
	}
	if (categories.length === 0) return null;

	const weights = ROLE_WEIGHTS[role];
	const totalWeight = categories.reduce((s, c) => s + weights[c.id], 0);
	const score = Math.round(categories.reduce((s, c) => s + c.score * weights[c.id], 0) / totalWeight);
	const cs = (p: Participant) => p.totalMinionsKilled + p.neutralMinionsKilled;

	return {
		role,
		score,
		grade: gradeFor(score),
		categories,
		opponent: opponent && {
			championName: opponent.championName,
			goldDiff: player.goldEarned - opponent.goldEarned,
			xpDiff: player.champExperience !== undefined && opponent.champExperience !== undefined ? player.champExperience - opponent.champExperience : null,
			csDiff: cs(player) - cs(opponent),
			damageDiff: player.totalDamageDealtToChampions - opponent.totalDamageDealtToChampions,
		},
	};
}
```

The fixture distributions are `center − 10 … center + 10`. With a 30-minute game, a value equal to the center lands on quantile index 10, which is percentile 50. For the "S+" case, the share and kill-participation centers sit far below the star's values and the deaths center far above them, so those metrics reach 100. The rest land well above 50, giving an overall score of about 94.

- [ ] **Step 5: Run to verify they pass**

Run: `pnpm vitest run src/lib/performance src/lib/validators/performance.test.ts && pnpm typecheck`
Expected: PASS; typecheck exit 0. If the median case is not exactly 50 because a fixture value differs from its center, fix the **fixture**, not `score.ts`: every metric for `me` must equal its center. `me` is alone on its team, so the `damageShare` and `damageTakenShare` centers are 1 and the `killParticipation` center is (2 + 2) / 2 = 2.

---

### Task 5: Baseline table, SQL, API and cron

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261013120000_add_performance_baseline/migration.sql`, `src/lib/performance/baselines-query.ts`, `src/lib/performance/baselines.ts`, `src/app/api/performance/baselines/route.ts`, `src/app/api/cron/performance-baselines/route.ts`

**Interfaces:**
- Consumes: `QUANTILE_STEPS` (Task 2), `METRIC_IDS`, `ROLES` (Task 1), `baselinesSchema` / `Baselines` (Task 4), `ACHIEVEMENT_QUEUE_IDS`, `MIN_ACHIEVEMENT_GAME_SECONDS`, `isAuthorizedCronRequest`, `withApiLog`.
- Produces: `loadRoleQuantiles(since: Date): Promise<{ role: string; games: number; metrics: Record<MetricId, number[] | null> }[]>`, `computeAndSaveBaselines(now?: Date): Promise<{ sampleSize: number }>`, `latestBaselines(): Promise<Baselines | null>`, and `GET /api/performance/baselines` → `Baselines | null`.

- [ ] **Step 1: Schema and migration (do not apply)**

Append to `prisma/schema.prisma`:
```prisma
model PerformanceBaseline {
  id         String   @id @default(cuid())
  computedAt DateTime @default(now())
  sampleSize Int
  data       Json

  @@index([computedAt])
}
```

`prisma/migrations/20261013120000_add_performance_baseline/migration.sql`:
```sql
-- CreateTable
CREATE TABLE "PerformanceBaseline" (
    "id" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sampleSize" INTEGER NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "PerformanceBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerformanceBaseline_computedAt_idx" ON "PerformanceBaseline"("computedAt");
```

Run: `pnpm prisma generate && pnpm prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script | grep -A10 'CREATE TABLE "PerformanceBaseline"'`
Expected: the generated block matches the SQL above.

- [ ] **Step 2: Quantile SQL**

`src/lib/performance/baselines-query.ts`:
```ts
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db";
import { ACHIEVEMENT_QUEUE_IDS, MIN_ACHIEVEMENT_GAME_SECONDS } from "@/lib/achievements/eligibility";
import { QUANTILE_STEPS } from "./percentile";
import { METRIC_IDS, type MetricId } from "./weights";

export interface RoleQuantiles {
	role: string;
	games: number;
	metrics: Record<MetricId, number[] | null>;
}

// Metric ids are constants, so quoting them into the SQL is safe
const quantileColumns = Prisma.raw(
	METRIC_IDS.map((id) => `percentile_cont(ARRAY[${QUANTILE_STEPS.join(",")}]) WITHIN GROUP (ORDER BY "${id}") AS "${id}"`).join(",\n"),
);

export async function loadRoleQuantiles(since: Date): Promise<RoleQuantiles[]> {
	const rows = await prisma.$queryRaw<({ role: string; games: number } & Record<MetricId, number[] | null>)[]>`
		WITH p AS (
			SELECT
				m."matchId",
				m."gameDuration" / 60.0 AS mins,
				(x->>'teamId')::int AS team,
				x->>'teamPosition' AS role,
				(x->>'kills')::int AS kills,
				(x->>'deaths')::int AS deaths,
				(x->>'assists')::int AS assists,
				((x->>'totalMinionsKilled')::int + (x->>'neutralMinionsKilled')::int) AS cs,
				(x->>'goldEarned')::int AS gold,
				(x->>'champExperience')::int AS xp,
				(x->>'totalDamageDealtToChampions')::int AS dmg,
				(x->>'totalDamageTaken')::int AS taken,
				(x->>'damageDealtToObjectives')::int AS obj,
				((x->>'dragonKills')::int + (x->>'baronKills')::int) AS epic,
				((x->>'turretKills')::int + (x->>'inhibitorKills')::int) AS structures,
				(x->>'objectivesStolen')::int AS steals,
				(x->>'visionScore')::int AS vision,
				(x->>'wardsPlaced')::int AS wp,
				(x->>'wardsKilled')::int AS wk,
				(x->>'visionWardsBoughtInGame')::int AS cw
			FROM "Match" m
			CROSS JOIN LATERAL jsonb_array_elements(m.data->'info'->'participants') AS x
			WHERE m."queueId" = ANY(${ACHIEVEMENT_QUEUE_IDS}::int[])
				AND m."gameDuration" >= ${MIN_ACHIEVEMENT_GAME_SECONDS}
				AND m."gameCreation" >= ${BigInt(since.getTime())}
		),
		ranked AS (
			SELECT p.*, COUNT(*) OVER (PARTITION BY "matchId", team, role) AS same_role
			FROM p
		),
		team AS (
			SELECT "matchId", team, SUM(kills) AS tk, SUM(dmg) AS td, SUM(taken) AS tt
			FROM p GROUP BY 1, 2
		),
		metrics AS (
			SELECT
				r.role,
				(r.gold - o.gold) / r.mins AS "goldDiffPerMin",
				(r.xp - o.xp) / r.mins AS "xpDiffPerMin",
				(r.cs - o.cs) / r.mins AS "csDiffPerMin",
				(r.dmg - o.dmg) / r.mins AS "damageDiffPerMin",
				r.cs / r.mins AS "csPerMin",
				r.gold / r.mins AS "goldPerMin",
				(r.kills + r.assists)::float / GREATEST(r.deaths, 1) AS "kda",
				r.deaths / r.mins AS "deathsPerMin",
				CASE WHEN t.tk > 0 THEN (r.kills + r.assists)::float / t.tk ELSE 0 END AS "killParticipation",
				CASE WHEN t.td > 0 THEN r.dmg::float / t.td ELSE 0 END AS "damageShare",
				CASE WHEN t.tt > 0 THEN r.taken::float / t.tt ELSE 0 END AS "damageTakenShare",
				r.obj / r.mins AS "objectiveDamagePerMin",
				r.epic::float AS "epicKills",
				r.structures::float AS "structureKills",
				r.steals::float AS "steals",
				r.vision / r.mins AS "visionPerMin",
				r.wp / r.mins AS "wardsPlacedPerMin",
				r.wk / r.mins AS "wardsKilledPerMin",
				r.cw::float AS "controlWards"
			FROM ranked r
			JOIN team t ON t."matchId" = r."matchId" AND t.team = r.team
			LEFT JOIN ranked o ON o."matchId" = r."matchId" AND o.role = r.role AND o.team <> r.team AND o.same_role = 1 AND r.same_role = 1
			WHERE r.role IN ('TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY')
		)
		SELECT role, COUNT(*)::int AS games, ${quantileColumns}
		FROM metrics
		GROUP BY role
	`;
	return rows.map(({ role, games, ...metrics }) => ({ role, games, metrics: metrics as Record<MetricId, number[] | null> }));
}
```

`percentile_cont` ignores NULLs, so missing optional fields and missing opponents do not distort the distributions. An all-NULL metric comes back as `null`.

- [ ] **Step 3: Save, prune, latest**

`src/lib/performance/baselines.ts`:
```ts
import { prisma } from "@/lib/server/db";
import { baselinesSchema, type Baselines } from "@/lib/validators/performance";
import { loadRoleQuantiles } from "./baselines-query";
import { asRole } from "./roles";
import { type MetricId } from "./weights";

const WINDOW_DAYS = 60;
const KEEP = 30;

export async function computeAndSaveBaselines(now: Date = new Date()): Promise<{ sampleSize: number }> {
	const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
	const rows = await loadRoleQuantiles(since);
	const roles: Baselines["roles"] = {};
	for (const row of rows) {
		const role = asRole(row.role);
		if (!role) continue;
		const metrics = Object.fromEntries(Object.entries(row.metrics).filter(([, q]) => q !== null)) as Partial<Record<MetricId, number[]>>;
		roles[role] = { games: row.games, metrics };
	}
	const sampleSize = rows.reduce((s, r) => s + r.games, 0);

	await prisma.performanceBaseline.create({ data: { sampleSize, data: { roles } } });
	const stale = await prisma.performanceBaseline.findMany({ orderBy: { computedAt: "desc" }, skip: KEEP, select: { id: true } });
	if (stale.length > 0) await prisma.performanceBaseline.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
	return { sampleSize };
}

export async function latestBaselines(): Promise<Baselines | null> {
	const row = await prisma.performanceBaseline.findFirst({ orderBy: { computedAt: "desc" } });
	if (!row) return null;
	const data = row.data as { roles?: unknown };
	return baselinesSchema.parse({ computedAt: row.computedAt.toISOString(), sampleSize: row.sampleSize, roles: data.roles ?? {} });
}
```

- [ ] **Step 4: Routes**

`src/app/api/performance/baselines/route.ts`:
```ts
import { NextResponse } from "next/server";
import { latestBaselines } from "@/lib/performance/baselines";
import { withApiLog } from "@/lib/server/log";
import { type Baselines } from "@/lib/validators/performance";

async function getHandler(_req: Request): Promise<NextResponse<Baselines | null | { error: string }>> {
	try {
		return NextResponse.json(await latestBaselines());
	} catch (error) {
		console.error("[api/performance/baselines] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
```

`src/app/api/cron/performance-baselines/route.ts`:
```ts
import { NextResponse } from "next/server";
import { computeAndSaveBaselines } from "@/lib/performance/baselines";
import { isAuthorizedCronRequest } from "@/lib/server/cron-auth";
import { withApiLog } from "@/lib/server/log";

async function getHandler(req: Request) {
	if (!isAuthorizedCronRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	try {
		return NextResponse.json({ ok: true, ...(await computeAndSaveBaselines()) });
	} catch (error) {
		console.error("[cron/performance-baselines] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
```

- [ ] **Step 5: Verify**

Run: `pnpm typecheck && pnpm vitest run src/lib/performance src/lib/validators`
Expected: exit 0; PASS. The SQL is not run in tests. If the user has applied the migration, they can run the cron by hand later; do not run it automatically.

---

### Task 6: Hook and format helper

**Files:**
- Create: `src/hooks/usePerformanceBaselines.ts`, `src/lib/performance/format.ts`
- Test: `src/lib/performance/format.test.ts`

**Interfaces:**
- Produces: `usePerformanceBaselines()` → `useQuery<Baselines | null>`; `formatMetric(id: MetricId, value: number): string`; `formatDiff(value: number): string`.

- [ ] **Step 1: Write the failing test**

`src/lib/performance/format.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { formatDiff, formatMetric } from "./format";

describe("formatMetric", () => {
	it("formats shares as percent, rates with one decimal, counts as integers", () => {
		expect(formatMetric("killParticipation", 0.634)).toBe("63%");
		expect(formatMetric("csPerMin", 7.25)).toBe("7.3");
		expect(formatMetric("goldDiffPerMin", -12.3)).toBe("-12.3");
		expect(formatMetric("kda", 3.456)).toBe("3.46");
		expect(formatMetric("controlWards", 4)).toBe("4");
	});
});

describe("formatDiff", () => {
	it("signs and groups whole numbers", () => {
		expect(formatDiff(1240)).toBe("+1,240");
		expect(formatDiff(-35)).toBe("-35");
		expect(formatDiff(0)).toBe("0");
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/lib/performance/format.test.ts`
Expected: FAIL, "Cannot find module './format'".

- [ ] **Step 3: Implement**

`src/lib/performance/format.ts`:
```ts
import { type MetricId } from "./weights";

const PERCENT: ReadonlySet<MetricId> = new Set(["killParticipation", "damageShare", "damageTakenShare"]);
const COUNT: ReadonlySet<MetricId> = new Set(["epicKills", "structureKills", "steals", "controlWards"]);

export function formatMetric(id: MetricId, value: number): string {
	if (PERCENT.has(id)) return `${Math.round(value * 100)}%`;
	if (COUNT.has(id)) return `${Math.round(value)}`;
	if (id === "kda") return value.toFixed(2);
	return value.toFixed(1);
}

export function formatDiff(value: number): string {
	const rounded = Math.round(value);
	return `${rounded > 0 ? "+" : ""}${rounded.toLocaleString("en-US")}`;
}
```

`src/hooks/usePerformanceBaselines.ts`:
```ts
import { useQuery } from "@tanstack/react-query";
import { baselinesSchema, type Baselines } from "@/lib/validators/performance";

async function fetchBaselines(): Promise<Baselines | null> {
	const res = await fetch("/api/performance/baselines");
	if (!res.ok) throw new Error("Failed to fetch performance baselines");
	return baselinesSchema.nullable().parse(await res.json());
}

export function usePerformanceBaselines() {
	return useQuery<Baselines | null>({
		queryKey: ["performance-baselines"],
		queryFn: fetchBaselines,
		staleTime: 1000 * 60 * 60,
	});
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/lib/performance/format.test.ts && pnpm typecheck`
Expected: PASS (2 tests); exit 0.

---

### Task 7: UI

**Files:**
- Create: `src/components/match/performance/score-circle.tsx`, `src/components/match/performance/category-card.tsx`, `src/components/match/performance/metric-table.tsx`, `src/components/match/performance/opponent-diff.tsx`, `src/components/match/player-tabs/performance-tab.tsx`
- Modify: `src/components/match/player-tabs/player-tabs.tsx`, `src/components/summoner/matches/match-row.tsx`

**Interfaces:**
- Consumes: `scorePerformance`, `PerformanceScore`, `CategoryScore`, `OpponentDiff` (Task 4); `GRADE_COLORS` (Task 1); `CATEGORY_LABELS`, `METRIC_LABELS` (Task 1); `ROLE_LABELS` (Task 1); `formatMetric`, `formatDiff` (Task 6); `usePerformanceBaselines` (Task 6); `PlayerTabProps`; `Panel`, `PanelBody`, `EmptyState`, `Skeleton`, `ChampionIcon`.

- [ ] **Step 1: Components**

`src/components/match/performance/score-circle.tsx`:
```tsx
import { cn } from "@/lib/utils";
import { GRADE_COLORS, type Grade } from "@/lib/performance/grades";

export function ScoreCircle({ score, grade, size = "sm", className }: { score: number; grade: Grade; size?: "sm" | "lg"; className?: string }) {
	const color = GRADE_COLORS[grade];
	return (
		<div
			title={`Performance ${score} · ${grade}`}
			className={cn("flex shrink-0 items-center justify-center rounded-full border-2 font-bold", size === "sm" ? "size-9 text-xs" : "size-20 text-2xl", className)}
			style={{ borderColor: color, color, backgroundColor: `${color}1a` }}
		>
			{score}
		</div>
	);
}
```

`src/components/match/performance/metric-table.tsx`:
```tsx
import { formatMetric } from "@/lib/performance/format";
import { type CategoryScore } from "@/lib/performance/score";
import { METRIC_LABELS } from "@/lib/performance/weights";

export function MetricTable({ metrics, roleLabel }: { metrics: CategoryScore["metrics"]; roleLabel: string }) {
	return (
		<table className="w-full text-xs">
			<tbody>
				{metrics.map((m) => (
					<tr key={m.id} className="border-t">
						<td className="py-1.5 text-muted-foreground">{METRIC_LABELS[m.id]}</td>
						<td className="py-1.5 text-right font-semibold text-foreground">{formatMetric(m.id, m.value)}</td>
						<td className="py-1.5 pl-3 text-right text-muted-foreground">
							better than {Math.round(m.percentile)}% of {roleLabel}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
```

`src/components/match/performance/category-card.tsx`:
```tsx
"use client";

import { useState } from "react";
import { GRADE_COLORS } from "@/lib/performance/grades";
import { type CategoryScore } from "@/lib/performance/score";
import { CATEGORY_LABELS } from "@/lib/performance/weights";
import { MetricTable } from "./metric-table";

export function CategoryCard({ category, roleLabel }: { category: CategoryScore; roleLabel: string }) {
	const [open, setOpen] = useState(false);
	const color = GRADE_COLORS[category.grade];
	return (
		<div className="rounded-md border p-3">
			<button type="button" onClick={() => setOpen((v) => !v)} className="w-full text-left">
				<div className="flex items-baseline justify-between">
					<span className="text-sm font-semibold text-foreground">{CATEGORY_LABELS[category.id]}</span>
					<span className="text-lg font-bold" style={{ color }}>
						{category.grade}
					</span>
				</div>
				<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
					<div className="h-full rounded-full" style={{ width: `${category.score}%`, backgroundColor: color }} />
				</div>
				<p className="mt-1 text-2xs text-muted-foreground">{category.score} / 100</p>
			</button>
			{open && (
				<div className="mt-2">
					<MetricTable metrics={category.metrics} roleLabel={roleLabel} />
				</div>
			)}
		</div>
	);
}
```

`src/components/match/performance/opponent-diff.tsx`:
```tsx
import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { formatDiff } from "@/lib/performance/format";
import { type OpponentDiff as Diff } from "@/lib/performance/score";

function DiffStat({ label, value }: { label: string; value: number | null }) {
	return (
		<div className="text-center">
			<p className={cn("text-sm font-semibold", value === null ? "text-muted-foreground" : value > 0 ? "text-win" : value < 0 ? "text-loss" : "text-foreground")}>
				{value === null ? "—" : formatDiff(value)}
			</p>
			<p className="text-3xs text-muted-foreground">{label}</p>
		</div>
	);
}

export function OpponentDiff({ opponent, version }: { opponent: Diff; version: string }) {
	return (
		<div className="flex flex-wrap items-center gap-4">
			<div className="flex items-center gap-2 text-xs text-muted-foreground">
				vs <ChampionIcon version={version} championName={opponent.championName} size={28} />
			</div>
			<DiffStat label="Gold" value={opponent.goldDiff} />
			<DiffStat label="XP" value={opponent.xpDiff} />
			<DiffStat label="CS" value={opponent.csDiff} />
			<DiffStat label="Damage" value={opponent.damageDiff} />
		</div>
	);
}
```

`src/components/match/player-tabs/performance-tab.tsx`:
```tsx
"use client";

import { useMemo } from "react";
import { Panel, PanelBody } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryCard } from "@/components/match/performance/category-card";
import { OpponentDiff } from "@/components/match/performance/opponent-diff";
import { ScoreCircle } from "@/components/match/performance/score-circle";
import { usePerformanceBaselines } from "@/hooks/usePerformanceBaselines";
import { ROLE_LABELS } from "@/lib/performance/roles";
import { scorePerformance } from "@/lib/performance/score";
import { type PlayerTabProps } from "./player-tabs";

export function PerformanceTab({ match, player, version }: PlayerTabProps) {
	const { data: baselines, isLoading } = usePerformanceBaselines();
	const performance = useMemo(() => scorePerformance(match, player.puuid, baselines ?? null), [match, player.puuid, baselines]);

	if (isLoading) return <Skeleton className="h-72" />;
	if (!performance) {
		return (
			<Panel>
				<EmptyState title="No performance score" description="Scores are given for ranked Solo, Flex and 5s games with a known role, once enough games are tracked for that role." />
			</Panel>
		);
	}

	const roleLabel = ROLE_LABELS[performance.role];
	const games = baselines?.roles[performance.role]?.games ?? 0;
	return (
		<div className="space-y-4">
			<Panel>
				<PanelBody className="flex flex-wrap items-center gap-6">
					<ScoreCircle score={performance.score} grade={performance.grade} size="lg" />
					<div>
						<p className="text-sm text-muted-foreground">{roleLabel}</p>
						<p className="text-2xl font-bold text-foreground">Grade {performance.grade}</p>
					</div>
					{performance.opponent && (
						<div className="ml-auto">
							<OpponentDiff opponent={performance.opponent} version={version} />
						</div>
					)}
				</PanelBody>
			</Panel>
			<div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
				{performance.categories.map((c) => (
					<CategoryCard key={c.id} category={c} roleLabel={`${roleLabel} players`} />
				))}
			</div>
			<p className="text-xs text-muted-foreground">
				Compared with {games.toLocaleString("en-US")} {roleLabel} players from ranked games in the last 60 days.
			</p>
		</div>
	);
}
```

- [ ] **Step 2: Wire the tab and the row**

In `src/components/match/player-tabs/player-tabs.tsx`:
- add `import { PerformanceTab } from "./performance-tab";`;
- insert `{ id: "performance", label: "Performance", needsTimeline: false, Component: PerformanceTab },` after the overview entry in `TABS`;
- change the JSDoc above `PlayerTabs` to `/** Tab bar for the selected player's views. */`.

In `src/components/summoner/matches/match-row.tsx`:
- add imports:
```tsx
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreCircle } from "@/components/match/performance/score-circle";
import { usePerformanceBaselines } from "@/hooks/usePerformanceBaselines";
import { isAchievementEligible } from "@/lib/achievements/eligibility";
import { scorePerformance } from "@/lib/performance/score";
```
  Merge `useMemo` into the existing `import { useState } from "react";`.
- inside `MatchRow`, after `const ranked = …;`:
```tsx
	const { data: baselines, isLoading: baselinesLoading } = usePerformanceBaselines();
	const performance = useMemo(() => scorePerformance(match, player.puuid, baselines ?? null), [match, player.puuid, baselines]);
	const scorable = isAchievementEligible(info.queueId, info.gameDuration);
```
- right after the closing `</div>` of the `w-[4.75rem]` result block, insert:
```tsx
				{performance ? (
					<ScoreCircle score={performance.score} grade={performance.grade} />
				) : (
					scorable && baselinesLoading && <Skeleton className="size-9 rounded-full" />
				)}
```

- [ ] **Step 3: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: typecheck exit 0; lint only the 4 known `any` errors in `src/app/api/matches/**`; all tests pass.

Browser: this cannot be verified until the user applies the migration **and** a cron run has created a baseline. Report that instead of starting the dev server. If both are done, start the dev server once, open `/summoner/Skaikru-HEAVN` and one match detail page, check the score circle and the Performance tab, then stop the server.

---

### Task 8: Changelog, review and commit

**Files:**
- Create: `src/components/changelog/changes/2026-10-13/metadata.ts`
- Modify: `src/components/changelog/registry.ts`

- [ ] **Step 1: Changelog**

`src/components/changelog/changes/2026-10-13/metadata.ts`:
```ts
import { type ChangelogEntry } from "../../changelog-type";

const changelog: ChangelogEntry = {
	slug: "2026-10-13",
	title: "Performance Scores",
	date: "2026-10-13",
	summary: "Every ranked game now gets a 0–100 performance score with a grade, compared with players in the same role.",
	changes: [
		{
			category: "feature",
			title: "Performance score",
			description:
				"Ranked games show a score on the match list. The match page has a Performance tab with grades for laning, farming, combat, teamfight, objectives and vision, the stats behind each, and how you did against your lane opponent.",
		},
	],
};

export default changelog;
```

In `src/components/changelog/registry.ts`, add `import changelog_2026_10_13 from "./changes/2026-10-13/metadata";` above the 2026-10-11 import, and put `changelog_2026_10_13,` first in `changelogs`.

- [ ] **Step 2: Full verification**

Run: `pnpm typecheck && pnpm test && pnpm lint`
Expected: exit 0; all pass; lint only the 4 known errors.

- [ ] **Step 3: Pre-commit review**

Dispatch one reviewer on the most capable model over `git diff main...HEAD` plus untracked files, with the spec, this plan and the Review Focus. Fix Critical and Important findings test-first; list the minors.

- [ ] **Step 4: Commit**

```bash
git add -A prisma src docs/superpowers/plans/2026-10-13-performance-score.md
git commit -m "feat: performance score for ranked games (phase 1)

Role baselines (21 quantiles of 19 metrics per role, last 60 days of
stored ranked games) are computed by a daily cron into a new
PerformanceBaseline table. Pure scoring functions in lib/performance
turn a game into a 0-100 score with six graded categories and lane
opponent diffs; the match row shows the score and the match page has
a Performance tab.

Migration to apply: prisma/migrations/20261013120000_add_performance_baseline
Cron to add: GET /api/cron/performance-baselines (daily)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Expected: one commit on `feat/performance-score`, not pushed.
