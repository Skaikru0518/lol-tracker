# UI Redesign Phase 3b — Profile Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the user's pre-Phase-4 feedback to the profile. The work covers seven areas:
- every current game mode recognized and filterable;
- Ranked 5s everywhere ranked queues appear;
- hover times on the rank-card sparklines;
- Roles & Performance computed from the last 50 Summoner's Rift games;
- Most played defaulting to Solo;
- an LP chart with one evenly spaced point per played day, opening on Season;
- LP changes grouped into collapsible days.

**Architecture:** Every derived value lives in a pure, tested helper:
- `src/lib/champion-stats/queue.ts`, `src/lib/queue-names.ts` and the new `src/lib/ranked-queues.ts` for queues;
- `src/lib/lp-history/summary.ts` for LP;
- `src/lib/summoner/sparkline.ts` for the sparkline.

Components only render. The last-50-Rift list comes from the stored `Match` table through a new `rift=true` mode on `/api/matches`, the same pattern as the champion filter. It runs after the overview's Riot fetch has stored the newest games.

**Tech Stack:** Next.js 16.2.1 App Router, TanStack Query 5, Prisma 7 raw SQL, recharts 3, Tailwind 4 tokens, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-10-ui-redesign-design.md`. The user's feedback message of 2026-10-10 extends it:
1. Collapsible day sessions in the LP changes table.
2. ARAM, ARAM Mayhem, Arena, Ranked 5s, Flex, Solo and seasonal modes (ARURF, URF and so on) recognized in recent games.
3. A Ranked 5s rank card under Solo and Flex.
4. The rank-card sparklines show the snapshot time under the cursor.
5. Roles & Performance always shows the last 50 games, and its dots are those 50 games.
6. Most played defaults to Solo.
7. The LP chart spaces days evenly and defaults to Season.

**Answers to clarifying questions:**
- **Chart X axis:** played days only, one point per day.
- **Dots:** no interaction; only show the 50 games.
- **Which 50:** the last 50 Summoner's Rift games.
- **Ranked 5s:** a left-column card, the LP History toggle, a filter chip and the Most played option.

## Global Constraints

- Package manager: `pnpm` only (never npm).
- Comments: JSDoc and single-line inline comments only; no block comments, no commented-out code.
- Match rows keep the left-to-right win/loss gradient.
- Commits: one commit at the end of the phase (Task 7), not per task.
- Ranked 5s queue type is `RANKED_PREMADE_5x5`, and its match queue id is `710`. Both were verified against stored data: `RankedEntry` and `LPHistory` already hold `RANKED_PREMADE_5x5` rows, and 5 of the 7 stored queue-710 matches include a player with a 5s entry.
- Queue ids come from Riot's `queues.json`:
  - 2400 ARAM: Mayhem
  - 1750 Arena (seen in stored data)
  - 900 ARURF, 1010 Snow ARURF, 1900 Pick URF
  - 2300 Brawl
  - 870 / 880 / 890 Co-op vs. AI
- Summoner's Rift role queues (`RIFT_QUEUE_IDS`): 400, 420, 430, 440, 480, 490, 700, 710.

## Review Focus

1. **Player with no Ranked 5s entry.** The 5s card shows Unranked and requests no LP history. Pinned by the existing `enabled: entry ? puuid : undefined` in `RankedPanel` (Task 2 keeps it).
2. **LP range whose snapshots all fall on one day.** The chart is replaced by a message instead of a one-point chart. Task 4 tests `dailyLpPoints` with a single day.
3. **Season reset between snapshots,** where the W/L running totals go down. The day group never counts negative games. Task 5 tests this.
4. **A queue id Riot adds later.** The row falls back to the `gameMode` label and stays visible under All. Task 1 tests the fallback.
5. **Account with fewer than 50 stored Rift games, or none.** The header shows the real count, and zero shows the empty state. Covered by `calculateStats` on fewer matches. Task 6 verifies it in the browser.

---

### Task 1: Recognize every current game mode

**Files:**
- Modify: `src/lib/queue-names.ts`
- Create: `src/lib/queue-names.test.ts`
- Modify: `src/lib/arena-helpers.ts`
- Create: `src/lib/arena-helpers.test.ts`
- Modify: `src/lib/champion-stats/queue.ts`, `src/lib/champion-stats/queue.test.ts`
- Modify: `src/lib/summoner/match-row.ts`, `src/lib/summoner/match-row.test.ts`
- Modify: `src/components/summoner/matches/match-filters.tsx`

**Interfaces:**
- Produces:
  - `QueueFilter = "all" | "solo" | "flex" | "premade" | "normal" | "aram" | "mayhem" | "arena" | "event"`
  - `RIFT_QUEUE_IDS: number[]`
  - `ARENA_QUEUE_IDS: number[]`
  - `isArenaMatch(queueId)` now true for 1750

- [ ] **Step 1: Write the failing tests**

`src/lib/queue-names.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getQueueName } from "./queue-names";

describe("getQueueName", () => {
	it.each([
		[710, "Ranked 5s"],
		[2400, "ARAM Mayhem"],
		[1750, "Arena"],
		[900, "ARURF"],
		[1010, "Snow ARURF"],
		[1900, "Pick URF"],
		[2300, "Brawl"],
		[890, "Co-op Intermediate"],
	])("names queue %i as %s", (queueId, name) => {
		expect(getQueueName(queueId)).toBe(name);
	});

	it("falls back for queues Riot adds later", () => {
		expect(getQueueName(9999, "NEWMODE")).toBe("NEWMODE");
	});
});
```

`src/lib/arena-helpers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isArenaMatch } from "./arena-helpers";

describe("isArenaMatch", () => {
	it.each([1700, 1710, 1750])("treats %i as Arena", (queueId) => {
		expect(isArenaMatch(queueId)).toBe(true);
	});

	it("is false for Summoner's Rift", () => {
		expect(isArenaMatch(420)).toBe(false);
	});
});
```

In `src/lib/champion-stats/queue.test.ts`:
- Change the import to `import { parseQueueFilter, queueSelection, RIFT_QUEUE_IDS } from "./queue";`.
- Change the accepts list to `["all", "solo", "flex", "premade", "normal", "aram", "mayhem", "arena", "event"]`.
- Change the `"excludes Arena from all"` expectation to `{ mode: "exclude", ids: [1700, 1710, 1750] }`.
- Append:

```ts
describe("new queue groups", () => {
	it("maps premade to Ranked 5s", () => {
		expect(queueSelection("premade")).toEqual({ mode: "include", ids: [710] });
	});

	it("keeps ARAM Clash with ARAM and Mayhem separate", () => {
		expect(queueSelection("aram")).toEqual({ mode: "include", ids: [450, 720] });
		expect(queueSelection("mayhem")).toEqual({ mode: "include", ids: [2400] });
	});

	it("groups rotating modes under event", () => {
		expect(queueSelection("event")).toEqual({ mode: "include", ids: [900, 1010, 1020, 1300, 1400, 1900, 2300] });
	});
});

describe("RIFT_QUEUE_IDS", () => {
	it("holds normals, ranked and Clash on Summoner's Rift only", () => {
		expect(RIFT_QUEUE_IDS).toEqual([400, 420, 430, 440, 480, 490, 700, 710]);
	});
});
```

In `src/lib/summoner/match-row.test.ts`, inside `"names ranked queues explicitly"`, add:

```ts
		expect(shortQueueName(710, "CLASSIC")).toBe("Ranked 5s");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/lib/queue-names.test.ts src/lib/arena-helpers.test.ts src/lib/champion-stats/queue.test.ts src/lib/summoner/match-row.test.ts`
Expected: FAIL. Errors include `expected 'Custom' to be 'Ranked 5s'`, `isArenaMatch(1750)` false and `RIFT_QUEUE_IDS` undefined.

- [ ] **Step 3: Implement**

`src/lib/queue-names.ts`: replace the map with:

```ts
const QUEUE_NAMES: Record<number, string> = {
	400: "Normal Draft",
	420: "Ranked Solo/Duo",
	430: "Normal Blind",
	440: "Ranked Flex",
	450: "ARAM",
	480: "Swiftplay",
	490: "Quickplay",
	700: "Clash",
	710: "Ranked 5s",
	720: "ARAM Clash",
	830: "Co-op Intro",
	840: "Co-op Beginner",
	850: "Co-op Intermediate",
	870: "Co-op Intro",
	880: "Co-op Beginner",
	890: "Co-op Intermediate",
	900: "ARURF",
	1010: "Snow ARURF",
	1020: "One for All",
	1300: "Nexus Blitz",
	1400: "Ultimate Spellbook",
	1700: "Arena",
	1710: "Arena",
	1750: "Arena",
	1900: "Pick URF",
	2300: "Brawl",
	2400: "ARAM Mayhem",
};
```

`src/lib/arena-helpers.ts`: replace `isArenaMatch` with:

```ts
/** Arena queues: 2v2v2v2, the 16-player lobby and the current rotation. */
export const ARENA_QUEUE_IDS = [1700, 1710, 1750];

export function isArenaMatch(queueId: number): boolean {
	return ARENA_QUEUE_IDS.includes(queueId);
}
```

`src/lib/champion-stats/queue.ts`: replace the type, list and selections:

```ts
import { ARENA_QUEUE_IDS } from "@/lib/arena-helpers";

export type QueueFilter = "all" | "solo" | "flex" | "premade" | "normal" | "aram" | "mayhem" | "arena" | "event";

export const QUEUE_FILTERS: readonly QueueFilter[] = ["all", "solo", "flex", "premade", "normal", "aram", "mayhem", "arena", "event"];

/** Summoner's Rift queues where roles mean something: normals, ranked and Clash. */
export const RIFT_QUEUE_IDS = [400, 420, 430, 440, 480, 490, 700, 710];
```

```ts
const SELECTIONS: Record<QueueFilter, QueueSelection> = {
	all: { mode: "exclude", ids: ARENA_QUEUE_IDS },
	solo: { mode: "include", ids: [420] },
	flex: { mode: "include", ids: [440] },
	premade: { mode: "include", ids: [710] },
	normal: { mode: "include", ids: [400, 430, 480, 490] },
	aram: { mode: "include", ids: [450, 720] },
	mayhem: { mode: "include", ids: [2400] },
	arena: { mode: "include", ids: ARENA_QUEUE_IDS },
	event: { mode: "include", ids: [900, 1010, 1020, 1300, 1400, 1900, 2300] },
};
```

`src/lib/summoner/match-row.ts` `shortQueueName`: add `if (queueId === 710) return "Ranked 5s";` after the 440 line.

`src/components/summoner/matches/match-filters.tsx`: set `CHIPS` to:

```ts
const CHIPS: { value: QueueFilter; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "solo", label: "Solo" },
	{ value: "flex", label: "Flex" },
	{ value: "premade", label: "5s" },
	{ value: "normal", label: "Normal" },
	{ value: "aram", label: "ARAM" },
	{ value: "mayhem", label: "Mayhem" },
	{ value: "arena", label: "Arena" },
	{ value: "event", label: "Event" },
];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS, all files.

---

### Task 2: Ranked 5s across the profile

**Files:**
- Create: `src/lib/ranked-queues.ts`, `src/lib/ranked-queues.test.ts`
- Create: `src/hooks/useRankedLpHistories.ts`
- Modify:
  - `src/lib/summoner/rank-pills.ts` and its test
  - `src/components/summoner/overview/ranked-panel.tsx`, `overview-tab.tsx`, `most-played-panel.tsx`
  - `src/components/summoner/matches/match-list.tsx`, `match-row.tsx`, `match-row-expanded.tsx`
  - `src/components/summoner/champions/champion-detail.tsx`
  - `src/components/summoner/lp-history/lp-history-tab.tsx`

**Interfaces:**
- Consumes: `QueueFilter` with `"premade"` (Task 1).
- Produces:
  - `RankedQueueType`, `RANKED_QUEUE_TYPES`, `RANKED_QUEUE_TITLES`, `RANKED_QUEUE_SHORT`
  - `rankedQueueForQueueId(queueId: number): RankedQueueType | null`
  - `useRankedLpHistories(puuid?: string): LpHistories`, where `type LpHistories = Partial<Record<RankedQueueType, LPSnapshot[]>>`
  - `MatchList` prop `lpHistories?: LpHistories`, which replaces `soloHistory` and `flexHistory`

- [ ] **Step 1: Write the failing tests**

`src/lib/ranked-queues.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { RANKED_QUEUE_TYPES, rankedQueueForQueueId } from "./ranked-queues";

describe("rankedQueueForQueueId", () => {
	it.each([
		[420, "RANKED_SOLO_5x5"],
		[440, "RANKED_FLEX_SR"],
		[710, "RANKED_PREMADE_5x5"],
	])("maps queue %i to %s", (queueId, queueType) => {
		expect(rankedQueueForQueueId(queueId)).toBe(queueType);
	});

	it("is null for unranked queues", () => {
		expect(rankedQueueForQueueId(450)).toBeNull();
	});
});

describe("RANKED_QUEUE_TYPES", () => {
	it("orders solo, flex, then 5s", () => {
		expect(RANKED_QUEUE_TYPES).toEqual(["RANKED_SOLO_5x5", "RANKED_FLEX_SR", "RANKED_PREMADE_5x5"]);
	});
});
```

In `src/lib/summoner/rank-pills.test.ts`, append inside `describe("rankPills", ...)`:

```ts
	it("adds Ranked 5s after flex", () => {
		expect(
			rankPills([entry("RANKED_PREMADE_5x5", "GOLD", "II"), entry("RANKED_SOLO_5x5", "EMERALD", "I")]).map((p) => p.label),
		).toEqual(["EMERALD I · SOLO", "GOLD II · 5S"]);
	});
```

Labels are uppercased by `rankPills`, so `EMERALD I · SOLO` matches the existing tests' format.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/lib/ranked-queues.test.ts src/lib/summoner/rank-pills.test.ts`
Expected: FAIL. `ranked-queues` cannot be resolved, and the 5S pill is missing.

- [ ] **Step 3: Implement the helpers**

`src/lib/ranked-queues.ts`:

```ts
import { type LPSnapshot } from "@/lib/validators/lp-history";

export const RANKED_QUEUE_TYPES = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR", "RANKED_PREMADE_5x5"] as const;

export type RankedQueueType = (typeof RANKED_QUEUE_TYPES)[number];

/** LP snapshots per ranked queue. */
export type LpHistories = Partial<Record<RankedQueueType, LPSnapshot[]>>;

export const RANKED_QUEUE_TITLES: Record<RankedQueueType, string> = {
	RANKED_SOLO_5x5: "Ranked Solo",
	RANKED_FLEX_SR: "Ranked Flex",
	RANKED_PREMADE_5x5: "Ranked 5s",
};

export const RANKED_QUEUE_SHORT: Record<RankedQueueType, string> = {
	RANKED_SOLO_5x5: "SOLO",
	RANKED_FLEX_SR: "FLEX",
	RANKED_PREMADE_5x5: "5S",
};

const BY_QUEUE_ID: Record<number, RankedQueueType> = {
	420: "RANKED_SOLO_5x5",
	440: "RANKED_FLEX_SR",
	710: "RANKED_PREMADE_5x5",
};

/** Ranked queue whose LP a match's queue id moves; null for unranked queues. */
export function rankedQueueForQueueId(queueId: number): RankedQueueType | null {
	return BY_QUEUE_ID[queueId] ?? null;
}
```

`src/lib/summoner/rank-pills.ts`:
- Delete `QUEUE_SHORT` and `QUEUE_ORDER`.
- Import `RANKED_QUEUE_SHORT` and `RANKED_QUEUE_TYPES` from `@/lib/ranked-queues`.
- Iterate `RANKED_QUEUE_TYPES.flatMap(...)` and use `RANKED_QUEUE_SHORT[queueType]`.
- Update the JSDoc to `/** Hero rank chips for solo, flex and 5s in that order; other queues are ignored. */`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/ranked-queues.test.ts src/lib/summoner/rank-pills.test.ts`
Expected: PASS

- [ ] **Step 5: Wire the components**

`src/hooks/useRankedLpHistories.ts`:

```ts
import { useMemo } from "react";
import { useLPHistory } from "@/hooks/useLPHistory";
import { type LpHistories } from "@/lib/ranked-queues";

/** Last 100 LP snapshots of each ranked queue, for match-row LP changes. */
export function useRankedLpHistories(puuid: string | undefined): LpHistories {
	const { data: solo } = useLPHistory(puuid, "RANKED_SOLO_5x5");
	const { data: flex } = useLPHistory(puuid, "RANKED_FLEX_SR");
	const { data: premade } = useLPHistory(puuid, "RANKED_PREMADE_5x5");
	return useMemo(() => ({ RANKED_SOLO_5x5: solo, RANKED_FLEX_SR: flex, RANKED_PREMADE_5x5: premade }), [solo, flex, premade]);
}
```

`match-list.tsx`:
- Replace the `soloHistory`/`flexHistory` props (and their types) with `lpHistories?: LpHistories`, imported from `@/lib/ranked-queues` along with `rankedQueueForQueueId`. Remove the now unused `LPSnapshot` import.
- Replace the two `history`/`lpChange` lines with:

```ts
						const rankedQueue = rankedQueueForQueueId(queueId);
						const lpChange = rankedQueue ? calculateLPChange(lpHistories?.[rankedQueue], gameCreation + gameDuration * 1000) : null;
```

`overview-tab.tsx` and `champion-detail.tsx`: replace the two `useLPHistory` calls with `const lpHistories = useRankedLpHistories(puuid);` and pass `lpHistories={lpHistories}` to `MatchList` instead of the two history props. Remove the unused imports. Keep `useLPHistory` out of `overview-tab` unless something else still uses it.

`match-row.tsx`: `const ranked = rankedQueueForQueueId(info.queueId) !== null;`

`match-row-expanded.tsx`: `rankQueue={rankedQueueForQueueId(match.info.queueId) ?? "RANKED_SOLO_5x5"}`. `rankQueue` is already typed as `string`, so no type change is needed.

`ranked-panel.tsx`:
- Delete `TITLES`.
- Type `queueType: RankedQueueType`.
- Use `RANKED_QUEUE_TITLES[queueType]`.

`overview-tab.tsx` left column: replace the solo/flex block with:

```tsx
					{ranked
						? RANKED_QUEUE_TYPES.map((queueType) => (
								<RankedPanel key={queueType} puuid={puuid} queueType={queueType} entry={ranked.find((e) => e.queueType === queueType)} />
							))
						: RANKED_QUEUE_TYPES.map((queueType) => <Skeleton key={queueType} className="h-36" />)}
```

Remove the `solo` and `flex` consts.

`lp-history-tab.tsx`: `type Queue = RankedQueueType;` and

```ts
const QUEUES: { value: Queue; label: string }[] = [
	{ value: "RANKED_SOLO_5x5", label: "Solo/Duo" },
	{ value: "RANKED_FLEX_SR", label: "Flex" },
	{ value: "RANKED_PREMADE_5x5", label: "5s" },
];
```

`most-played-panel.tsx`:

```ts
const QUEUE_OPTIONS: { value: QueueFilter; label: string }[] = [
	{ value: "all", label: "All queues" },
	{ value: "solo", label: "Ranked Solo" },
	{ value: "flex", label: "Ranked Flex" },
	{ value: "premade", label: "Ranked 5s" },
];
```

and `useState<QueueFilter>("solo")`.

- [ ] **Step 6: Typecheck and test**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: tsc exits 0; all tests PASS. If tsc reports `.next/dev/types` validator errors, delete `.next/dev/types`, request any page from the dev server and re-run.

---

### Task 3: Snapshot time on sparkline hover

**Files:**
- Modify: `src/lib/summoner/sparkline.ts`, `src/lib/summoner/sparkline.test.ts`
- Modify: `src/components/summoner/overview/lp-sparkline.tsx`

**Interfaces:**
- Produces: `sparklineIndexAt(x: number, width: number, count: number): number`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/summoner/sparkline.test.ts` and add `sparklineIndexAt` to its import:

```ts
describe("sparklineIndexAt", () => {
	it("maps the edges to the first and last point", () => {
		expect(sparklineIndexAt(0, 240, 5)).toBe(0);
		expect(sparklineIndexAt(240, 240, 5)).toBe(4);
	});

	it("snaps to the nearest point", () => {
		expect(sparklineIndexAt(80, 240, 5)).toBe(1);
		expect(sparklineIndexAt(100, 240, 5)).toBe(2);
	});

	it("clamps positions outside the line", () => {
		expect(sparklineIndexAt(-10, 240, 5)).toBe(0);
		expect(sparklineIndexAt(999, 240, 5)).toBe(4);
	});

	it("is 0 for a single point or zero width", () => {
		expect(sparklineIndexAt(50, 240, 1)).toBe(0);
		expect(sparklineIndexAt(50, 0, 5)).toBe(0);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/summoner/sparkline.test.ts`
Expected: FAIL. `sparklineIndexAt is not a function`.

- [ ] **Step 3: Implement**

Append to `src/lib/summoner/sparkline.ts`:

```ts
/** Index of the point nearest to `x` on a sparkline of `count` evenly spaced points across `width`. */
export function sparklineIndexAt(x: number, width: number, count: number): number {
	if (count <= 1 || width <= 0) return 0;
	const index = Math.round((x / width) * (count - 1));
	return Math.min(Math.max(index, 0), count - 1);
}
```

Replace `src/components/summoner/overview/lp-sparkline.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { formatRankLabel } from "@/lib/rank-calculator";
import { sparklineIndexAt, sparklinePoints } from "@/lib/summoner/sparkline";
import { toAbsoluteLp } from "@/lib/summoner/lp-change";
import { type LPSnapshot } from "@/lib/validators/lp-history";

const WIDTH = 240;
const HEIGHT = 36;

const timeLabel = (iso: string) =>
	new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** 30-day LP trend line; hovering shows the nearest snapshot's time and rank. Renders nothing with fewer than two snapshots. */
export function LpSparkline({ snapshots }: { snapshots?: LPSnapshot[] }) {
	const [hover, setHover] = useState<number | null>(null);
	if (!snapshots || snapshots.length < 2) return null;

	const points = sparklinePoints(snapshots.map((s) => toAbsoluteLp(s.tier, s.rank, s.lp)), WIDTH, HEIGHT);
	const active = hover === null ? null : snapshots[hover];
	const ratio = hover === null ? 0 : hover / (snapshots.length - 1);
	// Keep the tooltip inside the card at both ends
	const shift = ratio < 0.2 ? "0%" : ratio > 0.8 ? "-100%" : "-50%";

	return (
		<div
			className="relative mt-3"
			onMouseMove={(e) => {
				const rect = e.currentTarget.getBoundingClientRect();
				setHover(sparklineIndexAt(e.clientX - rect.left, rect.width, snapshots.length));
			}}
			onMouseLeave={() => setHover(null)}
		>
			<svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-9 w-full" aria-hidden>
				<polyline points={points} fill="none" stroke="var(--primary)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
				{hover !== null && (
					<line
						x1={ratio * WIDTH}
						x2={ratio * WIDTH}
						y1={0}
						y2={HEIGHT}
						stroke="var(--muted-foreground)"
						strokeDasharray="2 2"
						vectorEffect="non-scaling-stroke"
					/>
				)}
			</svg>
			{active && (
				<div
					className="pointer-events-none absolute -top-7 whitespace-nowrap rounded-md border bg-popover px-1.5 py-0.5 text-[11px] text-popover-foreground shadow-sm"
					style={{ left: `${ratio * 100}%`, transform: `translateX(${shift})` }}
				>
					{timeLabel(active.createdAt)} · {formatRankLabel(active.tier, active.rank)} {active.lp} LP
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/summoner/sparkline.test.ts`
Expected: PASS

---

### Task 4: LP chart — one evenly spaced point per played day, Season default

**Files:**
- Modify: `src/lib/lp-history/summary.ts`, `src/lib/lp-history/summary.test.ts`
- Modify: `src/components/summoner/lp-history/lp-chart.tsx`, `lp-history-tab.tsx`

**Interfaces:**
- Consumes: `knownTierSnapshots`, `lpAxisTicks` and `lpAxisTickLabel` (all already in `summary.ts`).
- Produces:
  - `localDayKey(iso: string): string`, formatted `YYYY-MM-DD` in local time
  - `dayKeyToDate(day: string): Date`
  - `interface DailyLpPoint { day: string; value: number; snapshot: LPSnapshot }`
  - `dailyLpPoints(snapshots: LPSnapshot[]): DailyLpPoint[]`
  - `LpChart({ points }: { points: DailyLpPoint[] })`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/lp-history/summary.test.ts` and add `dailyLpPoints, dayKeyToDate, localDayKey` to its import. The times sit at 12:00–13:00 UTC, so the local day is the same in UTC−11 through UTC+10.

```ts
const at = (id: string, createdAt: string, lp: number, wins: number | null = null, losses: number | null = null, tier = "EMERALD") => ({
	id,
	tier,
	rank: "I",
	lp,
	wins,
	losses,
	createdAt,
});

describe("localDayKey / dayKeyToDate", () => {
	it("round-trips a local day", () => {
		const key = localDayKey("2026-10-03T12:00:00.000Z");
		expect(key).toBe("2026-10-03");
		expect(localDayKey(dayKeyToDate(key).toISOString())).toBe(key);
	});
});

describe("dailyLpPoints", () => {
	it("keeps the last snapshot of each played day, oldest first", () => {
		const points = dailyLpPoints([
			at("a", "2026-10-01T12:00:00.000Z", 10),
			at("b", "2026-10-01T13:00:00.000Z", 30),
			at("c", "2026-10-04T12:00:00.000Z", 50),
		]);
		expect(points.map((p) => [p.day, p.snapshot.id])).toEqual([
			["2026-10-01", "b"],
			["2026-10-04", "c"],
		]);
		expect(points[0].value).toBe(2300 + 30);
	});

	it("collapses a single day to one point", () => {
		expect(dailyLpPoints([at("a", "2026-10-01T12:00:00.000Z", 10), at("b", "2026-10-01T13:00:00.000Z", 30)])).toHaveLength(1);
	});

	it("skips unknown tiers", () => {
		expect(dailyLpPoints([at("a", "2026-10-01T12:00:00.000Z", 10, null, null, "UNKNOWN")])).toEqual([]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/lp-history/summary.test.ts`
Expected: FAIL. `dailyLpPoints is not a function`, and the same for `localDayKey`.

- [ ] **Step 3: Implement**

Append to `src/lib/lp-history/summary.ts`:

```ts
const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar day of an ISO timestamp as `YYYY-MM-DD`. */
export function localDayKey(iso: string): string {
	const d = new Date(iso);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight of a `YYYY-MM-DD` day key. */
export function dayKeyToDate(day: string): Date {
	const [y, m, d] = day.split("-").map(Number);
	return new Date(y, m - 1, d);
}

export interface DailyLpPoint {
	day: string;
	value: number;
	snapshot: LPSnapshot;
}

/** One point per day that has snapshots (that day's last), oldest first; unknown tiers are skipped. */
export function dailyLpPoints(snapshots: LPSnapshot[]): DailyLpPoint[] {
	const byDay = new Map<string, LPSnapshot>();
	for (const s of knownTierSnapshots(snapshots)) byDay.set(localDayKey(s.createdAt), s);
	return [...byDay].map(([day, snapshot]) => ({ day, value: absolute(snapshot), snapshot }));
}
```

Replace the body of `src/components/summoner/lp-history/lp-chart.tsx` with:

```tsx
"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type DailyLpPoint, dayKeyToDate, lpAxisTickLabel, lpAxisTicks } from "@/lib/lp-history/summary";
import { formatRankLabel } from "@/lib/rank-calculator";

const dayLabel = (day: string) => dayKeyToDate(day).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Step chart of absolute LP with one evenly spaced point per played day; tooltip shows that day's final rank. */
export function LpChart({ points }: { points: DailyLpPoint[] }) {
	const data = points.map((p) => ({
		day: p.day,
		value: p.value,
		label: `${formatRankLabel(p.snapshot.tier, p.snapshot.rank)} · ${p.snapshot.lp} LP`,
	}));
	const values = data.map((d) => d.value);
	const ticks = lpAxisTicks(Math.min(...values), Math.max(...values));

	return (
		<div className="h-64 px-2 pb-2 pt-4">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={data} margin={{ left: 8, right: 8 }}>
					<defs>
						<linearGradient id="lp-fill" x1="0" x2="0" y1="0" y2="1">
							<stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
							<stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
					<XAxis dataKey="day" type="category" tickFormatter={dayLabel} minTickGap={16} stroke="var(--muted-foreground)" fontSize={11} />
					<YAxis domain={[ticks[0], ticks[ticks.length - 1]]} ticks={ticks} tickFormatter={lpAxisTickLabel} stroke="var(--muted-foreground)" fontSize={11} width={90} />
					<Tooltip
						contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
						labelFormatter={(day) => dayLabel(String(day))}
						formatter={(_value, _name, item) => [item.payload.label, "Rank"]}
					/>
					<Area type="stepAfter" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill="url(#lp-fill)" />
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}
```

Changes in `lp-history-tab.tsx`:
- Import `dailyLpPoints` instead of `knownTierSnapshots`.
- Replace the `charted` memo with `const days = useMemo(() => dailyLpPoints(snapshots ?? []), [snapshots]);`.
- Default the range with `useState<LpRange>("season")`.
- Replace the chart line with:

```tsx
							{days.length > 1 ? <LpChart points={days} /> : <p className="p-4 text-sm text-muted-foreground">Played on one day so far.</p>}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/lp-history/summary.test.ts && pnpm exec tsc --noEmit`
Expected: PASS; tsc exits 0.

---

### Task 5: LP changes grouped into collapsible days

**Files:**
- Modify: `src/lib/lp-history/summary.ts`, `src/lib/lp-history/summary.test.ts`
- Modify: `src/components/summoner/lp-history/lp-changes-table.tsx`

**Interfaces:**
- Consumes: `localDayKey`, `dayKeyToDate` (Task 4), `lpChangeRows`, `LpChangeRow`.
- Produces:
  - `interface LpDayGroup { day: string; latest: LpChangeRow; rows: LpChangeRow[]; delta: number | null; wins: number; losses: number }`
  - `groupChangesByDay(rows: LpChangeRow[]): LpDayGroup[]`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/lp-history/summary.test.ts` and add `groupChangesByDay` to its import. The `at` helper comes from Task 4.

```ts
describe("groupChangesByDay", () => {
	it("groups newest first with the day's net LP and W/L from running totals", () => {
		const rows = lpChangeRows([
			at("a", "2026-10-01T12:00:00.000Z", 10, 10, 10),
			at("b", "2026-10-01T13:00:00.000Z", 30, 11, 10),
			at("c", "2026-10-02T12:00:00.000Z", 50, 12, 10),
			at("d", "2026-10-02T12:30:00.000Z", 32, 12, 11),
			at("e", "2026-10-02T13:00:00.000Z", 52, 13, 11),
		]);
		const groups = groupChangesByDay(rows);
		expect(groups.map((g) => [g.day, g.latest.id, g.rows.length, g.delta, g.wins, g.losses])).toEqual([
			["2026-10-02", "e", 3, 22, 2, 1],
			["2026-10-01", "b", 2, 20, 1, 0],
		]);
	});

	it("counts gain and loss kinds when W/L is unknown", () => {
		const groups = groupChangesByDay(
			lpChangeRows([at("a", "2026-10-01T12:00:00.000Z", 10), at("b", "2026-10-01T12:30:00.000Z", 30), at("c", "2026-10-01T13:00:00.000Z", 12)]),
		);
		expect([groups[0].wins, groups[0].losses, groups[0].delta]).toEqual([1, 1, 2]);
	});

	it("has no delta for a day holding only the first snapshot", () => {
		expect(groupChangesByDay(lpChangeRows([at("a", "2026-10-01T12:00:00.000Z", 10)]))[0].delta).toBeNull();
	});

	it("never counts negative games across a season reset", () => {
		const groups = groupChangesByDay(lpChangeRows([at("a", "2026-10-01T12:00:00.000Z", 10, 80, 70), at("b", "2026-10-02T12:00:00.000Z", 30, 1, 0)]));
		expect([groups[0].wins, groups[0].losses]).toEqual([1, 0]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/lp-history/summary.test.ts`
Expected: FAIL. `groupChangesByDay is not a function`.

- [ ] **Step 3: Implement**

Append to `src/lib/lp-history/summary.ts`:

```ts
export interface LpDayGroup {
	day: string;
	latest: LpChangeRow;
	rows: LpChangeRow[];
	delta: number | null;
	wins: number;
	losses: number;
}

/** Newest-first change rows grouped by local day with net LP and W/L; W/L uses running totals when known, else gain/loss kinds. */
export function groupChangesByDay(rows: LpChangeRow[]): LpDayGroup[] {
	const groups: LpDayGroup[] = [];
	rows.forEach((row, i) => {
		const day = localDayKey(row.createdAt);
		let group = groups[groups.length - 1];
		if (!group || group.day !== day) {
			group = { day, latest: row, rows: [], delta: null, wins: 0, losses: 0 };
			groups.push(group);
		}
		group.rows.push(row);
		if (row.delta !== null) group.delta = (group.delta ?? 0) + row.delta;
		if (row.kind === "start") return;

		const older = rows[i + 1];
		const totals = older && row.wins !== null && row.losses !== null && older.wins !== null && older.losses !== null;
		const winDiff = totals ? row.wins! - older.wins! : -1;
		const lossDiff = totals ? row.losses! - older.losses! : -1;
		// Running totals drop at a season reset; fall back to the change kind then
		if (winDiff >= 0 && lossDiff >= 0) {
			group.wins += winDiff;
			group.losses += lossDiff;
		} else if (row.kind === "gain" || row.kind === "promotion") group.wins += 1;
		else if (row.kind === "loss" || row.kind === "demotion") group.losses += 1;
	});
	return groups;
}
```

Replace `src/components/summoner/lp-history/lp-changes-table.tsx` with:

```tsx
"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRankLabel } from "@/lib/rank-calculator";
import { dayKeyToDate, groupChangesByDay, type LpChangeRow } from "@/lib/lp-history/summary";

const dayLabel = (day: string) => dayKeyToDate(day).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

function Delta({ value, suffix = "" }: { value: number | null; suffix?: string }) {
	if (value === null) return <span className="text-muted-foreground">—</span>;
	const tone = value > 0 ? "text-win" : value < 0 ? "text-loss" : "text-muted-foreground";
	return (
		<span className={tone}>
			{value > 0 ? "+" : ""}
			{value}
			{suffix}
		</span>
	);
}

const kindSuffix = (row: LpChangeRow) => (row.kind === "promotion" ? " · promoted" : row.kind === "demotion" ? " · demoted" : "");

/** LP changes grouped into collapsible days, newest first; each day shows its final rank, net LP and W/L. */
export function LpChangesTable({ rows }: { rows: LpChangeRow[] }) {
	const groups = useMemo(() => groupChangesByDay(rows), [rows]);
	const [open, setOpen] = useState<Set<string>>(new Set());
	const toggle = (day: string) =>
		setOpen((prev) => {
			const next = new Set(prev);
			if (next.has(day)) next.delete(day);
			else next.add(day);
			return next;
		});

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Date</TableHead>
					<TableHead>Rank</TableHead>
					<TableHead className="text-right">LP</TableHead>
					<TableHead>Change</TableHead>
					<TableHead className="hidden text-right sm:table-cell">W/L</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{groups.map((group) => {
					const expanded = open.has(group.day);
					return (
						<Fragment key={group.day}>
							<TableRow className="bg-muted/30">
								<TableCell>
									<button
										type="button"
										onClick={() => toggle(group.day)}
										aria-expanded={expanded}
										className="flex items-center gap-1 font-medium text-foreground"
									>
										<ChevronRight className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
										{dayLabel(group.day)}
										<span className="text-xs font-normal text-muted-foreground">· {group.rows.length}</span>
									</button>
								</TableCell>
								<TableCell>{formatRankLabel(group.latest.tier, group.latest.rank)}</TableCell>
								<TableCell className="text-right">{group.latest.lp}</TableCell>
								<TableCell>
									<Delta value={group.delta} />
								</TableCell>
								<TableCell className="hidden text-right sm:table-cell">
									<span className="text-win">{group.wins}W</span> <span className="text-loss">{group.losses}L</span>
								</TableCell>
							</TableRow>
							{expanded &&
								group.rows.map((row) => (
									<TableRow key={row.id}>
										<TableCell className="pl-9 text-muted-foreground">{timeLabel(row.createdAt)}</TableCell>
										<TableCell>{formatRankLabel(row.tier, row.rank)}</TableCell>
										<TableCell className="text-right">{row.lp}</TableCell>
										<TableCell>
											<Delta value={row.kind === "start" ? null : row.delta} suffix={kindSuffix(row)} />
										</TableCell>
										<TableCell className="hidden text-right text-muted-foreground sm:table-cell">
											{row.wins !== null && row.losses !== null ? `${row.wins}/${row.losses}` : "—"}
										</TableCell>
									</TableRow>
								))}
						</Fragment>
					);
				})}
			</TableBody>
		</Table>
	);
}
```

The old `VISIBLE_ROWS = 50` cap is gone; collapsed days keep the table short.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/lp-history/summary.test.ts && pnpm exec tsc --noEmit`
Expected: PASS; tsc exits 0.

---

### Task 6: Roles & Performance from the last 50 Summoner's Rift games

**Files:**
- Modify: `src/app/api/matches/route.ts`
- Create: `src/hooks/useRiftMatches.ts`
- Modify: `src/components/summoner/overview/overview-tab.tsx`, `roles-performance-panel.tsx`

**Interfaces:**
- Consumes: `RIFT_QUEUE_IDS` (Task 1), `parseMatchCount` (`src/lib/match-query.ts`).
- Produces:
  - `/api/matches?puuid&count=50&rift=true`, which returns stored Rift matches newest first
  - `useRiftMatches(puuid: string | undefined)`
  - `useOverviewMatches` additionally returns `settled: boolean`

- [ ] **Step 1: Add the stored Rift query to the route**

In `src/app/api/matches/route.ts`, import `RIFT_QUEUE_IDS` from `@/lib/champion-stats/queue` and add below `getStoredChampionMatchIds`:

```ts
/** Stored match ids in the given queues, newest first. */
async function getStoredQueueMatchIds(puuid: string, queueIds: number[], count: number, start: number): Promise<string[]> {
	const rows = await prisma.$queryRaw<{ matchId: string }[]>`
		SELECT "matchId" FROM "Match"
		WHERE data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
			AND "queueId" = ANY(${queueIds}::int[])
		ORDER BY "gameCreation" DESC
		LIMIT ${count} OFFSET ${start}
	`;

	return rows.map((row) => row.matchId);
}
```

In `GET`, read `const rift = req.nextUrl.searchParams.get("rift") === "true";` and extend the branch:

```ts
		if (championId) {
			matchIds = await getStoredChampionMatchIds(puuid, championId, count, start);
		} else if (rift) {
			matchIds = await getStoredQueueMatchIds(puuid, RIFT_QUEUE_IDS, count, start);
		} else {
```

- [ ] **Step 2: Verify the route against the dev server**

Run (puuid from `.superpowers/sdd/2026-10-10-ui-redesign-phase-3-tabs/puuid.txt`):

```bash
P=$(cat .superpowers/sdd/2026-10-10-ui-redesign-phase-3-tabs/puuid.txt); curl -s "http://localhost:3000/api/matches?puuid=$P&count=50&rift=true" | python -c "import json,sys; m=json.load(sys.stdin); print(len(m), sorted({x['info']['queueId'] for x in m}))"
```

Expected: `50` and a queue list containing only ids from `RIFT_QUEUE_IDS`.

- [ ] **Step 3: Hook and wiring**

`src/hooks/useRiftMatches.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { type Match } from "@/lib/validators/match";

const RIFT_MATCH_COUNT = 50;

/** Last 50 stored Summoner's Rift matches (normals, ranked, Clash), newest first. */
export function useRiftMatches(puuid: string | undefined) {
	return useQuery<Match[]>({
		queryKey: ["matches", puuid, "rift"],
		queryFn: async () => {
			const params = new URLSearchParams({ puuid: puuid!, count: String(RIFT_MATCH_COUNT), rift: "true" });
			const res = await fetch(`/api/matches?${params}`);
			if (!res.ok) throw new Error("Failed to fetch matches");
			return res.json();
		},
		staleTime: 1000 * 60 * 5,
		enabled: !!puuid,
	});
}
```

In `overview-tab.tsx`, `useOverviewMatches`:
- Take `isFetched: restFetched` from the second `useMatches`.
- Return `{ matches, isLoading, settled: restFetched }` and update its return type and JSDoc to `/** First 20 matches for a fast paint, then the next 30 by offset; `settled` once both are stored. */`.

In `OverviewTab`:

```ts
	const { matches, isLoading, settled } = useOverviewMatches(puuid);
	// Read stored Rift games only after the Riot fetch has saved the newest ones
	const { data: riftMatches } = useRiftMatches(settled ? puuid : undefined);
```

```tsx
					{riftMatches ? <RolesPerformancePanel matches={riftMatches} puuid={puuid} /> : <Skeleton className="h-72" />}
```

In `roles-performance-panel.tsx`:
- Use `stats.recentTrend.map(...)` instead of `.slice(0, 20).map(...)`.
- Change the empty state title to `"No Summoner's Rift games yet"`.
- Update the JSDoc to `/** Role donut plus average KDA, CS, gold, damage and vision over the last Summoner's Rift games, one dot per game. */`.

- [ ] **Step 4: Typecheck and test**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: tsc exits 0; all tests PASS.

---

### Task 7: Verify in the browser and commit

- [ ] **Step 1: Full checks**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm exec eslint src && pnpm run build`
Expected:
- tests all PASS;
- tsc exits 0;
- eslint shows only the 5 baseline errors (`any` ×4 in the matches routes, `setState` in the live page);
- build succeeds.

- [ ] **Step 2: Browser check (Browser pane, existing dev server on :3000, Skaikru profile)**

Check each of these:
- Overview:
  - three rank cards (Solo, Flex, 5s);
  - hovering a sparkline shows a time label;
  - Roles & Performance header shows `Last 50` and 50 dots;
  - Most played opens on Ranked Solo;
  - the chips include 5s / Mayhem / Arena / Event;
  - a queue-710 game reads "Ranked 5s".
- LP History:
  - opens on Season;
  - the chart's days are evenly spaced;
  - the 5s toggle works;
  - the Changes table shows collapsed days that expand.
- The console shows no hydration errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git status --short   # confirm no .env, .superpowers/ or test_matches.json staged
git commit -m "$(cat <<'EOF'
feat(profile): Ranked 5s, more game modes and LP history polish

- Recognize Ranked 5s, ARAM Mayhem, ARAM Clash, Arena 1750, ARURF/URF,
  Brawl and co-op queues; new 5s, Mayhem, Arena and Event filter chips
- Ranked 5s card, hero pill, LP toggle, Most played option and match LP
- Rank-card sparklines show the snapshot time on hover
- Roles & Performance uses the last 50 stored Summoner's Rift games
- Most played defaults to Ranked Solo
- LP chart: one evenly spaced point per played day, Season by default
- LP changes grouped into collapsible days with net LP and W/L

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```
