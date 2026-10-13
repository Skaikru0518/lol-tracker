# MMR Estimate and Performance Rank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an estimated MMR per ranked queue on the ranked cards and a per-game performance rank in the Recent games rows.

**Architecture:** Pure logic (rank scale, apex cut-off refresh, MMR signals and blend, performance rank) lives in small tested modules; thin server modules read the DB / AppSettings / Riot and feed them. Two new GET routes (`/api/ranked/apex-cutoffs`, `/api/mmr/[puuid]`) with TanStack Query hooks; the performance rank is computed client-side from data the match list already has.

**Tech Stack:** Next.js 16 App Router (route params are a `Promise`), Prisma 7 (`$queryRaw`), Zod 4, TanStack Query 5, Tailwind 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-mmr-performance-rank-design.md`

## Global Constraints

- pnpm only. Never run Prisma migrations (none are needed: the cut-off cache uses the existing `AppSettings` table).
- Work on branch `feat/performance-score`; do not create a branch.
- Very few comments: only a non-obvious "why". No JSDoc on obvious code.
- Payloads crossing the network get a Zod schema; types come from `z.infer`.
- Small components, one per file. Sizes in rem (Tailwind classes / `remSize`).
- Tests are `src/**/*.test.ts` only (no `.tsx` tests). Run with `pnpm vitest run <file>`.
- The dev Riot key is shared with prod: no Riot-calling loops while verifying; the only new Riot calls are the apex lists (at most 4 a day).
- Divisor values are fixed by the spec: MMR offset = (W − L) / 5 divisions, clamp ±4; performance offset = round((score − 65) / 8), clamp ±4; LP changes of 0 or |change| > 40 are dropped; lobby games need ≥ 3 known players; no estimate below 5 LP games without a lobby signal.
- Grandmaster / Challenger come only from Riot cut-offs; without cut-offs every apex value is Master. Performance rank is capped at one tier above / below the base tier.

## Review Focus

1. Player tracked only recently (no or one LP snapshot): MMR falls back to the lobby signal or shows nothing; performance rank falls back to the current ranked entry — no crash, no "—" noise.
2. First cut-off fetch fails (Riot 429/5xx, empty cache): routes still answer 200, apex shows Master, the next request retries.
3. An LP change whose sign disagrees with the game result (estimate artefacts, rollbacks): dropped from the LP signal instead of skewing W/L.
4. Unranked queue (no entry): no MMR line and no performance rank for that queue's games, rows stay aligned.
5. Season reset: snapshots before the reset carry the old, higher rank — base rank must use the snapshot at the game's time, not the current rank.

Each line has a test in the owning task (Tasks 2, 4, 6).

---

### Task 1: `fromAbsoluteLp` — inverse of the rank scale

**Files:**
- Modify: `src/lib/summoner/profile/lp-change.ts`
- Test: `src/lib/summoner/profile/lp-change.test.ts`
- Create: `src/lib/validators/apex.ts`

**Interfaces:**
- Consumes: `toAbsoluteLp(tier, rank, lp): number` (existing, same file).
- Produces:
  - `apexCutoffSchema`, `type ApexCutoff = { grandmaster: number; challenger: number }` in `src/lib/validators/apex.ts`.
  - `fromAbsoluteLp(points: number, cutoff: ApexCutoff | null | undefined): { tier: string; rank: string }` in `lp-change.ts`.
  - `TIERS` exported from `lp-change.ts` (tier order Iron … Challenger).

- [ ] **Step 1: Write the failing tests** — append to `lp-change.test.ts` (add `fromAbsoluteLp` to the import):

```ts
describe("fromAbsoluteLp", () => {
	const cutoff = { grandmaster: 250, challenger: 600 };

	it("maps divisions below Master", () => {
		expect(fromAbsoluteLp(0, cutoff)).toEqual({ tier: "IRON", rank: "IV" });
		expect(fromAbsoluteLp(1550, cutoff)).toEqual({ tier: "GOLD", rank: "I" });
		expect(fromAbsoluteLp(2799, cutoff)).toEqual({ tier: "DIAMOND", rank: "I" });
	});

	it("clamps below Iron IV", () => {
		expect(fromAbsoluteLp(-120, cutoff)).toEqual({ tier: "IRON", rank: "IV" });
	});

	it("names apex tiers by the cut-offs", () => {
		expect(fromAbsoluteLp(2800, cutoff)).toEqual({ tier: "MASTER", rank: "" });
		expect(fromAbsoluteLp(3050, cutoff)).toEqual({ tier: "GRANDMASTER", rank: "" });
		expect(fromAbsoluteLp(3400, cutoff)).toEqual({ tier: "CHALLENGER", rank: "" });
	});

	it("keeps every apex value Master without cut-offs", () => {
		expect(fromAbsoluteLp(4000, null)).toEqual({ tier: "MASTER", rank: "" });
	});

	it("round-trips with toAbsoluteLp", () => {
		for (const [tier, rank] of [["SILVER", "III"], ["EMERALD", "II"], ["DIAMOND", "IV"]]) {
			expect(fromAbsoluteLp(toAbsoluteLp(tier, rank, 42), cutoff)).toEqual({ tier, rank });
		}
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/lib/summoner/profile/lp-change.test.ts`
Expected: FAIL — `fromAbsoluteLp` is not exported.

- [ ] **Step 3: Implement**

`src/lib/validators/apex.ts`:

```ts
import { z } from "zod";

export const apexCutoffSchema = z.object({ grandmaster: z.number(), challenger: z.number() });
export type ApexCutoff = z.infer<typeof apexCutoffSchema>;
```

In `lp-change.ts`, export `TIERS` (change `const TIERS` to `export const TIERS`) and add after `toAbsoluteLp`:

```ts
import { type ApexCutoff } from "@/lib/validators/apex";

const APEX_START = APEX_INDEX * 400;

export function fromAbsoluteLp(points: number, cutoff: ApexCutoff | null | undefined): { tier: string; rank: string } {
	if (points >= APEX_START) {
		const lp = points - APEX_START;
		if (cutoff && lp >= cutoff.challenger) return { tier: "CHALLENGER", rank: "" };
		if (cutoff && lp >= cutoff.grandmaster) return { tier: "GRANDMASTER", rank: "" };
		return { tier: "MASTER", rank: "" };
	}
	const p = Math.max(points, 0);
	return { tier: TIERS[Math.floor(p / 400)], rank: DIVISIONS[Math.floor((p % 400) / 100)] };
}
```

(Put the import at the top of the file with the existing one.)

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/lib/summoner/profile/lp-change.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validators/apex.ts src/lib/summoner/profile/lp-change.ts src/lib/summoner/profile/lp-change.test.ts
git commit -m "feat(ranked): map absolute LP back to a rank with apex cut-offs"
```

---

### Task 2: Apex cut-offs (Riot, cached in AppSettings) + route + hook

**Files:**
- Modify: `src/lib/validators/apex.ts`
- Create: `src/lib/game/apex-cutoffs.ts` (pure refresh logic)
- Test: `src/lib/game/apex-cutoffs.test.ts`
- Create: `src/lib/riot/apex.ts` (Riot calls)
- Create: `src/lib/summoner/profile/apex-cutoffs-store.ts` (AppSettings + Riot glue)
- Create: `src/app/api/ranked/apex-cutoffs/route.ts`
- Create: `src/hooks/useApexCutoffs.ts`

**Interfaces:**
- Consumes: `ApexCutoff` (Task 1); `riotFetch`, `BASE_URL` from `src/lib/riot/riot.ts`; `getAppSetting`, `setAppSetting` from `src/lib/server/app-settings.ts`; `RankedQueueType` from `src/lib/game/ranked-queues.ts`.
- Produces:
  - `APEX_QUEUES = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR"] as const`, `CUTOFF_TTL_MS = 86_400_000`.
  - `apexCacheSchema`, `type ApexCache = Partial<Record<ApexQueue, ApexCutoff & { fetchedAt: number }>>`.
  - `apexCutoffsSchema`, `type ApexCutoffs = Partial<Record<RankedQueueType, ApexCutoff>>`.
  - `lowestLp(entries: { leaguePoints: number }[]): number | null`.
  - `refreshCutoffs(cache: ApexCache, fetchLowest: (tier: "grandmaster" | "challenger", queue: ApexQueue) => Promise<number | null>, now: number): Promise<{ cache: ApexCache; changed: boolean }>`.
  - `toCutoffs(cache: ApexCache): ApexCutoffs`.
  - Server: `apexCutoffs(): Promise<ApexCutoffs>`.
  - Hook: `useApexCutoffs(): UseQueryResult<ApexCutoffs>`.

- [ ] **Step 1: Write the failing tests** — `src/lib/game/apex-cutoffs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CUTOFF_TTL_MS, lowestLp, refreshCutoffs, toCutoffs } from "./apex-cutoffs";

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
		const { cache, changed } = await refreshCutoffs({}, fetchLows, NOW);
		expect(changed).toBe(true);
		expect(cache.RANKED_SOLO_5x5).toEqual({ ...lows, fetchedAt: NOW });
		expect(cache.RANKED_FLEX_SR).toEqual({ ...lows, fetchedAt: NOW });
	});

	it("skips Riot while the cache is fresh", async () => {
		let calls = 0;
		const cached = { RANKED_SOLO_5x5: { ...lows, fetchedAt: NOW - 1000 }, RANKED_FLEX_SR: { ...lows, fetchedAt: NOW - 1000 } };
		const { changed } = await refreshCutoffs(cached, async () => (calls++, 1), NOW);
		expect(calls).toBe(0);
		expect(changed).toBe(false);
	});

	it("keeps the stale value when Riot fails", async () => {
		const stale = { RANKED_SOLO_5x5: { ...lows, fetchedAt: NOW - CUTOFF_TTL_MS - 1 } };
		const { cache } = await refreshCutoffs(stale, async () => { throw new Error("429"); }, NOW);
		expect(cache.RANKED_SOLO_5x5).toEqual(stale.RANKED_SOLO_5x5);
	});

	it("stays empty without throwing when the first fetch fails", async () => {
		const { cache, changed } = await refreshCutoffs({}, async () => { throw new Error("429"); }, NOW);
		expect(cache).toEqual({});
		expect(changed).toBe(false);
	});
});

describe("toCutoffs", () => {
	it("drops the fetch time", () => {
		expect(toCutoffs({ RANKED_FLEX_SR: { ...lows, fetchedAt: NOW } })).toEqual({ RANKED_FLEX_SR: lows });
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/lib/game/apex-cutoffs.test.ts`
Expected: FAIL — module `./apex-cutoffs` not found.

- [ ] **Step 3: Implement the pure module and schemas**

Append to `src/lib/validators/apex.ts`:

```ts
import { RANKED_QUEUE_TYPES } from "@/lib/game/ranked-queues";

export const APEX_QUEUES = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR"] as const;
export type ApexQueue = (typeof APEX_QUEUES)[number];

export const apexCacheSchema = z.partialRecord(z.enum(APEX_QUEUES), apexCutoffSchema.extend({ fetchedAt: z.number() }));
export type ApexCache = z.infer<typeof apexCacheSchema>;

export const apexCutoffsSchema = z.partialRecord(z.enum(RANKED_QUEUE_TYPES), apexCutoffSchema);
export type ApexCutoffs = z.infer<typeof apexCutoffsSchema>;
```

(Move the `RANKED_QUEUE_TYPES` import to the top of the file.)

`src/lib/game/apex-cutoffs.ts`:

```ts
import { APEX_QUEUES, type ApexCache, type ApexCutoffs, type ApexQueue } from "@/lib/validators/apex";

export const CUTOFF_TTL_MS = 24 * 60 * 60 * 1000;

type FetchLowest = (tier: "grandmaster" | "challenger", queue: ApexQueue) => Promise<number | null>;

export function lowestLp(entries: { leaguePoints: number }[]): number | null {
	return entries.length ? Math.min(...entries.map((e) => e.leaguePoints)) : null;
}

export async function refreshCutoffs(cache: ApexCache, fetchLowest: FetchLowest, now: number): Promise<{ cache: ApexCache; changed: boolean }> {
	const next: ApexCache = { ...cache };
	let changed = false;
	for (const queue of APEX_QUEUES) {
		const cached = cache[queue];
		if (cached && now - cached.fetchedAt < CUTOFF_TTL_MS) continue;
		try {
			const grandmaster = await fetchLowest("grandmaster", queue);
			const challenger = await fetchLowest("challenger", queue);
			if (grandmaster === null || challenger === null) continue;
			next[queue] = { grandmaster, challenger, fetchedAt: now };
			changed = true;
		} catch {
			// A stale cut-off is still far better than none
		}
	}
	return { cache: next, changed };
}

export function toCutoffs(cache: ApexCache): ApexCutoffs {
	return Object.fromEntries(Object.entries(cache).map(([queue, { grandmaster, challenger }]) => [queue, { grandmaster, challenger }]));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/lib/game/apex-cutoffs.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Riot calls, store, route, hook**

`src/lib/riot/apex.ts`:

```ts
import { BASE_URL, riotFetch } from "./riot";
import { type ApexQueue } from "../validators/apex";

export function getApexLeague(tier: "grandmaster" | "challenger", queue: ApexQueue) {
	return riotFetch<{ entries: { leaguePoints: number }[] }>(`${BASE_URL}/lol/league/v4/${tier}leagues/by-queue/${queue}`);
}
```

`src/lib/summoner/profile/apex-cutoffs-store.ts`:

```ts
import { lowestLp, refreshCutoffs, toCutoffs } from "@/lib/game/apex-cutoffs";
import { getApexLeague } from "@/lib/riot/apex";
import { getAppSetting, setAppSetting } from "@/lib/server/app-settings";
import { apexCacheSchema, type ApexCache, type ApexCutoffs } from "@/lib/validators/apex";

const KEY = "apex-cutoffs";

async function readCache(): Promise<ApexCache> {
	const raw = await getAppSetting(KEY);
	if (!raw) return {};
	const parsed = apexCacheSchema.safeParse(JSON.parse(raw));
	return parsed.success ? parsed.data : {};
}

export async function apexCutoffs(): Promise<ApexCutoffs> {
	const { cache, changed } = await refreshCutoffs(await readCache(), async (tier, queue) => lowestLp((await getApexLeague(tier, queue)).entries), Date.now());
	if (changed) await setAppSetting(KEY, JSON.stringify(cache));
	return toCutoffs(cache);
}
```

`src/app/api/ranked/apex-cutoffs/route.ts`:

```ts
import { NextResponse } from "next/server";
import { apexCutoffs } from "@/lib/summoner/profile/apex-cutoffs-store";
import { withApiLog } from "@/lib/server/log";
import { type ApexCutoffs } from "@/lib/validators/apex";

async function getHandler(): Promise<NextResponse<ApexCutoffs | { error: string }>> {
	try {
		return NextResponse.json(await apexCutoffs());
	} catch (error) {
		console.error("[api/ranked/apex-cutoffs] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
```

Check `withApiLog`'s handler type in `src/lib/server/log.ts`; if it requires a `req` argument, declare `getHandler(_req: NextRequest)` and import `NextRequest`.

`src/hooks/useApexCutoffs.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { apexCutoffsSchema, type ApexCutoffs } from "@/lib/validators/apex";

async function fetchCutoffs(): Promise<ApexCutoffs> {
	const res = await fetch("/api/ranked/apex-cutoffs");
	if (!res.ok) throw new Error("Failed to fetch apex cut-offs");
	return apexCutoffsSchema.parse(await res.json());
}

export function useApexCutoffs() {
	return useQuery<ApexCutoffs>({ queryKey: ["apex-cutoffs"], queryFn: fetchCutoffs, staleTime: 60 * 60 * 1000 });
}
```

- [ ] **Step 6: Typecheck and commit**

Run: `pnpm tsc --noEmit`
Expected: no output.

```bash
git add src/lib/validators/apex.ts src/lib/game/apex-cutoffs.ts src/lib/game/apex-cutoffs.test.ts src/lib/riot/apex.ts src/lib/summoner/profile/apex-cutoffs-store.ts src/app/api/ranked/apex-cutoffs/route.ts src/hooks/useApexCutoffs.ts
git commit -m "feat(ranked): daily Grandmaster and Challenger LP cut-offs"
```

---

### Task 3: `exactLpChanges` — single-game LP changes only

**Files:**
- Modify: `src/lib/summoner/profile/lp-estimate.ts`
- Test: `src/lib/summoner/profile/lp-estimate.test.ts`

**Interfaces:**
- Consumes: the file's private `gaps(snapshots, games)` and `GameResult { id; end; win }`.
- Produces: `exactLpChanges(snapshots: LPSnapshot[] | undefined, games: GameResult[]): Map<string, number>`; export `type GameResult`.

- [ ] **Step 1: Write the failing test** — append to `lp-estimate.test.ts` (reuse its `snap` / `game` helpers; add `exactLpChanges` to the import):

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/lib/summoner/profile/lp-estimate.test.ts`
Expected: FAIL — `exactLpChanges` is not exported.

- [ ] **Step 3: Implement** — in `lp-estimate.ts` change `interface GameResult` to `export interface GameResult` and add:

```ts
export function exactLpChanges(snapshots: LPSnapshot[] | undefined, games: GameResult[]): Map<string, number> {
	if (!snapshots || snapshots.length < 2) return new Map();
	return new Map(gaps(snapshots, games).flatMap((g) => (g.games.length === 1 ? [[g.games[0].id, g.delta] as const] : [])));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/lib/summoner/profile/lp-estimate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/summoner/profile/lp-estimate.ts src/lib/summoner/profile/lp-estimate.test.ts
git commit -m "feat(lp): expose exact single-game LP changes"
```

---

### Task 4: MMR signals and blend (pure)

**Files:**
- Create: `src/lib/validators/mmr.ts`
- Create: `src/lib/summoner/profile/mmr-estimate.ts`
- Test: `src/lib/summoner/profile/mmr-estimate.test.ts`

**Interfaces:**
- Consumes: `toAbsoluteLp`, `fromAbsoluteLp` (Task 1), `ApexCutoff` (Task 1), `RANKED_QUEUE_TYPES` / `RankedQueueType`.
- Produces:
  - `mmrEstimateSchema`, `mmrEstimatesSchema = z.object({ estimates: z.array(mmrEstimateSchema) })`, `type MmrEstimate`, `type MmrEstimates`.
  - `estimateMmr(input: MmrInput): MmrEstimate | null` where
    `MmrInput = { queueType: RankedQueueType; current: { tier: string; rank: string; lp: number }; lpChanges: { win: boolean; change: number }[]; lobbies: number[][]; cutoff: ApexCutoff | null | undefined }` (`lobbies` = absolute LP of the known other players, one array per game).
  - `mmrTooltip(estimate: MmrEstimate): string`.

- [ ] **Step 1: Write the failing tests** — `src/lib/summoner/profile/mmr-estimate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { estimateMmr, mmrTooltip } from "./mmr-estimate";

const current = { tier: "DIAMOND", rank: "III", lp: 50 }; // absolute 2550
const base = { queueType: "RANKED_FLEX_SR" as const, current, lpChanges: [], lobbies: [], cutoff: { grandmaster: 250, challenger: 600 } };
const games = (wins: number, gain: number, losses: number, loss: number) => [
	...Array.from({ length: wins }, () => ({ win: true, change: gain })),
	...Array.from({ length: losses }, () => ({ win: false, change: -loss })),
];

describe("estimateMmr", () => {
	it("moves (W − L) / 5 divisions from the current rank", () => {
		const e = estimateMmr({ ...base, lpChanges: games(4, 25, 2, 15) });
		expect(e).toMatchObject({ tier: "DIAMOND", rank: "I", absolute: 2750, direction: "above", lpGames: 6, winGain: 25, lossLoss: 15, lobbyPlayers: 0 });
	});

	it("is equal when gains match losses", () => {
		expect(estimateMmr({ ...base, lpChanges: games(3, 20, 3, 20) })).toMatchObject({ tier: "DIAMOND", rank: "III", direction: "equal" });
	});

	it("clamps the LP offset to four divisions", () => {
		expect(estimateMmr({ ...base, lpChanges: games(5, 40, 1, 1) })?.absolute).toBe(2950);
	});

	it("drops zero, oversized and wrong-sign changes", () => {
		const e = estimateMmr({ ...base, lpChanges: [...games(3, 20, 2, 20), { win: false, change: 0 }, { win: true, change: 50 }, { win: true, change: -18 }] });
		expect(e?.lpGames).toBe(5);
	});

	it("needs both a win and a loss for the LP signal", () => {
		expect(estimateMmr({ ...base, lpChanges: games(6, 22, 0, 0) })).toBeNull();
	});

	it("gives no estimate with fewer than 5 LP games and no lobby", () => {
		expect(estimateMmr({ ...base, lpChanges: games(2, 25, 2, 15) })).toBeNull();
	});

	it("uses the lobby alone when there is no LP signal", () => {
		const e = estimateMmr({ ...base, lobbies: [[2800, 2900, 3000], [2600, 2700, 2800]] });
		expect(e).toMatchObject({ absolute: 2800, tier: "MASTER", lpGames: 0, winGain: null, lossLoss: null, lobbyPlayers: 6 });
	});

	it("skips lobby games with fewer than 3 known players", () => {
		expect(estimateMmr({ ...base, lobbies: [[3000, 3100]] })).toBeNull();
	});

	it("weights the LP signal by games and the lobby by known players / 3", () => {
		// LP: 2550 + 2 divisions = 2750, weight 6. Lobby: 2450, weight 6 / 3 = 2.
		const e = estimateMmr({ ...base, lpChanges: games(4, 25, 2, 15), lobbies: [[2400, 2450, 2500], [2400, 2450, 2500]] });
		expect(e?.absolute).toBe(2675);
	});
});

describe("mmrTooltip", () => {
	it("lists the sample and skips missing parts", () => {
		const e = estimateMmr({ ...base, lpChanges: games(4, 25, 2, 15) })!;
		expect(mmrTooltip(e)).toBe("6 games · +25 / −15 LP");
		const lobbyOnly = estimateMmr({ ...base, lobbies: [[2800, 2900, 3000]] })!;
		expect(mmrTooltip(lobbyOnly)).toBe("3 known lobby players");
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/lib/summoner/profile/mmr-estimate.test.ts`
Expected: FAIL — module `./mmr-estimate` not found.

- [ ] **Step 3: Implement**

`src/lib/validators/mmr.ts`:

```ts
import { z } from "zod";
import { RANKED_QUEUE_TYPES } from "@/lib/game/ranked-queues";

export const mmrEstimateSchema = z.object({
	queueType: z.enum(RANKED_QUEUE_TYPES),
	tier: z.string(),
	rank: z.string(),
	absolute: z.number(),
	direction: z.enum(["above", "below", "equal"]),
	lpGames: z.number(),
	winGain: z.number().nullable(),
	lossLoss: z.number().nullable(),
	lobbyPlayers: z.number(),
});
export type MmrEstimate = z.infer<typeof mmrEstimateSchema>;

export const mmrEstimatesSchema = z.object({ estimates: z.array(mmrEstimateSchema) });
export type MmrEstimates = z.infer<typeof mmrEstimatesSchema>;
```

`src/lib/summoner/profile/mmr-estimate.ts`:

```ts
import { type RankedQueueType } from "@/lib/game/ranked-queues";
import { type ApexCutoff } from "@/lib/validators/apex";
import { type MmrEstimate } from "@/lib/validators/mmr";
import { fromAbsoluteLp, toAbsoluteLp } from "./lp-change";

const LP_PER_DIVISION_DIFF = 5;
const MAX_OFFSET = 4;
// Aegis of Valor doubles a win; demotion shields and consolation LP show up as 0
const MAX_CHANGE = 40;
const MIN_LP_GAMES = 5;
const MIN_KNOWN = 3;

export interface MmrInput {
	queueType: RankedQueueType;
	current: { tier: string; rank: string; lp: number };
	lpChanges: { win: boolean; change: number }[];
	lobbies: number[][];
	cutoff: ApexCutoff | null | undefined;
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const clamp = (x: number, max: number) => Math.min(Math.max(x, -max), max);

function lpSignal(changes: MmrInput["lpChanges"]) {
	const valid = changes.filter((c) => c.change !== 0 && Math.abs(c.change) <= MAX_CHANGE && c.change > 0 === c.win);
	const gains = valid.filter((c) => c.win).map((c) => c.change);
	const losses = valid.filter((c) => !c.win).map((c) => -c.change);
	if (gains.length === 0 || losses.length === 0) return null;
	const winGain = mean(gains);
	const lossLoss = mean(losses);
	return { offset: clamp((winGain - lossLoss) / LP_PER_DIVISION_DIFF, MAX_OFFSET), games: valid.length, winGain, lossLoss };
}

function lobbySignal(lobbies: number[][]) {
	const usable = lobbies.filter((l) => l.length >= MIN_KNOWN);
	if (usable.length === 0) return null;
	return { value: mean(usable.map(mean)), players: usable.reduce((s, l) => s + l.length, 0) };
}

export function estimateMmr({ queueType, current, lpChanges, lobbies, cutoff }: MmrInput): MmrEstimate | null {
	const currentAbsolute = toAbsoluteLp(current.tier, current.rank, current.lp);
	const lp = lpSignal(lpChanges);
	const lobby = lobbySignal(lobbies);
	if ((!lp || lp.games < MIN_LP_GAMES) && !lobby) return null;

	const parts = [
		...(lp ? [{ value: currentAbsolute + lp.offset * 100, weight: lp.games }] : []),
		...(lobby ? [{ value: lobby.value, weight: lobby.players / MIN_KNOWN }] : []),
	];
	const absolute = Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0) / parts.reduce((s, p) => s + p.weight, 0));
	const estimated = fromAbsoluteLp(absolute, cutoff);
	const shown = fromAbsoluteLp(currentAbsolute, cutoff);
	const same = estimated.tier === shown.tier && estimated.rank === shown.rank;

	return {
		queueType,
		...estimated,
		absolute,
		direction: same ? "equal" : absolute > currentAbsolute ? "above" : "below",
		lpGames: lp?.games ?? 0,
		winGain: lp ? Math.round(lp.winGain) : null,
		lossLoss: lp ? Math.round(lp.lossLoss) : null,
		lobbyPlayers: lobby?.players ?? 0,
	};
}

export function mmrTooltip(e: MmrEstimate): string {
	return [
		e.lpGames > 0 && e.winGain !== null && e.lossLoss !== null ? `${e.lpGames} games · +${e.winGain} / −${e.lossLoss} LP` : null,
		e.lobbyPlayers > 0 ? `${e.lobbyPlayers} known lobby players` : null,
	]
		.filter(Boolean)
		.join(" · ");
}
```

Note: `current` uses the shown rank for `direction`, so the comparison goes through `fromAbsoluteLp` with the same cut-offs on both sides.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/lib/summoner/profile/mmr-estimate.test.ts`
Expected: PASS (10 tests). If the weighted test fails by rounding, recheck: (2750 × 6 + 2450 × 2) / 8 = 2675.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validators/mmr.ts src/lib/summoner/profile/mmr-estimate.ts src/lib/summoner/profile/mmr-estimate.test.ts
git commit -m "feat(mmr): estimate MMR from LP gains and known lobby ranks"
```

---

### Task 5: MMR server loader, route, hook and ranked-card line

**Files:**
- Create: `src/lib/summoner/profile/mmr.ts`
- Create: `src/app/api/mmr/[puuid]/route.ts`
- Create: `src/hooks/useMmrEstimates.ts`
- Create: `src/components/summoner/overview/mmr-line.tsx`
- Modify: `src/components/summoner/overview/ranked-panel.tsx`
- Modify: `src/components/summoner/overview/overview-tab.tsx`

**Interfaces:**
- Consumes: `estimateMmr`, `mmrTooltip` (Task 4), `exactLpChanges` (Task 3), `apexCutoffs()` (Task 2), `toAbsoluteLp` (Task 1), `mmrEstimatesSchema` (Task 4), `rankedQueueForQueueId`, `ACHIEVEMENT_QUEUE_IDS`, `MIN_ACHIEVEMENT_GAME_SECONDS`, `prisma`, `formatRankLabel`.
- Produces: `mmrEstimates(puuid: string): Promise<MmrEstimates>`; `useMmrEstimates(puuid: string | undefined)`; `MmrLine({ estimate }: { estimate: MmrEstimate })`; `RankedPanel` gains an optional `mmr?: MmrEstimate` prop.

- [ ] **Step 1: Server loader** — `src/lib/summoner/profile/mmr.ts`:

```ts
import { prisma } from "@/lib/server/db";
import { ACHIEVEMENT_QUEUE_IDS, MIN_ACHIEVEMENT_GAME_SECONDS } from "@/lib/achievements/eligibility";
import { RANKED_QUEUE_TYPES, rankedQueueForQueueId, type RankedQueueType } from "@/lib/game/ranked-queues";
import { type LPSnapshot } from "@/lib/validators/lp-history";
import { type MmrEstimates } from "@/lib/validators/mmr";
import { apexCutoffs } from "./apex-cutoffs-store";
import { toAbsoluteLp } from "./lp-change";
import { exactLpChanges } from "./lp-estimate";
import { estimateMmr } from "./mmr-estimate";

const RECENT_GAMES = 20;
const SNAPSHOTS = 100;

interface GameRow {
	matchId: string;
	queueId: number;
	end: bigint;
	win: boolean | null;
	participants: string[];
}

export async function mmrEstimates(puuid: string): Promise<MmrEstimates> {
	// Stored entries also hold non-SR queues (e.g. Arena), which have no MMR here
	const entries = await prisma.rankedEntry.findMany({ where: { puuid, queueType: { in: [...RANKED_QUEUE_TYPES] } } });
	if (entries.length === 0) return { estimates: [] };

	const rows = await prisma.$queryRaw<GameRow[]>`
		SELECT m."matchId", m."queueId", (m."gameCreation" + m."gameDuration" * 1000)::bigint AS "end",
			(SELECT (x->>'win')::boolean FROM jsonb_array_elements(m.data->'info'->'participants') x WHERE x->>'puuid' = ${puuid}) AS win,
			m.data->'metadata'->'participants' AS participants
		FROM (
			SELECT "matchId", "queueId", "gameCreation", "gameDuration", data,
				ROW_NUMBER() OVER (PARTITION BY "queueId" ORDER BY "gameCreation" DESC) AS n
			FROM "Match"
			WHERE data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
				AND "queueId" = ANY(${ACHIEVEMENT_QUEUE_IDS}::int[])
				AND "gameDuration" >= ${MIN_ACHIEVEMENT_GAME_SECONDS}
		) m
		WHERE m.n <= ${RECENT_GAMES}
	`;

	const others = [...new Set(rows.flatMap((r) => r.participants).filter((p) => p !== puuid))];
	const known = await prisma.rankedEntry.findMany({
		where: { puuid: { in: others } },
		select: { puuid: true, queueType: true, tier: true, rank: true, leaguePoints: true },
	});
	const knownLp = new Map(known.map((k) => [`${k.puuid}:${k.queueType}`, toAbsoluteLp(k.tier, k.rank, k.leaguePoints)]));
	const cutoffs = await apexCutoffs();

	const estimates = await Promise.all(
		entries.map(async (entry) => {
			const queueType = entry.queueType as RankedQueueType;
			const games = rows.filter((r) => rankedQueueForQueueId(r.queueId) === queueType && r.win !== null);
			const snapshots: LPSnapshot[] = (
				await prisma.lPHistory.findMany({ where: { puuid, queueType }, orderBy: { createdAt: "desc" }, take: SNAPSHOTS })
			)
				.reverse()
				.map((h) => ({ id: h.id, tier: h.tier, rank: h.rank, lp: h.lp, wins: h.wins, losses: h.losses, createdAt: h.createdAt.toISOString() }));
			const changes = exactLpChanges(snapshots, games.map((g) => ({ id: g.matchId, end: Number(g.end), win: g.win! })));
			return estimateMmr({
				queueType,
				current: { tier: entry.tier, rank: entry.rank, lp: entry.leaguePoints },
				lpChanges: games.flatMap((g) => (changes.has(g.matchId) ? [{ win: g.win!, change: changes.get(g.matchId)! }] : [])),
				lobbies: games.map((g) => g.participants.flatMap((p) => (p !== puuid && knownLp.has(`${p}:${queueType}`) ? [knownLp.get(`${p}:${queueType}`)!] : []))),
				cutoff: cutoffs[queueType],
			});
		}),
	);
	return { estimates: estimates.filter((e) => e !== null) };
}
```

- [ ] **Step 2: Route** — `src/app/api/mmr/[puuid]/route.ts` (copy the params handling from `src/app/api/performance/[matchId]/route.ts`, where params is a `Promise`):

```ts
import { NextRequest, NextResponse } from "next/server";
import { mmrEstimates } from "@/lib/summoner/profile/mmr";
import { withApiLog } from "@/lib/server/log";
import { type MmrEstimates } from "@/lib/validators/mmr";

async function getHandler(_req: NextRequest, { params }: { params: Promise<{ puuid: string }> }): Promise<NextResponse<MmrEstimates | { error: string }>> {
	const { puuid } = await params;
	try {
		return NextResponse.json(await mmrEstimates(puuid));
	} catch (error) {
		console.error("[api/mmr] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export const GET = withApiLog(getHandler);
```

If `withApiLog` does not forward the second argument, match the exact pattern used by `src/app/api/performance/[matchId]/route.ts`.

- [ ] **Step 3: Hook** — `src/hooks/useMmrEstimates.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { mmrEstimatesSchema, type MmrEstimates } from "@/lib/validators/mmr";

async function fetchMmr(puuid: string): Promise<MmrEstimates> {
	const res = await fetch(`/api/mmr/${encodeURIComponent(puuid)}`);
	if (!res.ok) throw new Error("Failed to fetch MMR estimate");
	return mmrEstimatesSchema.parse(await res.json());
}

export function useMmrEstimates(puuid: string | undefined) {
	return useQuery<MmrEstimates>({ queryKey: ["mmr", puuid], queryFn: () => fetchMmr(puuid!), enabled: !!puuid, staleTime: 5 * 60 * 1000 });
}
```

- [ ] **Step 4: UI** — `src/components/summoner/overview/mmr-line.tsx`:

```tsx
import { ArrowDown, ArrowUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatRankLabel } from "@/lib/game/rank-calculator";
import { mmrTooltip } from "@/lib/summoner/profile/mmr-estimate";
import { type MmrEstimate } from "@/lib/validators/mmr";

export function MmrLine({ estimate }: { estimate: MmrEstimate }) {
	return (
		<TooltipProvider delayDuration={200}>
			<Tooltip>
				<TooltipTrigger asChild>
					<p className="mt-0.5 flex w-fit items-center gap-1 text-xs text-muted-foreground">
						Est. MMR: <span className="font-semibold text-foreground">{formatRankLabel(estimate.tier, estimate.rank)}</span>
						{estimate.direction === "above" && <ArrowUp className="size-3 text-win" />}
						{estimate.direction === "below" && <ArrowDown className="size-3 text-loss" />}
					</p>
				</TooltipTrigger>
				<TooltipContent>{mmrTooltip(estimate)}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
```

In `ranked-panel.tsx`: add `mmr?: MmrEstimate` to the props (import the type from `@/lib/validators/mmr`) and render `{mmr && <MmrLine estimate={mmr} />}` directly after the W/L `<p>` inside the `min-w-0` div.

In `overview-tab.tsx`: `const { data: mmr } = useMmrEstimates(puuid);` next to `useRanked`, and pass `mmr={mmr?.estimates.find((e) => e.queueType === queueType)}` to each `RankedPanel`.

- [ ] **Step 5: Typecheck, lint, commit**

Run: `pnpm tsc --noEmit && pnpm eslint src/lib/summoner/profile src/components/summoner/overview src/app/api/mmr src/hooks`
Expected: no type errors; no new lint errors.

```bash
git add src/lib/summoner/profile/mmr.ts "src/app/api/mmr/[puuid]/route.ts" src/hooks/useMmrEstimates.ts src/components/summoner/overview/mmr-line.tsx src/components/summoner/overview/ranked-panel.tsx src/components/summoner/overview/overview-tab.tsx
git commit -m "feat(mmr): show the estimated MMR on the ranked cards"
```

---

### Task 6: Performance rank (pure)

**Files:**
- Create: `src/lib/performance/performance-rank.ts`
- Test: `src/lib/performance/performance-rank.test.ts`

**Interfaces:**
- Consumes: `toAbsoluteLp`, `fromAbsoluteLp`, `TIERS` (Task 1), `ApexCutoff`, `LPSnapshot`.
- Produces:
  - `type BaseRank = { tier: string; rank: string; lp: number }`.
  - `baseRankAt(snapshots: LPSnapshot[] | undefined, end: number, current: { tier: string; rank: string; leaguePoints: number } | undefined): BaseRank | null`.
  - `performanceRank(base: BaseRank, score: number, cutoff: ApexCutoff | null | undefined): { tier: string; rank: string }`.

- [ ] **Step 1: Write the failing tests** — `src/lib/performance/performance-rank.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { baseRankAt, performanceRank } from "./performance-rank";

const cutoff = { grandmaster: 250, challenger: 600 };
const snap = (createdAt: string, tier: string, rank: string, lp: number) => ({ id: createdAt, tier, rank, lp, wins: null, losses: null, createdAt });
const at = (iso: string) => Date.parse(iso);

describe("baseRankAt", () => {
	const snapshots = [snap("2026-01-05T10:00:00Z", "DIAMOND", "II", 40), snap("2026-01-12T10:00:00Z", "EMERALD", "I", 10)];
	const current = { tier: "EMERALD", rank: "III", leaguePoints: 70 };

	it("uses the latest snapshot before the game, not the current rank", () => {
		expect(baseRankAt(snapshots, at("2026-01-08T10:00:00Z"), current)).toEqual({ tier: "DIAMOND", rank: "II", lp: 40 });
	});

	it("falls back to the first snapshot after the game", () => {
		expect(baseRankAt(snapshots, at("2026-01-01T10:00:00Z"), current)).toEqual({ tier: "DIAMOND", rank: "II", lp: 40 });
	});

	it("falls back to the current rank, then to nothing", () => {
		expect(baseRankAt([], at("2026-01-08T10:00:00Z"), current)).toEqual({ tier: "EMERALD", rank: "III", lp: 70 });
		expect(baseRankAt(undefined, at("2026-01-08T10:00:00Z"), undefined)).toBeNull();
	});
});

describe("performanceRank", () => {
	const emerald2 = { tier: "EMERALD", rank: "II", lp: 77 };

	it("moves round((score − 65) / 8) divisions from the division start", () => {
		expect(performanceRank(emerald2, 90, cutoff)).toEqual({ tier: "DIAMOND", rank: "III" });
		expect(performanceRank(emerald2, 65, cutoff)).toEqual({ tier: "EMERALD", rank: "II" });
		expect(performanceRank(emerald2, 40, cutoff)).toEqual({ tier: "PLATINUM", rank: "I" });
	});

	it("clamps the offset to four divisions", () => {
		expect(performanceRank(emerald2, 0, cutoff)).toEqual({ tier: "PLATINUM", rank: "II" });
	});

	it("never goes more than one tier above the base", () => {
		expect(performanceRank({ tier: "DIAMOND", rank: "I", lp: 90 }, 100, cutoff)).toEqual({ tier: "MASTER", rank: "" });
	});

	it("never goes more than one tier below the base", () => {
		expect(performanceRank({ tier: "CHALLENGER", rank: "I", lp: 900 }, 0, null)).toEqual({ tier: "GRANDMASTER", rank: "" });
	});

	it("keeps LP for apex bases", () => {
		expect(performanceRank({ tier: "MASTER", rank: "I", lp: 200 }, 90, cutoff)).toEqual({ tier: "GRANDMASTER", rank: "" });
		expect(performanceRank({ tier: "GRANDMASTER", rank: "I", lp: 400 }, 100, cutoff)).toEqual({ tier: "CHALLENGER", rank: "" });
		expect(performanceRank({ tier: "GRANDMASTER", rank: "I", lp: 400 }, 40, cutoff)).toEqual({ tier: "MASTER", rank: "" });
	});
});
```

Check the floor test by hand: Challenger 900 LP = 3700, score 0 → offset −4 → 3300 → without cut-offs `fromAbsoluteLp` says Master (index 7); base index 9 − 1 = 8 → floor Grandmaster.

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/lib/performance/performance-rank.test.ts`
Expected: FAIL — module `./performance-rank` not found.

- [ ] **Step 3: Implement** — `src/lib/performance/performance-rank.ts`:

```ts
import { fromAbsoluteLp, TIERS, toAbsoluteLp } from "@/lib/summoner/profile/lp-change";
import { type ApexCutoff } from "@/lib/validators/apex";
import { type LPSnapshot } from "@/lib/validators/lp-history";

export interface BaseRank {
	tier: string;
	rank: string;
	lp: number;
}

const AVERAGE_SCORE = 65;
const POINTS_PER_DIVISION = 8;
const MAX_OFFSET = 4;
const APEX_INDEX = TIERS.indexOf("MASTER");

export function baseRankAt(
	snapshots: LPSnapshot[] | undefined,
	end: number,
	current: { tier: string; rank: string; leaguePoints: number } | undefined,
): BaseRank | null {
	const sorted = [...(snapshots ?? [])].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
	const snapshot = sorted.findLast((s) => Date.parse(s.createdAt) <= end) ?? sorted.find((s) => Date.parse(s.createdAt) > end);
	if (snapshot) return { tier: snapshot.tier, rank: snapshot.rank, lp: snapshot.lp };
	return current ? { tier: current.tier, rank: current.rank, lp: current.leaguePoints } : null;
}

const top = (index: number) => ({ tier: TIERS[index], rank: index >= APEX_INDEX ? "" : "I" });
const bottom = (index: number) => ({ tier: TIERS[index], rank: index >= APEX_INDEX ? "" : "IV" });

export function performanceRank(base: BaseRank, score: number, cutoff: ApexCutoff | null | undefined): { tier: string; rank: string } {
	const baseIndex = TIERS.indexOf(base.tier);
	// Below Master the game is judged against the division; above it LP is what separates the tiers
	const start = baseIndex >= APEX_INDEX ? toAbsoluteLp(base.tier, base.rank, base.lp) : toAbsoluteLp(base.tier, base.rank, 0);
	const offset = Math.min(Math.max(Math.round((score - AVERAGE_SCORE) / POINTS_PER_DIVISION), -MAX_OFFSET), MAX_OFFSET);
	const result = fromAbsoluteLp(start + offset * 100, cutoff);
	const index = TIERS.indexOf(result.tier);
	if (index > baseIndex + 1) return top(baseIndex + 1);
	if (index < baseIndex - 1) return bottom(Math.max(baseIndex - 1, 0));
	return result;
}
```

If `findLast` is not in the TS lib target, use `[...sorted].reverse().find(...)`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run src/lib/performance/performance-rank.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/performance/performance-rank.ts src/lib/performance/performance-rank.test.ts
git commit -m "feat(performance): map a game's score to a performance rank"
```

---

### Task 7: Performance rank in the Recent games rows

**Files:**
- Create: `src/components/summoner/matches/performance-rank-slot.tsx`
- Modify: `src/components/summoner/matches/match-list.tsx`
- Modify: `src/components/summoner/matches/match-row.tsx`
- Modify: `src/components/summoner/overview/overview-tab.tsx`

**Interfaces:**
- Consumes: `baseRankAt`, `performanceRank` (Task 6); `useApexCutoffs` (Task 2); `RankedEntry`; `RankEmblem`; `formatRankLabel`; the existing `performance` summaries map in `match-list.tsx`.
- Produces: `MatchList` gains `rankedEntries?: RankedEntry[]`; `MatchRow` gains `performanceRank: { tier: string; rank: string } | null`; `PerformanceRankSlot({ rank })`.

- [ ] **Step 1: Slot component** — `src/components/summoner/matches/performance-rank-slot.tsx`:

```tsx
import { RankEmblem } from "@/components/ui/rank-emblem";
import { formatRankLabel } from "@/lib/game/rank-calculator";

export function PerformanceRankSlot({ rank }: { rank: { tier: string; rank: string } | null }) {
	return (
		<div className="flex w-24 items-center gap-1.5" title={rank ? "Performance rank: the level this game was played at" : undefined}>
			{rank && (
				<>
					<RankEmblem tier={rank.tier} size={20} />
					<span className="truncate text-2xs font-semibold text-foreground">{formatRankLabel(rank.tier, rank.rank)}</span>
				</>
			)}
		</div>
	);
}
```

- [ ] **Step 2: Compute in `match-list.tsx`** — add the prop `rankedEntries?: RankedEntry[]`, call `const { data: cutoffs } = useApexCutoffs();`, and add next to `lpChanges`:

```ts
const performanceRanks = useMemo(() => {
	const ranks = new Map<string, { tier: string; rank: string }>();
	for (const m of matches ?? []) {
		const queue = rankedQueueForQueueId(m.info.queueId);
		const score = performance?.[m.metadata.matchId];
		if (!queue || !score) continue;
		const end = m.info.gameCreation + m.info.gameDuration * 1000;
		const base = baseRankAt(lpHistories?.[queue], end, rankedEntries?.find((e) => e.queueType === queue));
		if (base) ranks.set(m.metadata.matchId, performanceRank(base, score.score, cutoffs?.[queue]));
	}
	return ranks;
}, [matches, performance, lpHistories, rankedEntries, cutoffs]);
```

Check the shape of `performance` (the `usePerformanceSummaries` data: `Record<matchId, ScoreSummary | null>`) and adapt the lookup if it differs. Pass `performanceRank={performanceRanks.get(match.metadata.matchId) ?? null}` to `MatchRow`.

- [ ] **Step 3: Render in `match-row.tsx`** — add the prop `performanceRank: { tier: string; rank: string } | null` and, inside the `hidden gap-1 md:flex` stats div right after the LP `Stat`, render for ranked games:

```tsx
{ranked && <PerformanceRankSlot rank={performanceRank} />}
```

- [ ] **Step 4: Wire `rankedEntries`** — in `overview-tab.tsx` pass `rankedEntries={ranked}` to `MatchList`. Run `grep -rn "<MatchList" src` and leave other usages without the prop (it is optional).

- [ ] **Step 5: Typecheck, lint, full suite, commit**

Run: `pnpm tsc --noEmit && pnpm eslint src && pnpm vitest run`
Expected: no type errors; lint only the 4 known `no-explicit-any` errors in `src/app/api/matches/**`; all tests pass.

```bash
git add src/components/summoner/matches/performance-rank-slot.tsx src/components/summoner/matches/match-list.tsx src/components/summoner/matches/match-row.tsx src/components/summoner/overview/overview-tab.tsx
git commit -m "feat(performance): show the performance rank in recent games"
```

---

### Task 8: Browser check

**Files:** none.

- [ ] **Step 1:** With the user's dev server on `http://localhost:3000`, open `/summoner/Skaikru-HEAVN` once (this triggers at most 4 apex Riot calls, then the cut-offs are cached for 24 h). Do not reload in a loop.
- [ ] **Step 2:** Check: each ranked card with an entry shows `Est. MMR: …` with the right arrow and a tooltip; ranked rows show an emblem + rank between LP and items; normal/ARAM rows have no slot; rows stay aligned.
- [ ] **Step 3:** Via `javascript_exec`, read `fetch('/api/mmr/<puuid>').then(r => r.json())` and `fetch('/api/ranked/apex-cutoffs').then(r => r.json())` and confirm the flex estimate is above the current flex rank (the user's flex gains are +25 / −15).
- [ ] **Step 4:** Report findings; fix only what is broken, with a failing test first when the fix is in logic.
