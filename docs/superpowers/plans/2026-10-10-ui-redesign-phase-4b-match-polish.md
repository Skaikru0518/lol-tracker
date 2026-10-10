# UI Redesign Phase 4b — Match Detail Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the match detail page as approved in the 4b mockups, and close the deferred Phase 4 items:
- rank emblems and objective icons in the scoreboard;
- player comparison bars;
- one shared style for the timeline charts;
- skill order with ability icons;
- runes with their in-game stats;
- a kill map with a synced event list;
- a two-lane objectives timeline;
- fluid typography for large screens.

**Architecture:**
- Derived data lives in pure, tested helpers under `src/lib/match/` (timeline events, comparison rows, rune stat lines, remake) and `src/lib/` (HTTP retry, DDragon version fallback). Components only render.
- External static data is fetched client side through typed hooks:
  - the DDragon champion JSON, for ability icons;
  - the CommunityDragon `perks.json`, for rune stat templates.

  Both send `Access-Control-Allow-Origin: *`.
- The old `damage-chart`, `vision-chart`, `kill-map` and `objectives-timeline` components are replaced and deleted.

**Tech Stack:** Next.js 16.2.1, TanStack Query 5, recharts 3, Tailwind 4 tokens, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-10-ui-redesign-design.md` §3 "Match detail". The approved mockup is `.superpowers/brainstorm/214-1791637784/content/match-detail-4b.html`. The user approved sections 1 and 3–6 as they are, and section 2 with one change: the comparison panel must not leave empty space at the bottom next to the gold chart.

Decisions taken in chat on 2026-10-10:
- **Charts:** comparison bars plus one shared line style.
- **Kill map:** map plus event list with hover sync.
- **Objectives:** two-lane timeline.
- **Typography:** fluid root size, and the fixed px text sizes are removed.
- **Fixes:** 404s are not retried; a failed DDragon version request falls back to a version; remakes show as such in the scoreboard header; ranks show a placeholder while loading, not "Unranked".
- **Damage chart:** stays once, on the team level.
- **Keyboard navigation:** none; mouse and touch only.

## Global Constraints

- Package manager: `pnpm` only.
- Comments: JSDoc and single-line inline comments only.
- `<img>` for external images, shadcn components where one exists, no emoji, files around 200 lines at most.
- Colors come only from tokens (`var(--team-blue)`, `var(--team-red)`, `var(--win)`, `var(--loss)`, `var(--gold)`, `var(--primary)`, `var(--border)`, `var(--card)`, `var(--foreground)`, `var(--muted-foreground)`), with no hex or hsl literals in the touched chart code.
- No keyboard navigation or keybinding work (user rule).
- New text uses the `text-2xs` (11px at 16px root) and `text-3xs` (10px at 16px root) tokens from Task 1, never `text-[Npx]`.
- Commits: one commit at the end, after the pre-commit review.
- Verification: Browser pane in dark mode, light mode, at 375px, and at a 2560px-wide viewport for the type scale.

## Review Focus

1. **A timeline whose events lack `position` or `assistingParticipantIds`** (older matches).
   - Expected: the kill map skips the dots it cannot place, but the event list still shows the event.
   - Test: `playerFightEvents` (Task 3).
2. **Executions (killer id 0) and towers destroyed by minions.**
   - Expected: the kill is credited to the victim's enemies, and the building to the team that did not own it.
   - Test: `killTicks` / `objectiveEvents` (Task 3).
3. **A champion whose DDragon id differs from the match name** (FiddleSticks, and so on), or a missing rune in `perks.json`.
   - Expected: the skill order falls back to Q/W/E/R letters, and the rune shows without stat lines. Nothing crashes.
   - Test: `runeStatLines(undefined)` (Task 4); covered for skills by the `CHAMPION_ID_FIXES` lookup and a letter fallback (Task 7).
4. **A DDragon versions request that fails, or browser storage that throws** (private mode).
   - Expected: the page still renders, using the stored or the fallback version.
   - Test: `resolveDDragonVersion` (Task 2).
5. **A match with no objectives taken** (a remake, or an early surrender).
   - Expected: the lanes are empty, the summary reads "—", and nothing divides by zero.
   - Test: `objectiveSummary` with an empty timeline (Task 3).

---

### Task 1: Fluid typography and rem-based small text

**Files:**
- Modify: `src/app/globals.css`
- Modify: every file containing `text-[9px]`, `text-[10px]` or `text-[11px]` (21 occurrences; find them with grep)

- [ ] **Step 1: Root size and tokens**

In `src/app/globals.css`, add the two text tokens to the existing `@theme inline { ... }` block, next to the other theme variables:

```css
	--text-2xs: 0.6875rem;
	--text-2xs--line-height: 1rem;
	--text-3xs: 0.625rem;
	--text-3xs--line-height: 0.875rem;
```

In the existing `@layer base { ... }` block, add (or merge into an existing `html` rule):

```css
	html {
		/* 16px up to 1920px wide, growing to 18px at 2560px (1440p) */
		font-size: clamp(1rem, 0.625rem + 0.3125vw, 1.125rem);
	}
```

CSS only allows block comments, so this file is the one place where `/* */` is fine. The project's comment rule is about TS/TSX.

- [ ] **Step 2: Replace the fixed pixel text sizes**

```bash
grep -rlE 'text-\[(9|10|11)px\]' src | xargs sed -i -E 's/text-\[11px\]/text-2xs/g; s/text-\[(9|10)px\]/text-3xs/g'
```

- [ ] **Step 3: Verify**

Run: `grep -rnE 'text-\[[0-9]+px\]' src; pnpm exec tsc --noEmit && pnpm test`
Expected: grep prints nothing; tsc exits 0; tests PASS.

---

### Task 2: No retries on 404, and a DDragon version that cannot block the page

**Files:**
- Create: `src/lib/http-error.ts`, `src/lib/http-error.test.ts`
- Create: `src/lib/ddragon-version.ts`, `src/lib/ddragon-version.test.ts`
- Modify: `src/hooks/useMatch.ts`, `src/hooks/useTimeline.ts`, `src/hooks/useDDragonVersion.ts`

**Interfaces:**
- Produces:
  - `class HttpError extends Error { status: number }`
  - `retryUnlessNotFound(failureCount: number, error: unknown): boolean`
  - `FALLBACK_DDRAGON_VERSION`
  - `resolveDDragonVersion(fetchLatest: () => Promise<string>, storage: VersionStorage | null): Promise<string>`

- [ ] **Step 1: Write the failing tests**

`src/lib/http-error.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { HttpError, retryUnlessNotFound } from "./http-error";

describe("retryUnlessNotFound", () => {
	it("never retries a 404 or 400", () => {
		expect(retryUnlessNotFound(0, new HttpError("Match not found", 404))).toBe(false);
		expect(retryUnlessNotFound(0, new HttpError("Bad id", 400))).toBe(false);
	});

	it("retries other failures up to three times", () => {
		expect(retryUnlessNotFound(0, new HttpError("Server error", 500))).toBe(true);
		expect(retryUnlessNotFound(2, new Error("network"))).toBe(true);
		expect(retryUnlessNotFound(3, new Error("network"))).toBe(false);
	});
});
```

`src/lib/ddragon-version.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FALLBACK_DDRAGON_VERSION, resolveDDragonVersion } from "./ddragon-version";

const memory = (initial: Record<string, string> = {}) => {
	const data = { ...initial };
	return { data, getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
};

describe("resolveDDragonVersion", () => {
	it("returns and remembers the latest version", async () => {
		const storage = memory();
		expect(await resolveDDragonVersion(async () => "16.21.1", storage)).toBe("16.21.1");
		expect(storage.data["ddragon-version"]).toBe("16.21.1");
	});

	it("falls back to the remembered version when the request fails", async () => {
		const failing = async () => Promise.reject(new Error("down"));
		expect(await resolveDDragonVersion(failing, memory({ "ddragon-version": "16.19.1" }))).toBe("16.19.1");
	});

	it("falls back to the build-time version without storage", async () => {
		const failing = async () => Promise.reject(new Error("down"));
		expect(await resolveDDragonVersion(failing, null)).toBe(FALLBACK_DDRAGON_VERSION);
	});

	it("survives storage that throws", async () => {
		const broken = {
			getItem: () => {
				throw new Error("denied");
			},
			setItem: () => {
				throw new Error("denied");
			},
		};
		expect(await resolveDDragonVersion(async () => "16.21.1", broken)).toBe("16.21.1");
		expect(await resolveDDragonVersion(async () => Promise.reject(new Error("down")), broken)).toBe(FALLBACK_DDRAGON_VERSION);
	});
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test -- src/lib/http-error.test.ts src/lib/ddragon-version.test.ts`
Expected: FAIL. Both modules cannot be resolved.

- [ ] **Step 3: Implement**

`src/lib/http-error.ts`:

```ts
/** Fetch failure that keeps the HTTP status, so "not found" can be told apart from "try again". */
export class HttpError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = "HttpError";
	}
}

const NO_RETRY_STATUSES = new Set([400, 404]);
const MAX_RETRIES = 3;

/** TanStack `retry` callback: up to three retries, none for 400 or 404. */
export function retryUnlessNotFound(failureCount: number, error: unknown): boolean {
	if (error instanceof HttpError && NO_RETRY_STATUSES.has(error.status)) return false;
	return failureCount < MAX_RETRIES;
}
```

`src/lib/ddragon-version.ts`:

```ts
/** Version used when DDragon cannot be reached and none was remembered; old versions stay served. */
export const FALLBACK_DDRAGON_VERSION = "16.20.1";

const STORAGE_KEY = "ddragon-version";

export interface VersionStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

function safely<T>(fn: () => T): T | null {
	try {
		return fn();
	} catch {
		return null;
	}
}

/** Latest DDragon version; when that request fails, the last remembered one, else the fallback. Never rejects. */
export async function resolveDDragonVersion(fetchLatest: () => Promise<string>, storage: VersionStorage | null): Promise<string> {
	try {
		const version = await fetchLatest();
		safely(() => storage?.setItem(STORAGE_KEY, version));
		return version;
	} catch {
		return safely(() => storage?.getItem(STORAGE_KEY)) ?? FALLBACK_DDRAGON_VERSION;
	}
}
```

`src/hooks/useDDragonVersion.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { resolveDDragonVersion } from "@/lib/ddragon-version";
import { getDDragonVersion } from "@/lib/icon-helpers";

function browserStorage() {
	try {
		return typeof window === "undefined" ? null : window.localStorage;
	} catch {
		return null;
	}
}

/** Current DDragon version; falls back to the remembered or build-time version, so it always resolves. */
export function useDDragonVersion() {
	return useQuery<string>({
		queryKey: ["ddragon-version"],
		queryFn: () => resolveDDragonVersion(getDDragonVersion, browserStorage()),
		staleTime: 1000 * 60 * 60,
	});
}
```

In `src/hooks/useMatch.ts`:
- Import `HttpError` and `retryUnlessNotFound` from `@/lib/http-error`.
- Throw `new HttpError("Match not found", res.status)`.
- Add `retry: retryUnlessNotFound` to the query options.

Make the same change in `src/hooks/useTimeline.ts`, with the message `"Failed to fetch timeline"`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/http-error.test.ts src/lib/ddragon-version.test.ts && pnpm exec tsc --noEmit`
Expected: PASS; tsc 0.

---

### Task 3: Timeline event helpers

**Files:**
- Modify: `src/lib/validators/timeline.ts`
- Create: `src/lib/match/timeline-events.ts`, `src/lib/match/timeline-events.test.ts`

**Interfaces:**
- Produces:
  - `type Side = "blue" | "red"`
  - `sideOfParticipant(id: number): Side`
  - `type ObjectiveKind = "dragon" | "elder" | "baron" | "herald" | "grubs" | "atakhan" | "tower" | "inhibitor"`
  - `interface ObjectiveEvent { timestamp: number; side: Side; kind: ObjectiveKind; label: string; icon: string }`
  - `objectiveEvents(timeline: Timeline): ObjectiveEvent[]`
  - `interface KillTick { timestamp: number; side: Side }`
  - `killTicks(timeline: Timeline): KillTick[]`
  - `interface ObjectiveSummary { firstBlood: FirstTaken | null; firstTower: FirstTaken | null; firstDragon: FirstTaken | null; counts: Record<"dragons" | "grubs" | "barons" | "towers", Record<Side, number>> }`, where `FirstTaken = { side: Side; timestamp: number }`
  - `objectiveSummary(timeline: Timeline): ObjectiveSummary`
  - `type FightRole = "kill" | "death" | "assist"`
  - `interface FightEvent { id: string; timestamp: number; role: FightRole; otherId: number; x: number | null; y: number | null }`
  - `playerFightEvents(timeline: Timeline, participantId: number): FightEvent[]`
  - `skillLevels(timeline: Timeline, participantId: number): number[]`
  - `skillMaxOrder(levels: number[]): number[]`
  - `gameEndMs(timeline: Timeline): number`

- [ ] **Step 1: Extend the event schema**

In `timelineEventSchema` in `src/lib/validators/timeline.ts`, add:

```ts
	monsterSubType: z.string().optional(),
	assistingParticipantIds: z.array(z.number()).optional(),
```

- [ ] **Step 2: Write the failing tests**

`src/lib/match/timeline-events.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { type Timeline } from "@/lib/validators/timeline";
import {
	gameEndMs,
	killTicks,
	objectiveEvents,
	objectiveSummary,
	playerFightEvents,
	skillLevels,
	skillMaxOrder,
} from "./timeline-events";

const timeline = (events: object[], end = 1_800_000) =>
	({ info: { frames: [{ timestamp: 0, participantFrames: {}, events }, { timestamp: end, participantFrames: {}, events: [] }] } }) as unknown as Timeline;

const at = (minute: number) => minute * 60_000;

describe("objectiveEvents", () => {
	it("names dragons by type and credits the killer team", () => {
		const [dragon] = objectiveEvents(timeline([{ type: "ELITE_MONSTER_KILL", timestamp: at(8), monsterType: "DRAGON", monsterSubType: "FIRE_DRAGON", killerTeamId: 200 }]));
		expect(dragon).toMatchObject({ kind: "dragon", side: "red", label: "Infernal Dragon" });
	});

	it("treats the Elder subtype as elder", () => {
		const [elder] = objectiveEvents(timeline([{ type: "ELITE_MONSTER_KILL", timestamp: at(30), monsterType: "DRAGON", monsterSubType: "ELDER_DRAGON", killerTeamId: 100 }]));
		expect(elder.kind).toBe("elder");
	});

	it("credits a building to the team that did not own it, sorted by time", () => {
		const events = objectiveEvents(
			timeline([
				{ type: "BUILDING_KILL", timestamp: at(20), teamId: 200, buildingType: "INHIBITOR_BUILDING", laneType: "MID_LANE" },
				{ type: "BUILDING_KILL", timestamp: at(11), teamId: 100, buildingType: "TOWER_BUILDING", laneType: "BOT_LANE", towerType: "OUTER_TURRET" },
			]),
		);
		expect(events.map((e) => [e.kind, e.side, e.label])).toEqual([
			["tower", "red", "Bot T1"],
			["inhibitor", "blue", "Mid inhibitor"],
		]);
	});

	it("ignores unknown monsters", () => {
		expect(objectiveEvents(timeline([{ type: "ELITE_MONSTER_KILL", timestamp: 1, monsterType: "SCUTTLE", killerTeamId: 100 }]))).toEqual([]);
	});
});

describe("killTicks", () => {
	it("uses the killer's side, and the victim's enemies for executions", () => {
		const ticks = killTicks(
			timeline([
				{ type: "CHAMPION_KILL", timestamp: at(3), killerId: 2, victimId: 7 },
				{ type: "CHAMPION_KILL", timestamp: at(5), killerId: 0, victimId: 7 },
			]),
		);
		expect(ticks.map((t) => t.side)).toEqual(["blue", "blue"]);
	});
});

describe("objectiveSummary", () => {
	it("finds the firsts and counts per side", () => {
		const summary = objectiveSummary(
			timeline([
				{ type: "CHAMPION_KILL", timestamp: at(3), killerId: 7, victimId: 2 },
				{ type: "ELITE_MONSTER_KILL", timestamp: at(6), monsterType: "HORDE", killerTeamId: 100 },
				{ type: "ELITE_MONSTER_KILL", timestamp: at(8), monsterType: "DRAGON", monsterSubType: "AIR_DRAGON", killerTeamId: 100 },
				{ type: "BUILDING_KILL", timestamp: at(11), teamId: 100, buildingType: "TOWER_BUILDING" },
			]),
		);
		expect(summary.firstBlood).toEqual({ side: "red", timestamp: at(3) });
		expect(summary.firstDragon).toEqual({ side: "blue", timestamp: at(8) });
		expect(summary.firstTower).toEqual({ side: "red", timestamp: at(11) });
		expect(summary.counts.grubs).toEqual({ blue: 1, red: 0 });
		expect(summary.counts.towers).toEqual({ blue: 0, red: 1 });
	});

	it("is empty for a match without events", () => {
		const summary = objectiveSummary(timeline([]));
		expect([summary.firstBlood, summary.firstTower, summary.firstDragon]).toEqual([null, null, null]);
		expect(summary.counts.dragons).toEqual({ blue: 0, red: 0 });
	});
});

describe("playerFightEvents", () => {
	it("lists kills, deaths and assists with the other player and the position", () => {
		const events = playerFightEvents(
			timeline([
				{ type: "CHAMPION_KILL", timestamp: at(4), killerId: 3, victimId: 8, assistingParticipantIds: [1], position: { x: 1000, y: 2000 } },
				{ type: "CHAMPION_KILL", timestamp: at(9), killerId: 1, victimId: 9, position: { x: 5000, y: 5000 } },
				{ type: "CHAMPION_KILL", timestamp: at(14), killerId: 6, victimId: 1 },
			]),
			1,
		);
		expect(events.map((e) => [e.role, e.otherId, e.x])).toEqual([
			["assist", 8, 1000],
			["kill", 9, 5000],
			["death", 6, null],
		]);
	});
});

describe("skillLevels / skillMaxOrder", () => {
	it("reads the player's level-ups in order", () => {
		const levels = skillLevels(
			timeline([
				{ type: "SKILL_LEVEL_UP", timestamp: 1, participantId: 1, skillSlot: 1 },
				{ type: "SKILL_LEVEL_UP", timestamp: 2, participantId: 2, skillSlot: 3 },
				{ type: "SKILL_LEVEL_UP", timestamp: 3, participantId: 1, skillSlot: 3 },
			]),
			1,
		);
		expect(levels).toEqual([1, 3]);
	});

	it("orders basic skills by when they were maxed, R first", () => {
		const levels = [1, 2, 3, 1, 1, 4, 1, 3, 1, 3, 4, 3, 2, 2, 3, 4, 2, 2];
		expect(skillMaxOrder(levels)).toEqual([4, 1, 3, 2]);
	});

	it("orders unfinished skills by points", () => {
		expect(skillMaxOrder([3, 1, 3, 2, 3])).toEqual([4, 3, 1, 2]);
	});
});

describe("gameEndMs", () => {
	it("is the last frame's timestamp, at least 1", () => {
		expect(gameEndMs(timeline([], 1_500_000))).toBe(1_500_000);
		expect(gameEndMs({ info: { frames: [] } } as unknown as Timeline)).toBe(1);
	});
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test -- src/lib/match/timeline-events.test.ts`
Expected: FAIL. The module cannot be resolved.

- [ ] **Step 4: Implement**

`src/lib/match/timeline-events.ts`:

```ts
import { getBuildingIcon, getObjectiveIcon } from "@/lib/icon-helpers";
import { type Timeline } from "@/lib/validators/timeline";

export type Side = "blue" | "red";

export type ObjectiveKind = "dragon" | "elder" | "baron" | "herald" | "grubs" | "atakhan" | "tower" | "inhibitor";

export interface ObjectiveEvent {
	timestamp: number;
	side: Side;
	kind: ObjectiveKind;
	label: string;
	icon: string;
}

const MONSTER_KINDS: Record<string, ObjectiveKind> = {
	DRAGON: "dragon",
	BARON_NASHOR: "baron",
	RIFTHERALD: "herald",
	HORDE: "grubs",
	ATAKHAN: "atakhan",
};

const KIND_LABELS: Record<ObjectiveKind, string> = {
	dragon: "Dragon",
	elder: "Elder Dragon",
	baron: "Baron Nashor",
	herald: "Rift Herald",
	grubs: "Void Grub",
	atakhan: "Atakhan",
	tower: "Tower",
	inhibitor: "Inhibitor",
};

const DRAGON_NAMES: Record<string, string> = {
	FIRE_DRAGON: "Infernal",
	WATER_DRAGON: "Ocean",
	EARTH_DRAGON: "Mountain",
	AIR_DRAGON: "Cloud",
	HEXTECH_DRAGON: "Hextech",
	CHEMTECH_DRAGON: "Chemtech",
};

const LANES: Record<string, string> = { TOP_LANE: "Top", MID_LANE: "Mid", BOT_LANE: "Bot" };
const TOWERS: Record<string, string> = { OUTER_TURRET: "T1", INNER_TURRET: "T2", BASE_TURRET: "T3", NEXUS_TURRET: "Nexus" };

/** Blue for participants 1-5, red for 6-10. */
export const sideOfParticipant = (id: number): Side => (id <= 5 ? "blue" : "red");
const enemy = (side: Side): Side => (side === "blue" ? "red" : "blue");
const allEvents = (timeline: Timeline) => timeline.info.frames.flatMap((frame) => frame.events);

/** Timestamp of the last frame, at least 1 so it can divide. */
export function gameEndMs(timeline: Timeline): number {
	return Math.max(timeline.info.frames.at(-1)?.timestamp ?? 0, 1);
}

/** Elite monsters and buildings in time order; a building counts for the team that destroyed it. */
export function objectiveEvents(timeline: Timeline): ObjectiveEvent[] {
	const out: ObjectiveEvent[] = [];
	for (const e of allEvents(timeline)) {
		if (e.type === "ELITE_MONSTER_KILL" && e.monsterType) {
			const base = MONSTER_KINDS[e.monsterType];
			if (!base) continue;
			const kind: ObjectiveKind = base === "dragon" && e.monsterSubType === "ELDER_DRAGON" ? "elder" : base;
			const dragonName = kind === "dragon" ? DRAGON_NAMES[e.monsterSubType ?? ""] : undefined;
			out.push({
				timestamp: e.timestamp,
				side: e.killerTeamId === 200 ? "red" : "blue",
				kind,
				label: dragonName ? `${dragonName} Dragon` : KIND_LABELS[kind],
				icon: getObjectiveIcon(kind === "elder" ? "ELDER_DRAGON" : e.monsterType),
			});
		} else if (e.type === "BUILDING_KILL") {
			const inhibitor = e.buildingType === "INHIBITOR_BUILDING";
			const lane = LANES[e.laneType ?? ""] ?? "";
			const name = inhibitor ? "inhibitor" : (TOWERS[e.towerType ?? ""] ?? "tower");
			out.push({
				timestamp: e.timestamp,
				side: e.teamId === 100 ? "red" : "blue",
				kind: inhibitor ? "inhibitor" : "tower",
				label: `${lane} ${name}`.trim(),
				icon: getBuildingIcon(e.buildingType ?? "TOWER_BUILDING"),
			});
		}
	}
	return out.sort((a, b) => a.timestamp - b.timestamp);
}

export interface KillTick {
	timestamp: number;
	side: Side;
}

/** Champion kills by the killer's side; executions (killer 0) count for the victim's enemies. */
export function killTicks(timeline: Timeline): KillTick[] {
	return allEvents(timeline)
		.filter((e) => e.type === "CHAMPION_KILL" && e.victimId)
		.map((e) => ({
			timestamp: e.timestamp,
			side: e.killerId ? sideOfParticipant(e.killerId) : enemy(sideOfParticipant(e.victimId!)),
		}));
}

export interface FirstTaken {
	side: Side;
	timestamp: number;
}

export interface ObjectiveSummary {
	firstBlood: FirstTaken | null;
	firstTower: FirstTaken | null;
	firstDragon: FirstTaken | null;
	counts: Record<"dragons" | "grubs" | "barons" | "towers", Record<Side, number>>;
}

/** First blood, first tower and first dragon, plus dragon, grub, baron and tower counts per side. */
export function objectiveSummary(timeline: Timeline): ObjectiveSummary {
	const objectives = objectiveEvents(timeline);
	const first = (kinds: ObjectiveKind[]) => {
		const hit = objectives.find((o) => kinds.includes(o.kind));
		return hit ? { side: hit.side, timestamp: hit.timestamp } : null;
	};
	const count = (kinds: ObjectiveKind[]) => {
		const result = { blue: 0, red: 0 };
		for (const o of objectives) if (kinds.includes(o.kind)) result[o.side]++;
		return result;
	};
	const blood = killTicks(timeline)[0];
	return {
		firstBlood: blood ? { side: blood.side, timestamp: blood.timestamp } : null,
		firstTower: first(["tower"]),
		firstDragon: first(["dragon", "elder"]),
		counts: { dragons: count(["dragon", "elder"]), grubs: count(["grubs"]), barons: count(["baron"]), towers: count(["tower"]) },
	};
}

export type FightRole = "kill" | "death" | "assist";

export interface FightEvent {
	id: string;
	timestamp: number;
	role: FightRole;
	otherId: number;
	x: number | null;
	y: number | null;
}

/** The player's kills, deaths and assists in time order; `otherId` is the victim, or the killer for deaths (0 = execution). */
export function playerFightEvents(timeline: Timeline, participantId: number): FightEvent[] {
	const out: FightEvent[] = [];
	allEvents(timeline).forEach((e, index) => {
		if (e.type !== "CHAMPION_KILL" || !e.victimId) return;
		let role: FightRole | null = null;
		if (e.killerId === participantId) role = "kill";
		else if (e.victimId === participantId) role = "death";
		else if (e.assistingParticipantIds?.includes(participantId)) role = "assist";
		if (!role) return;
		out.push({
			id: `${e.timestamp}-${index}`,
			timestamp: e.timestamp,
			role,
			otherId: role === "death" ? (e.killerId ?? 0) : e.victimId,
			x: e.position?.x ?? null,
			y: e.position?.y ?? null,
		});
	});
	return out;
}

/** Skill slot (1 Q, 2 W, 3 E, 4 R) of each point the player spent, in order. */
export function skillLevels(timeline: Timeline, participantId: number): number[] {
	return allEvents(timeline)
		.filter((e) => e.type === "SKILL_LEVEL_UP" && e.participantId === participantId && e.skillSlot && e.skillSlot <= 4)
		.map((e) => e.skillSlot!);
}

const BASIC_SLOTS = [1, 2, 3];
const MAX_POINTS = 5;

/** R first, then basic skills in the order they hit five points; unfinished ones by points spent. */
export function skillMaxOrder(levels: number[]): number[] {
	const points: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
	const maxed: number[] = [];
	for (const slot of levels) {
		if (!BASIC_SLOTS.includes(slot)) continue;
		points[slot]++;
		if (points[slot] === MAX_POINTS) maxed.push(slot);
	}
	const rest = BASIC_SLOTS.filter((s) => !maxed.includes(s)).sort((a, b) => points[b] - points[a] || a - b);
	return [4, ...maxed, ...rest];
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- src/lib/match/timeline-events.test.ts && pnpm exec tsc --noEmit`
Expected: PASS; tsc 0.

---

### Task 4: Comparison, rune and remake helpers

**Files:**
- Create: `src/lib/match/comparison.ts`, `src/lib/match/comparison.test.ts`
- Create: `src/lib/match/runes.ts`, `src/lib/match/runes.test.ts`
- Create: `src/lib/match/remake.ts`
- Modify: `src/lib/match/detail.ts` (use `isRemake`)
- Modify: `src/lib/summoner/scoreboard.ts`, `src/lib/summoner/scoreboard.test.ts`

**Interfaces:**
- Produces:
  - `type ComparisonMetric = "damage" | "gold" | "vision" | "cs" | "taken"`
  - `COMPARISON_METRICS: { id: ComparisonMetric; label: string }[]`
  - `interface ComparisonEntry { puuid: string; championName: string; value: number }`
  - `comparisonRows(data: ScoreboardData, metric: ComparisonMetric): { blue: ComparisonEntry[]; red: ComparisonEntry[]; max: number }`
  - `interface PerkInfo { id: number; name: string; shortDesc: string; endOfGameStatDescs: string[] }`
  - `plainText(html: string): string`
  - `runeStatLines(perk: PerkInfo | undefined, vars: [number, number, number]): string[]`
  - `isRemake(durationSeconds: number): boolean`
  - `ScoreboardData` gains `remake: boolean`

- [ ] **Step 1: Write the failing tests**

`src/lib/match/comparison.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeMatch, makeParticipant } from "@/test/factories";
import { buildScoreboard } from "@/lib/summoner/scoreboard";
import { comparisonRows } from "./comparison";

const match = makeMatch({
	participants: [
		makeParticipant({ puuid: "a", teamId: 100, teamPosition: "TOP", totalDamageDealtToChampions: 20000, visionScore: 12 }),
		makeParticipant({ puuid: "b", teamId: 100, teamPosition: "JUNGLE", totalDamageDealtToChampions: 10000, visionScore: 30 }),
		makeParticipant({ puuid: "c", teamId: 200, teamPosition: "TOP", win: false, totalDamageDealtToChampions: 25000, visionScore: 8 }),
	],
});

describe("comparisonRows", () => {
	it("keeps scoreboard order and scales to the largest value", () => {
		const rows = comparisonRows(buildScoreboard(match), "damage");
		expect(rows.blue.map((e) => [e.puuid, e.value])).toEqual([
			["a", 20000],
			["b", 10000],
		]);
		expect(rows.red.map((e) => e.puuid)).toEqual(["c"]);
		expect(rows.max).toBe(25000);
	});

	it("switches metric", () => {
		expect(comparisonRows(buildScoreboard(match), "vision").max).toBe(30);
	});

	it("never scales by zero", () => {
		const empty = makeMatch({ participants: [makeParticipant({ puuid: "x", teamId: 100, visionScore: 0 })] });
		expect(comparisonRows(buildScoreboard(empty), "vision").max).toBe(1);
	});
});
```

`src/lib/match/runes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { plainText, runeStatLines } from "./runes";

const pta = { id: 8005, name: "Press the Attack", shortDesc: "", endOfGameStatDescs: ["Total Damage: @eogvar1@", "Bonus Damage: @eogvar2@"] };

describe("runeStatLines", () => {
	it("fills the end-of-game templates with the match values", () => {
		expect(runeStatLines(pta, [1842, 624, 0])).toEqual(["Total Damage: 1,842", "Bonus Damage: 624"]);
	});

	it("joins adjacent variables like the boots timer", () => {
		const boots = { ...pta, endOfGameStatDescs: ["Boots Arrival Time: @eogvar1@:@eogvar2@@eogvar3@"] };
		expect(runeStatLines(boots, [10, 0, 5])).toEqual(["Boots Arrival Time: 10:05"]);
	});

	it("is empty for an unknown rune", () => {
		expect(runeStatLines(undefined, [1, 2, 3])).toEqual([]);
	});
});

describe("plainText", () => {
	it("strips markup and collapses whitespace", () => {
		expect(plainText("Deal <b>more</b> damage.<br><br>Then   <i>heal</i>.")).toBe("Deal more damage. Then heal.");
	});
});
```

In `src/lib/summoner/scoreboard.test.ts`, add inside the existing `describe` for `buildScoreboard` (reuse its existing match fixture style):

```ts
	it("flags games under five minutes as remakes", () => {
		expect(buildScoreboard(makeMatch({ gameDuration: 240 })).remake).toBe(true);
		expect(buildScoreboard(makeMatch({ gameDuration: 1800 })).remake).toBe(false);
	});
```

(Import `makeMatch` from `@/test/factories` if the file does not already.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/lib/match/comparison.test.ts src/lib/match/runes.test.ts src/lib/summoner/scoreboard.test.ts`
Expected: FAIL. The modules are missing, and `remake` is undefined.

- [ ] **Step 3: Implement**

`src/lib/match/remake.ts`:

```ts
const REMAKE_SECONDS = 300;

/** Games shorter than five minutes are remakes. */
export function isRemake(durationSeconds: number): boolean {
	return durationSeconds < REMAKE_SECONDS;
}
```

In `src/lib/match/detail.ts`:
- Remove `REMAKE_SECONDS` and import `isRemake` from `./remake`.
- In `matchResult`, use `if (isRemake(match.info.gameDuration)) return "Remake";`.

In `src/lib/summoner/scoreboard.ts`:
- Add `remake: boolean;` to `ScoreboardData`.
- Import `isRemake` from `@/lib/match/remake`.
- Add `remake: isRemake(match.info.gameDuration),` to the object `buildScoreboard` returns.

`src/lib/match/comparison.ts`:

```ts
import { type ScoreboardData } from "@/lib/summoner/scoreboard";
import { type Participant } from "@/lib/validators/match";

export type ComparisonMetric = "damage" | "gold" | "vision" | "cs" | "taken";

export const COMPARISON_METRICS: { id: ComparisonMetric; label: string }[] = [
	{ id: "damage", label: "Damage" },
	{ id: "gold", label: "Gold" },
	{ id: "vision", label: "Vision" },
	{ id: "cs", label: "CS" },
	{ id: "taken", label: "Taken" },
];

const VALUE: Record<ComparisonMetric, (p: Participant) => number> = {
	damage: (p) => p.totalDamageDealtToChampions,
	gold: (p) => p.goldEarned,
	vision: (p) => p.visionScore,
	cs: (p) => p.totalMinionsKilled + p.neutralMinionsKilled,
	taken: (p) => p.totalDamageTaken,
};

export interface ComparisonEntry {
	puuid: string;
	championName: string;
	value: number;
}

/** Both teams' values for one metric in scoreboard order, with the largest value (at least 1) to scale bars by. */
export function comparisonRows(data: ScoreboardData, metric: ComparisonMetric): { blue: ComparisonEntry[]; red: ComparisonEntry[]; max: number } {
	const entry = (p: Participant): ComparisonEntry => ({ puuid: p.puuid, championName: p.championName, value: VALUE[metric](p) });
	const blue = data.rows.flatMap((r) => (r.blue ? [entry(r.blue)] : []));
	const red = data.rows.flatMap((r) => (r.red ? [entry(r.red)] : []));
	const max = Math.max(1, ...blue.map((e) => e.value), ...red.map((e) => e.value));
	return { blue, red, max };
}
```

`src/lib/match/runes.ts`:

```ts
export interface PerkInfo {
	id: number;
	name: string;
	shortDesc: string;
	endOfGameStatDescs: string[];
}

/** Rune text without markup: tags removed, line breaks as spaces, whitespace collapsed. */
export function plainText(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, " ")
		.replace(/<[^>]+>/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

/** A rune's end-of-game stat lines with `@eogvarN@` replaced by the match values. */
export function runeStatLines(perk: PerkInfo | undefined, vars: [number, number, number]): string[] {
	if (!perk) return [];
	return perk.endOfGameStatDescs.map((line) =>
		plainText(line.replace(/@eogvar([123])@/g, (_, n: string) => vars[Number(n) - 1].toLocaleString("en-US"))),
	);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test && pnpm exec tsc --noEmit`
Expected: PASS; tsc 0.

---

### Task 5: Scoreboard — rank emblems, loading ranks, objective icons, remake label

**Files:**
- Modify:
  - `src/components/shared/scoreboard/scoreboard-row.tsx`
  - `src/components/shared/scoreboard/team-header.tsx`
  - `src/components/shared/scoreboard/mirrored-scoreboard.tsx`
  - `src/components/summoner/matches/match-row-expanded.tsx`
  - `src/components/match/match-detail.tsx`

**Interfaces:**
- Consumes: `ScoreboardData.remake` (Task 4).
- Produces: `MirroredScoreboard` and `ScoreboardRow` accept `ranksLoading?: boolean`, and `TeamHeader` accepts `remake: boolean`.

- [ ] **Step 1: Row**

In `scoreboard-row.tsx`:
- Import `RankEmblem` from `@/components/ui/rank-emblem` and `Skeleton` from `@/components/ui/skeleton`.
- Add the prop `ranksLoading?: boolean`.
- Before `<ChampionIcon …/>`, insert:

```tsx
			{ranksLoading ? (
				<Skeleton className="size-5 shrink-0 rounded-full" />
			) : (
				<span title={rank ? `${formatRankLabel(rank.tier, rank.rank)} · ${rank.leaguePoints} LP` : "Unranked"} className="shrink-0">
					<RankEmblem tier={rank?.tier} size={20} />
				</span>
			)}
```

Replace the rank text span's content with:

```tsx
					{ranksLoading ? <Skeleton className="mt-0.5 h-2.5 w-14" /> : rank ? formatRankLabel(rank.tier, rank.rank) : "Unranked"}
```

Change that span from `<span className="block …">` to a `<div className="block …">`, because a Skeleton is a div.

- [ ] **Step 2: Header**

Replace `src/components/shared/scoreboard/team-header.tsx` with:

```tsx
import { cn } from "@/lib/utils";
import { getBuildingIcon, getObjectiveIcon } from "@/lib/icon-helpers";
import { type TeamObjectives, type TeamSummary } from "@/lib/summoner/scoreboard";

const OBJECTIVES: { key: keyof TeamObjectives; label: string; icon: string }[] = [
	{ key: "towers", label: "Towers", icon: getBuildingIcon("TOWER_BUILDING") },
	{ key: "dragons", label: "Dragons", icon: getObjectiveIcon("DRAGON") },
	{ key: "barons", label: "Barons", icon: getObjectiveIcon("BARON_NASHOR") },
	{ key: "heralds", label: "Rift Heralds", icon: getObjectiveIcon("RIFTHERALD") },
	{ key: "grubs", label: "Void Grubs", icon: getObjectiveIcon("HORDE") },
];

/** Team label, result (or Remake), K/D/A and objective icons with counts for one side of the scoreboard. */
export function TeamHeader({ team, side, remake }: { team: TeamSummary; side: "blue" | "red"; remake: boolean }) {
	return (
		<div className={cn("flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs", side === "red" && "flex-row-reverse text-right")}>
			<span className={cn("font-bold", side === "blue" ? "text-team-blue" : "text-team-red")}>{side.toUpperCase()}</span>
			<span className={cn("font-semibold", remake ? "text-muted-foreground" : team.win ? "text-win" : "text-loss")}>
				{remake ? "Remake" : team.win ? "Victory" : "Defeat"}
			</span>
			<span className="text-foreground">
				{team.kills}/{team.deaths}/{team.assists}
			</span>
			<span className="flex items-center gap-2 text-muted-foreground">
				{OBJECTIVES.map((o) => (
					<span key={o.key} title={o.label} className="flex items-center gap-0.5">
						<img src={o.icon} alt={o.label} width={14} height={14} className="size-3.5 opacity-80" />
						{team.objectives[o.key]}
					</span>
				))}
			</span>
		</div>
	);
}
```

- [ ] **Step 3: Pass-through and callers**

In `mirrored-scoreboard.tsx`:
- Add `ranksLoading?: boolean` to the props and destructuring.
- Pass `ranksLoading={ranksLoading}` to both `ScoreboardRow` lists.
- Pass `remake={data.remake}` to both `TeamHeader`s.

In `match-row-expanded.tsx`, take `isLoading: ranksLoading` from `usePlayerRanks(puuids)` and pass `ranksLoading={ranksLoading}` to `MirroredScoreboard`.

In `match-detail.tsx`, take `isLoading: ranksLoading` from `usePlayerRanks(puuids)` and pass it the same way.

- [ ] **Step 4: Typecheck and tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: tsc 0; PASS.

---

### Task 6: Charts — comparison bars and the shared line style

**Files:**
- Create: `src/components/match/charts/chart-theme.ts`
- Create: `src/components/match/charts/comparison-bars.tsx`
- Rewrite: `src/components/match/gold-chart.tsx`
- Modify: `src/components/match/kill-timeline.tsx`, `src/components/match/cs-gold-chart.tsx` (tokens)
- Modify: `src/components/match/team-charts.tsx`, `src/components/match/player-tabs/vision-tab.tsx`
- Delete: `src/components/match/damage-chart.tsx`, `src/components/match/vision-chart.tsx`

**Interfaces:**
- Consumes: `comparisonRows`, `COMPARISON_METRICS` (Task 4); `objectiveEvents`, `gameEndMs` (Task 3).
- Produces: `ComparisonBars({ match, version, defaultMetric?, title? })`; `GoldChart({ timeline })` keeps its default export.

- [ ] **Step 1: Theme constants**

`src/components/match/charts/chart-theme.ts`:

```ts
/** Shared recharts props so every match chart uses the same tokens. */
export const AXIS = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;

export const GRID = { stroke: "var(--border)", strokeDasharray: "3 3", vertical: false } as const;

export const TOOLTIP_STYLE = {
	contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--foreground)" },
	labelStyle: { color: "var(--muted-foreground)" },
	cursor: { stroke: "var(--border)" },
} as const;

export const TEAM_COLOR = { blue: "var(--team-blue)", red: "var(--team-red)" } as const;
```

- [ ] **Step 2: Comparison bars (equal height with the gold chart)**

`src/components/match/charts/comparison-bars.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { formatThousands } from "@/lib/format";
import { COMPARISON_METRICS, type ComparisonEntry, type ComparisonMetric, comparisonRows } from "@/lib/match/comparison";
import { buildScoreboard } from "@/lib/summoner/scoreboard";
import { type Match } from "@/lib/validators/match";
import { TEAM_COLOR } from "./chart-theme";

function BarColumn({ entries, max, side, version }: { entries: ComparisonEntry[]; max: number; side: "blue" | "red"; version: string }) {
	return (
		<ul className="flex h-full flex-col justify-around gap-2">
			{entries.map((e) => (
				<li key={e.puuid} className={cn("flex items-center gap-2", side === "blue" && "flex-row-reverse")}>
					<ChampionIcon version={version} championName={e.championName} size={22} />
					<div className={cn("flex h-2.5 flex-1 overflow-hidden rounded-full bg-muted", side === "blue" && "justify-end")}>
						<div className="h-full rounded-full" style={{ width: `${(e.value / max) * 100}%`, background: TEAM_COLOR[side] }} />
					</div>
					<span className={cn("w-11 text-xs tabular-nums text-foreground", side === "blue" ? "text-left" : "text-right")}>
						{formatThousands(e.value)}
					</span>
				</li>
			))}
		</ul>
	);
}

/** Both teams' players side by side for one metric, blue mirrored left; the body stretches to the row height. */
export function ComparisonBars({
	match,
	version,
	defaultMetric = "damage",
	title = "Players",
}: {
	match: Match;
	version: string;
	defaultMetric?: ComparisonMetric;
	title?: string;
}) {
	const [metric, setMetric] = useState<ComparisonMetric>(defaultMetric);
	const data = useMemo(() => buildScoreboard(match), [match]);
	const { blue, red, max } = useMemo(() => comparisonRows(data, metric), [data, metric]);

	return (
		<Panel className="flex h-full flex-col">
			<PanelHeader
				title={title}
				actions={
					<div className="flex gap-1 overflow-x-auto">
						{COMPARISON_METRICS.map((m) => (
							<button
								key={m.id}
								type="button"
								onClick={() => setMetric(m.id)}
								aria-pressed={m.id === metric}
								className={cn(
									"h-6 rounded-md border px-2 text-xs font-medium transition-colors",
									m.id === metric ? "border-primary/50 bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
								)}
							>
								{m.label}
							</button>
						))}
					</div>
				}
			/>
			<div className="grid flex-1 grid-cols-2 gap-x-5 p-4">
				<BarColumn entries={blue} max={max} side="blue" version={version} />
				<BarColumn entries={red} max={max} side="red" version={version} />
			</div>
		</Panel>
	);
}
```

The `TeamCharts` grid stretches both cells to the taller one, and `h-full flex-col` plus `flex-1` and `justify-around` spread the bars over that height. That covers the user's "no empty space at the bottom" note.

- [ ] **Step 3: Gold chart rewrite**

Replace `src/components/match/gold-chart.tsx` with:

```tsx
"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { formatThousands } from "@/lib/format";
import { objectiveEvents } from "@/lib/match/timeline-events";
import { type Timeline } from "@/lib/validators/timeline";
import { AXIS, GRID, TEAM_COLOR, TOOLTIP_STYLE } from "./charts/chart-theme";

const MARKER_KINDS = new Set(["dragon", "elder", "baron", "herald", "grubs", "atakhan"]);

/** Blue minus red team gold per minute, split-coloured around zero, with monster objectives marked under the axis. */
export default function GoldChart({ timeline }: { timeline?: Timeline }) {
	const data = useMemo(
		() =>
			(timeline?.info.frames ?? []).map((frame) => {
				let diff = 0;
				for (const pf of Object.values(frame.participantFrames)) diff += pf.participantId <= 5 ? pf.totalGold : -pf.totalGold;
				return { minute: frame.timestamp / 60000, diff };
			}),
		[timeline],
	);
	const markers = useMemo(() => (timeline ? objectiveEvents(timeline).filter((o) => MARKER_KINDS.has(o.kind)) : []), [timeline]);

	if (!timeline || data.length === 0) return null;
	const peak = Math.max(1000, ...data.map((d) => Math.abs(d.diff)));
	const bound = Math.ceil(peak / 1000) * 1000;
	const last = data[data.length - 1].diff;

	return (
		<Panel className="flex h-full flex-col">
			<PanelHeader
				title="Team gold advantage"
				actions={
					<span className="text-xs text-muted-foreground">
						{last === 0 ? "Even" : `${last > 0 ? "Blue" : "Red"} +${formatThousands(Math.abs(last))}`}
					</span>
				}
			/>
			<PanelBody className="flex-1">
				<div className="h-60">
					<ResponsiveContainer width="100%" height="100%">
						<AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 22 }}>
							<defs>
								<linearGradient id="gold-split" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor={TEAM_COLOR.blue} stopOpacity={0.45} />
									<stop offset="50%" stopColor={TEAM_COLOR.blue} stopOpacity={0.05} />
									<stop offset="50%" stopColor={TEAM_COLOR.red} stopOpacity={0.05} />
									<stop offset="100%" stopColor={TEAM_COLOR.red} stopOpacity={0.45} />
								</linearGradient>
							</defs>
							<CartesianGrid {...GRID} />
							<XAxis dataKey="minute" type="number" domain={[0, "dataMax"]} tickFormatter={(m: number) => `${Math.round(m)}m`} {...AXIS} />
							<YAxis domain={[-bound, bound]} tickFormatter={(v: number) => (v === 0 ? "0" : `${v > 0 ? "+" : "-"}${Math.abs(v) / 1000}k`)} width={40} {...AXIS} />
							<ReferenceLine y={0} stroke="var(--border)" />
							<Tooltip
								{...TOOLTIP_STYLE}
								labelFormatter={(m) => `${Math.round(Number(m))} min`}
								formatter={(value) => {
									const v = Number(value);
									return [v === 0 ? "Even" : `${v > 0 ? "Blue" : "Red"} +${formatThousands(Math.abs(v))}`, "Gold"];
								}}
							/>
							<Area type="monotone" dataKey="diff" stroke="var(--foreground)" strokeWidth={1.5} fill="url(#gold-split)" baseValue={0} />
							{markers.map((o, i) => (
								<ReferenceDot
									key={`${o.timestamp}-${i}`}
									x={o.timestamp / 60000}
									y={-bound}
									r={0}
									ifOverflow="visible"
									shape={(props: { cx?: number; cy?: number }) => (
										<g>
											<title>{o.label}</title>
											<circle cx={props.cx} cy={(props.cy ?? 0) + 14} r={9} fill="var(--card)" stroke={TEAM_COLOR[o.side]} strokeWidth={1.5} />
											<image href={o.icon} x={(props.cx ?? 0) - 6} y={(props.cy ?? 0) + 8} width={12} height={12} />
										</g>
									)}
								/>
							))}
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</PanelBody>
		</Panel>
	);
}
```

The `chart-theme.ts` import path is relative to `src/components/match/`, so it is `./charts/chart-theme`. If recharts 3 types reject the `shape` function signature, type the parameter as `any`-free `Record<string, unknown>` and read `cx`/`cy` with `Number()`.

- [ ] **Step 4: Tokens in the kept line charts**

```bash
for f in src/components/match/kill-timeline.tsx src/components/match/cs-gold-chart.tsx; do
  sed -i 's/"#3b82f6"/"var(--team-blue)"/g; s/"#ef4444"/"var(--team-red)"/g; s/"hsl(220 15% 30%)"/"var(--muted-foreground)"/g; s/"hsl(220 15% 60%)"/"var(--muted-foreground)"/g; s/"hsl(220 20% 12%)"/"var(--card)"/g' "$f"
done
grep -nE '"#[0-9a-fA-F]{3,8}"|hsl\(' src/components/match/kill-timeline.tsx src/components/match/cs-gold-chart.tsx src/components/match/gold-chart.tsx
```

Expected: the grep prints nothing. If anything is left, such as a Tailwind arbitrary class like `bg-[hsl(...)]`, swap it for the matching token class (`bg-card`, `border-border`, `text-muted-foreground`).

- [ ] **Step 5: Wire, then delete the replaced charts**

`src/components/match/team-charts.tsx`:
- Replace the `DamageChart` import and element with `import { ComparisonBars } from "@/components/match/charts/comparison-bars";` and `<ComparisonBars match={match} version={version} />`.
- Add `version: string` to the props. `MatchDetail` passes `version={version}`.

`vision-tab.tsx`:
- Replace `VisionChart` with `<ComparisonBars match={match} version={version} defaultMetric="vision" title="Vision" />`.
- Destructure `version` from the props.

```bash
git rm src/components/match/damage-chart.tsx src/components/match/vision-chart.tsx
```

- [ ] **Step 6: Typecheck and tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: tsc 0; PASS.

---

### Task 7: Skill order with ability icons, and runes with in-game stats

**Files:**
- Modify: `src/lib/icon-helpers.ts` (`getSpellIcon`, `ddragonChampionId`)
- Create: `src/hooks/useChampionSpells.ts`, `src/hooks/usePerks.ts`
- Rewrite: `src/components/match/skill-order.tsx`
- Modify: `src/components/match/player-tabs/rune-page.tsx`, `src/components/match/player-tabs/overview-tab.tsx`

**Interfaces:**
- Consumes: `skillLevels`, `skillMaxOrder` (Task 3); `PerkInfo`, `runeStatLines`, `plainText` (Task 4); `retryUnlessNotFound` and `HttpError` (Task 2).
- Produces:
  - `getSpellIcon(version: string, file: string): string`
  - `ddragonChampionId(championName: string): string`
  - `useChampionSpells(version?: string, championName?: string)`, which returns `{ spells: string[] }`, the image files for Q/W/E/R
  - `usePerks()`, which returns `Map<number, PerkInfo>`
  - `SkillOrder({ timeline, participantId, version, championName })` (default export)
  - `RunePage({ player, runeData, perks })`

- [ ] **Step 1: Icon helpers**

In `src/lib/icon-helpers.ts`, below `getChampionIcon`, add:

```ts
/** Data Dragon champion id for a match `championName` (e.g. FiddleSticks → Fiddlesticks). */
export function ddragonChampionId(championName: string): string {
	return CHAMPION_ID_FIXES[championName] ?? championName;
}

/** Data Dragon ability icon from a champion JSON `image.full` file name. */
export function getSpellIcon(version: string, file: string) {
	return `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${file}`;
}
```

- [ ] **Step 2: Hooks**

`src/hooks/useChampionSpells.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { HttpError, retryUnlessNotFound } from "@/lib/http-error";
import { ddragonChampionId } from "@/lib/icon-helpers";

interface ChampionJson {
	data: Record<string, { spells: { image: { full: string } }[] }>;
}

async function fetchSpells(version: string, championName: string): Promise<{ spells: string[] }> {
	const id = ddragonChampionId(championName);
	const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion/${id}.json`);
	if (!res.ok) throw new HttpError("Champion data unavailable", res.status);
	const json = (await res.json()) as ChampionJson;
	const champion = json.data[id] ?? Object.values(json.data)[0];
	return { spells: champion.spells.map((s) => s.image.full) };
}

/** Q, W, E and R icon file names of one champion from Data Dragon. */
export function useChampionSpells(version: string | undefined, championName: string | undefined) {
	return useQuery({
		queryKey: ["champion-spells", version, championName],
		queryFn: () => fetchSpells(version!, championName!),
		staleTime: Infinity,
		enabled: !!version && !!championName,
		retry: retryUnlessNotFound,
	});
}
```

`src/hooks/usePerks.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { HttpError, retryUnlessNotFound } from "@/lib/http-error";
import { type PerkInfo } from "@/lib/match/runes";

const PERKS_URL = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perks.json";

interface RawPerk {
	id: number;
	name: string;
	shortDesc?: string;
	endOfGameStatDescs?: string[];
}

async function fetchPerks(): Promise<Map<number, PerkInfo>> {
	const res = await fetch(PERKS_URL);
	if (!res.ok) throw new HttpError("Rune data unavailable", res.status);
	const raw = (await res.json()) as RawPerk[];
	return new Map(raw.map((p) => [p.id, { id: p.id, name: p.name, shortDesc: p.shortDesc ?? "", endOfGameStatDescs: p.endOfGameStatDescs ?? [] }]));
}

/** Every rune and stat shard by id, with its short description and end-of-game stat templates (CommunityDragon). */
export function usePerks() {
	return useQuery({ queryKey: ["perks"], queryFn: fetchPerks, staleTime: Infinity, retry: retryUnlessNotFound });
}
```

- [ ] **Step 3: Skill order**

Replace `src/components/match/skill-order.tsx` with:

```tsx
"use client";

import { Fragment, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useChampionSpells } from "@/hooks/useChampionSpells";
import { getSpellIcon } from "@/lib/icon-helpers";
import { skillLevels, skillMaxOrder } from "@/lib/match/timeline-events";
import { type Timeline } from "@/lib/validators/timeline";

const KEYS = ["Q", "W", "E", "R"];
const LEVELS = 18;

/** Ability icons per row with the level each point went in, and the max order (R first) above. Letters stand in until icons load. */
export default function SkillOrder({
	timeline,
	participantId,
	version,
	championName,
}: {
	timeline?: Timeline;
	participantId: number;
	version: string;
	championName: string;
}) {
	const levels = useMemo(() => (timeline ? skillLevels(timeline, participantId) : []), [timeline, participantId]);
	const order = useMemo(() => skillMaxOrder(levels), [levels]);
	const { data } = useChampionSpells(version, championName);

	if (levels.length === 0) return <p className="text-sm text-muted-foreground">No skill data.</p>;

	const icon = (slot: number) => {
		const file = data?.spells[slot - 1];
		return file ? (
			<img src={getSpellIcon(version, file)} alt={KEYS[slot - 1]} title={KEYS[slot - 1]} width={24} height={24} className="size-6 rounded" />
		) : (
			<span className="grid size-6 place-items-center rounded bg-muted text-xs font-bold text-foreground">{KEYS[slot - 1]}</span>
		);
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
				Max:
				{order.map((slot, i) => (
					<Fragment key={slot}>
						{i > 0 && <span>&rsaquo;</span>}
						{icon(slot)}
					</Fragment>
				))}
			</div>
			<div className="overflow-x-auto">
				<div className="grid min-w-[30rem] gap-1" style={{ gridTemplateColumns: `1.75rem repeat(${LEVELS}, minmax(0, 1fr))` }}>
					{[1, 2, 3, 4].map((slot) => (
						<Fragment key={slot}>
							{icon(slot)}
							{Array.from({ length: LEVELS }, (_, i) => (
								<div
									key={i}
									className={cn(
										"grid h-6 place-items-center rounded text-3xs",
										levels[i] === slot ? (slot === 4 ? "bg-gold font-semibold text-background" : "bg-primary text-primary-foreground") : "bg-muted/50",
									)}
								>
									{levels[i] === slot ? i + 1 : ""}
								</div>
							))}
						</Fragment>
					))}
				</div>
			</div>
		</div>
	);
}
```

- [ ] **Step 4: Runes with stats**

Replace `src/components/match/player-tabs/rune-page.tsx` with:

```tsx
import { getRuneIcon } from "@/lib/icon-helpers";
import { type PerkInfo, plainText, runeStatLines } from "@/lib/match/runes";
import { type RuneMaps } from "@/lib/summoner/match-row";
import { type Participant } from "@/lib/validators/match";

/** Primary and secondary trees; each rune shows what it did this game, hovering shows its short description. Shards below. */
export function RunePage({ player, runeData, perks }: { player: Participant; runeData?: RuneMaps; perks?: Map<number, PerkInfo> }) {
	if (!runeData) return null;
	const trees = ["primaryStyle", "subStyle"]
		.map((description) => player.perks.styles.find((s) => s.description === description))
		.filter((style) => style !== undefined);
	const shards = [player.perks.statPerks.offense, player.perks.statPerks.flex, player.perks.statPerks.defense]
		.map((id) => perks?.get(id)?.name)
		.filter((name): name is string => !!name);

	return (
		<div className="space-y-4">
			<div className="grid gap-4 sm:grid-cols-2">
				{trees.map((style) => (
					<div key={style.description}>
						<p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{runeData.styles.get(style.style)?.name ?? "Runes"}</p>
						<ul className="space-y-2">
							{style.selections.map((selection) => {
								const rune = runeData.runes.get(selection.perk);
								if (!rune) return null;
								const perk = perks?.get(selection.perk);
								const stats = runeStatLines(perk, [selection.var1, selection.var2, selection.var3]);
								return (
									<li key={selection.perk} className="flex items-start gap-2.5" title={perk ? plainText(perk.shortDesc) : undefined}>
										<img src={getRuneIcon(rune.icon)} alt="" width={28} height={28} className="size-7 shrink-0" />
										<div className="min-w-0">
											<p className="text-sm font-medium text-foreground">{rune.name}</p>
											{stats.map((line) => (
												<p key={line} className="text-xs text-muted-foreground">
													{line}
												</p>
											))}
										</div>
									</li>
								);
							})}
						</ul>
					</div>
				))}
			</div>
			{shards.length > 0 && <p className="text-xs text-muted-foreground">Shards: {shards.join(" · ")}</p>}
		</div>
	);
}
```

In `overview-tab.tsx`:
- Import `usePerks` and call `const { data: perks } = usePerks();`.
- Pass `perks={perks}` to `RunePage`.
- Pass `version={version} championName={player.championName}` to `SkillOrder`.

- [ ] **Step 5: Typecheck and tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: tsc 0; PASS.

---

### Task 8: Fighting — kill map with a synced event list

**Files:**
- Create: `src/components/match/fight-map.tsx`
- Modify: `src/components/match/player-tabs/fighting-tab.tsx`
- Modify: `src/lib/match/detail.ts`, `src/lib/match/detail.test.ts` (remove `hasChampionKillEvents`, which is replaced)
- Delete: `src/components/match/kill-map.tsx`

**Interfaces:**
- Consumes: `playerFightEvents`, `FightRole` (Task 3); `TimelineChartSlot` (Phase 4).
- Produces: `FightMap({ timeline, participantId, participants, version })`.

- [ ] **Step 1: Component**

`src/components/match/fight-map.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { formatDuration } from "@/lib/format";
import { type FightRole, playerFightEvents } from "@/lib/match/timeline-events";
import { type Participant } from "@/lib/validators/match";
import { type Timeline } from "@/lib/validators/timeline";

const MAP_SIZE = 15000;
const pct = (coord: number) => `${(coord / MAP_SIZE) * 100}%`;

const ROLE_COLOR: Record<FightRole, string> = { kill: "var(--win)", death: "var(--loss)", assist: "var(--team-blue)" };
const ROLE_LABEL: Record<FightRole, string> = { kill: "Kill", death: "Death", assist: "Assist" };
const FILTERS: { id: FightRole | "all"; label: string }[] = [
	{ id: "all", label: "All" },
	{ id: "kill", label: "Kills" },
	{ id: "death", label: "Deaths" },
	{ id: "assist", label: "Assists" },
];

/** The player's kills, deaths and assists on the Rift map next to a time-ordered list; hovering either side highlights the other. */
export function FightMap({ timeline, participantId, participants, version }: { timeline: Timeline; participantId: number; participants: Participant[]; version: string }) {
	const events = useMemo(() => playerFightEvents(timeline, participantId), [timeline, participantId]);
	const [filter, setFilter] = useState<FightRole | "all">("all");
	const [hovered, setHovered] = useState<string | null>(null);
	const shown = filter === "all" ? events : events.filter((e) => e.role === filter);

	return (
		<Panel>
			<PanelHeader
				title="Kills & deaths"
				actions={
					<div className="flex gap-1">
						{FILTERS.map((f) => (
							<button
								key={f.id}
								type="button"
								onClick={() => setFilter(f.id)}
								aria-pressed={f.id === filter}
								className={cn(
									"h-6 rounded-md border px-2 text-xs font-medium transition-colors",
									f.id === filter ? "border-primary/50 bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
								)}
							>
								{f.label}
							</button>
						))}
					</div>
				}
			/>
			{events.length === 0 ? (
				<EmptyState title="No kills, deaths or assists" />
			) : (
				<PanelBody className="grid gap-4 md:grid-cols-[minmax(0,18rem)_1fr]">
					<div className="relative aspect-square w-full overflow-hidden rounded-md border">
						<img src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/map/map11.png`} alt="Summoner's Rift" className="size-full object-cover opacity-70" />
						{shown
							.filter((e) => e.x !== null && e.y !== null)
							.map((e) => (
								<span
									key={e.id}
									onMouseEnter={() => setHovered(e.id)}
									onMouseLeave={() => setHovered(null)}
									className={cn("absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full transition-transform", hovered === e.id && "scale-150 ring-4 ring-gold/60")}
									style={{ left: pct(e.x!), bottom: pct(e.y!), background: ROLE_COLOR[e.role] }}
								/>
							))}
					</div>
					<ul className="max-h-80 divide-y divide-border/50 overflow-y-auto">
						{shown.map((e) => {
							const other = e.otherId > 0 ? participants[e.otherId - 1] : undefined;
							return (
								<li
									key={e.id}
									onMouseEnter={() => setHovered(e.id)}
									onMouseLeave={() => setHovered(null)}
									className={cn("flex items-center gap-2 px-2 py-1.5 text-sm", hovered === e.id && "bg-gold/10")}
								>
									<span className="w-11 tabular-nums text-muted-foreground">{formatDuration(e.timestamp / 1000)}</span>
									<span className="size-2 rounded-full" style={{ background: ROLE_COLOR[e.role] }} />
									<span className="text-foreground">{ROLE_LABEL[e.role]}</span>
									<span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
										{e.role === "death" && (other ? "by" : "Executed")}
										{other && <ChampionIcon version={version} championName={other.championName} size={20} />}
									</span>
								</li>
							);
						})}
					</ul>
				</PanelBody>
			)}
		</Panel>
	);
}
```

- [ ] **Step 2: Wire it into the Fighting tab**

In `fighting-tab.tsx`, replace the whole "Kill map" `Panel` (and its `TimelinePart`, `hasChampionKillEvents` and `EmptyState` usage) with:

```tsx
			<TimelineChartSlot title="Kills & deaths" state={timelineState}>
				{timeline && <FightMap timeline={timeline} participantId={participantId} participants={match.info.participants} version={version} />}
			</TimelineChartSlot>
```

Then tidy the imports:
- Remove `KillMap`, `EmptyState`, `TimelinePart`, `hasChampionKillEvents`, and `PanelHeader` if it is now unused.
- Import `FightMap` from `@/components/match/fight-map`.

Remove `hasChampionKillEvents` from `src/lib/match/detail.ts`, and remove its `describe` block and import from `detail.test.ts`.

```bash
git rm src/components/match/kill-map.tsx
```

- [ ] **Step 3: Typecheck and tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: tsc 0; PASS. The suite count drops by the two removed `hasChampionKillEvents` tests.

---

### Task 9: Objectives — two-lane timeline, summary and collapsible list

**Files:**
- Create: `src/components/match/objectives-panel.tsx`
- Modify: `src/components/match/player-tabs/objectives-tab.tsx`
- Delete: `src/components/match/objectives-timeline.tsx`

**Interfaces:**
- Consumes: `objectiveEvents`, `killTicks`, `objectiveSummary`, `gameEndMs`, `Side` (Task 3).
- Produces: `ObjectivesPanel({ timeline }: { timeline: Timeline })`.

- [ ] **Step 1: Component**

`src/components/match/objectives-panel.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { formatDuration } from "@/lib/format";
import { type FirstTaken, gameEndMs, killTicks, objectiveEvents, objectiveSummary, type Side } from "@/lib/match/timeline-events";
import { type Timeline } from "@/lib/validators/timeline";

const SIDE_TEXT: Record<Side, string> = { blue: "text-team-blue", red: "text-team-red" };
const SIDE_BORDER: Record<Side, string> = { blue: "border-team-blue", red: "border-team-red" };
const clock = (ms: number) => formatDuration(ms / 1000);

function First({ label, taken }: { label: string; taken: FirstTaken | null }) {
	return (
		<span className="rounded-md border px-2 py-1 text-xs">
			{label}{" "}
			{taken ? (
				<>
					<b className={SIDE_TEXT[taken.side]}>{taken.side === "blue" ? "Blue" : "Red"}</b> <span className="text-muted-foreground">{clock(taken.timestamp)}</span>
				</>
			) : (
				<span className="text-muted-foreground">—</span>
			)}
		</span>
	);
}

/** Objectives on a blue (top) and red (bottom) lane across the game, kill ticks along the axis, the firsts and counts, and a collapsible list. */
export function ObjectivesPanel({ timeline }: { timeline: Timeline }) {
	const objectives = useMemo(() => objectiveEvents(timeline), [timeline]);
	const kills = useMemo(() => killTicks(timeline), [timeline]);
	const summary = useMemo(() => objectiveSummary(timeline), [timeline]);
	const [open, setOpen] = useState(false);
	const end = gameEndMs(timeline);
	const left = (ms: number) => `${Math.min((ms / end) * 100, 100)}%`;
	const minuteMarks = Array.from({ length: Math.floor(end / 300_000) + 1 }, (_, i) => i * 5);

	return (
		<Panel>
			<PanelHeader title="Objectives" />
			<div className="relative mx-4 my-4 h-36">
				<div className="absolute inset-x-0 top-0 h-12 rounded-md bg-team-blue/10" />
				<div className="absolute inset-x-0 bottom-0 h-12 rounded-md bg-team-red/10" />
				<div className="absolute inset-x-0 top-[3.75rem] flex h-4 justify-between border-y border-dashed text-3xs text-muted-foreground">
					{minuteMarks.map((m) => (
						<span key={m} className="absolute -translate-x-1/2 leading-4" style={{ left: left(m * 60_000) }}>
							{m}
						</span>
					))}
				</div>
				{kills.map((k, i) => (
					<span
						key={i}
						className={cn("absolute h-2.5 w-0.5 -translate-x-1/2 rounded-sm", k.side === "blue" ? "top-[3.1rem] bg-team-blue" : "top-[4.9rem] bg-team-red")}
						style={{ left: left(k.timestamp) }}
					/>
				))}
				{objectives.map((o, i) => (
					<img
						key={`${o.timestamp}-${i}`}
						src={o.icon}
						alt={o.label}
						title={`${o.label} · ${o.side === "blue" ? "Blue" : "Red"} · ${clock(o.timestamp)}`}
						className={cn("absolute size-6 -translate-x-1/2 rounded-full border-2 bg-card p-0.5", SIDE_BORDER[o.side], o.side === "blue" ? "top-3" : "bottom-3")}
						style={{ left: left(o.timestamp) }}
					/>
				))}
			</div>
			<div className="flex flex-wrap gap-1.5 px-4 pb-4">
				<First label="First blood" taken={summary.firstBlood} />
				<First label="First tower" taken={summary.firstTower} />
				<First label="First dragon" taken={summary.firstDragon} />
				{(["dragons", "grubs", "barons", "towers"] as const).map((key) => (
					<span key={key} className="rounded-md border px-2 py-1 text-xs capitalize">
						{key} <b className="text-team-blue">{summary.counts[key].blue}</b>–<b className="text-team-red">{summary.counts[key].red}</b>
					</span>
				))}
			</div>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center justify-center gap-1 border-t py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
			>
				Event list <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
			</button>
			{open && (
				<ul className="divide-y divide-border/50 border-t">
					{objectives.map((o, i) => (
						<li key={`${o.timestamp}-${i}`} className="flex items-center gap-2 px-4 py-1.5 text-sm">
							<span className="w-11 tabular-nums text-muted-foreground">{clock(o.timestamp)}</span>
							<img src={o.icon} alt="" width={18} height={18} className="size-4.5" />
							<span className="text-foreground">{o.label}</span>
							<span className={cn("ml-auto text-xs font-semibold", SIDE_TEXT[o.side])}>{o.side === "blue" ? "Blue" : "Red"}</span>
						</li>
					))}
				</ul>
			)}
		</Panel>
	);
}
```

- [ ] **Step 2: Wire it in and delete the old timeline**

`src/components/match/player-tabs/objectives-tab.tsx`:

```tsx
import { ObjectivesPanel } from "@/components/match/objectives-panel";
import { type PlayerTabProps } from "./player-tabs";

/** The match's objectives timeline; `PlayerTabs` only renders this tab once the timeline is ready. */
export function ObjectivesTab({ timeline }: PlayerTabProps) {
	return timeline ? <ObjectivesPanel timeline={timeline} /> : null;
}
```

```bash
git rm src/components/match/objectives-timeline.tsx
```

- [ ] **Step 3: Typecheck and tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: tsc 0; PASS.

---

### Task 10: Verify, review, commit

- [ ] **Step 1: Full checks**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm exec eslint src && pnpm run build`
Expected: PASS; tsc 0; eslint shows only the baseline errors (5, or fewer); build OK.

- [ ] **Step 2: Browser check (my own tab, dev server :3000, a stored SR match with `?puuid`, a Ranked 5s match, an Arena match)**

Check each of these:
- **Scoreboard:** rank emblems sit before the champions and briefly show skeletons, not "Unranked"; the objective icons have counts; a remake reads "Remake".
- **Charts:** the comparison panel and the gold chart are the same height, with no gap at the bottom. The metric switch works, and the gold chart shows the split colour and objective markers.
- **Overview:** the skill order shows ability icons and the "Max:" order, and the runes show their stat lines and shards.
- **Fighting:** the map and list highlight each other on hover, and the filter works.
- **Objectives:** the lanes, kill ticks, summary chips and the list toggle all work.
- **Vision:** the comparison bars open on Vision.
- **Unknown id:** `/match/EUN1_0` shows "Match not found" after a single `/api/matches/EUN1_0` request.
- **Viewports:** check dark, light, 375px, and 2560px wide. At 2560 the text is visibly larger (18px root) and the layout holds.
- **Console:** no errors.

- [ ] **Step 3: Commit (after the pre-commit review and its fix pass)**

```bash
git add -A
git status --short   # confirm no .env, .superpowers/ or test_matches.json staged
git commit -m "$(cat <<'EOF'
feat(match): match detail polish (Phase 4b)

- Scoreboard: rank emblems with loading placeholders, objective icons,
  Remake label for short games
- Player comparison bars (damage/gold/vision/CS/taken) and one shared
  token-based chart style; gold advantage with objective markers
- Skill order with ability icons and max order; runes with their
  in-game stats and shards
- Fighting: kill map with a hover-synced kill/death/assist list
- Objectives: two-lane timeline, firsts and counts, collapsible list
- Fluid root font size for large screens; px text sizes replaced by
  rem tokens
- No retries for 404 match/timeline requests; DDragon version falls
  back to the remembered or a build-time version

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```
