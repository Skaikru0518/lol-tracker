# UI Redesign — Phase 3: Champions, Champion Sub-page, LP History, Achievements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the remaining profile tabs:
- **Champions:** a stats table plus mastery-only champions
- **Champion sub-page:** splash, summary and matches on that champion, with a redirect from the legacy URL
- **LP History:** range filter, summary, chart and a changes table
- **Achievements:** a placeholder grid

Then remove the last old match components.

**Architecture:**
- Each tab is a `page.tsx` under `src/app/summoner/[name]/` that renders one client tab component from `src/components/summoner/<tab>/`. Every tab reads identity from `useSummonerContext()` (Phase 2).
- Derived data lives in pure, tested helpers: champion-row merging, slug resolution, LP summary and change rows, label inversion, point formatting.
- The only new API surface is `?all=true` on `/api/mastery` (all champions, with a DB fallback).

**Tech Stack:** Next.js 16.2.1 App Router (`permanentRedirect`), React 19, TanStack Query 5, recharts 3 (already a dependency), Phase 0–2 primitives, Vitest 5, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-10-ui-redesign-design.md` — §1 routes (champions, champions/[champion], lp, achievements, legacy [champion] redirect), §3 "Champions tab", "Champion sub-page", "LP History tab", "Achievements tab", §4 (LP `range` from Phase 1).

## Global Constraints

- Package manager is **pnpm**.
- **Comments:** keep them minimal; use only JSDoc (prefer one line) and single-line inline `//`.
- Use plain `<img>`, never `next/image`. No `any`. No emoji. No new env vars.
- Use Phase 0 primitives and tokens (`Panel`, `PanelHeader`, `PanelBody`, `Chip`, `EmptyState`, `HeroBanner`, `ChampionIcon`, `RankEmblem`, `text-win`, `text-loss`, `text-gold`), plus shadcn `Table` and `Select` where they fit.
- Match rows are Phase 2's `MatchRow`, whose result color is the **left-to-right win/loss gradient**, not an accent bar. Do not reintroduce the bar.
- Use the identity and DDragon version from `useSummonerContext()`. Never call `useAccount` or `useDDragonVersion` inside a tab, because that causes the hydration mismatch fixed in Phase 2.
- Keep files small; around 200 lines is the signal to split.
- **Commits:** none per task. One commit at the end of the phase (Task 6), after a pre-commit review of the staged diff.

## Review Focus

1. **Champion slugs in odd forms:**
   - wrong case (`/champions/missfortune`)
   - the DDragon id vs. match name mismatch (`FiddleSticks` vs `Fiddlesticks`)
   - an unknown slug (`/champions/notachamp`)

   Known champions resolve case-insensitively. Unknown ones show a "Champion not found" empty state with a link back to Champions, never a crash or an endless spinner. Pinned by the `findChampionBySlug` tests in Task 3.
2. **Legacy champion URLs** (`/summoner/Cool%20Guy-EUNE/Nami`): permanent redirect to `/summoner/Cool%20Guy-EUNE/champions/Nami`, with no double encoding and no redirect loop. Pinned by the `legacyChampionPath` tests in Task 3 and the curl check.
3. **Mastery when Riot fails, or for a player with no mastery at all:** the Champions tab still renders its stats table. Mastery cells show `—`, and the mastery-only list is empty or comes from the DB fallback. Pinned by the `resolveAllMasteries` tests in Task 1.
4. **LP data edge cases:**
   - 0 or 1 snapshot in the range
   - promotions and demotions
   - apex tiers (Master+)
   - unknown tiers

   The summary shows `—` where unknown, change rows are labelled correctly, chart axis labels are correct, and nothing renders as `NaN`. Pinned by the `lpSummary`, `lpChangeRows` and `absoluteLpLabel` tests in Task 4.
5. **A champion with stats but no mastery, or with mastery but no stored matches:** each champion appears exactly once, either in the table or in the mastery-only list. Pinned by the `mergeChampionRows` tests in Task 2.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/lib/riot/mastery.ts` | modify | add `getAllMasteries` |
| `src/lib/summoner/mastery.ts` (+ `mastery.test.ts`) | modify / create test | add `resolveAllMasteries` |
| `src/app/api/mastery/route.ts` | modify | `?all=true` |
| `src/hooks/useAllMasteries.ts` | create | hook |
| `src/lib/format.ts` (+ test) | modify | `formatPoints` |
| `src/lib/summoner/champion-rows.ts` (+ test) | create | `mergeChampionRows` |
| `src/components/summoner/champions/champions-tab.tsx`, `champion-stats-table.tsx`, `mastery-only-list.tsx` | create | Champions tab |
| `src/app/summoner/[name]/champions/page.tsx` | create | route |
| `src/lib/summoner/champion-slug.ts` (+ test) | create | `findChampionBySlug`, `legacyChampionPath`, `averageKillParticipation` |
| `src/components/summoner/champions/champion-detail.tsx`, `champion-summary.tsx` | create | sub-page |
| `src/app/summoner/[name]/champions/[champion]/page.tsx` | create | route |
| `src/app/summoner/[name]/[champion]/page.tsx` | rewrite | legacy redirect |
| `src/lib/lp-history/summary.ts` (+ test) | create | `lpSummary`, `lpChangeRows`, `absoluteLpLabel` |
| `src/components/summoner/lp-history/lp-history-tab.tsx`, `lp-summary.tsx`, `lp-chart.tsx`, `lp-changes-table.tsx` | create | LP tab |
| `src/app/summoner/[name]/lp/page.tsx` | create | route |
| `src/components/summoner/achievements/achievements-tab.tsx` | create | placeholder grid |
| `src/app/summoner/[name]/achievements/page.tsx` | create | route |
| `src/components/summoner/match-history.tsx`, `match-card.tsx` | delete (Task 5) | no consumers left |

---

### Task 1: All-champion mastery with a DB fallback

**Files:**
- Modify: `src/lib/riot/mastery.ts`
- Modify: `src/lib/summoner/mastery.ts`
- Create: `src/lib/summoner/mastery.test.ts`
- Modify: `src/app/api/mastery/route.ts`
- Create: `src/hooks/useAllMasteries.ts`

**Interfaces:**
- Consumes (existing): `riotFetch`, `BASE_URL`, `prisma`, `MasteryEntry` (Phase 1), `resolveTopMasteries`
- Produces:
  - `getAllMasteries(puuid: string): Promise<ChampionMastery[]>`
  - `resolveAllMasteries(puuid: string): Promise<MasteryEntry[]>`. It calls Riot every time and does not write to the DB, because upserting about 160 rows on each view is not worth it. On any Riot error it falls back to the stored rows, ordered by points.
  - `useAllMasteries(puuid: string | undefined)` → `useQuery<MasteryEntry[]>`
  - `/api/mastery?puuid=…&all=true`

- [ ] **Step 1: Write the failing test**

`src/lib/summoner/mastery.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RiotApiError } from "@/lib/riot/riot";

vi.mock("@/lib/riot/mastery", () => ({ getAllMasteries: vi.fn(), getTopMasteries: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { championMastery: { findMany: vi.fn(), upsert: vi.fn() } } }));

const { getAllMasteries } = await import("@/lib/riot/mastery");
const { prisma } = await import("@/lib/db");
const { resolveAllMasteries } = await import("./mastery");

const riotRow = {
	puuid: "p1",
	championId: 267,
	championLevel: 10,
	championPoints: 412000,
	lastPlayTime: 1_700_000_000_000,
	championPointsSinceLastLevel: 0,
	championPointsUntilNextLevel: 0,
};

describe("resolveAllMasteries", () => {
	beforeEach(() => {
		vi.mocked(getAllMasteries).mockReset();
		vi.mocked(prisma.championMastery.findMany).mockReset();
	});

	it("returns every champion from Riot with a numeric lastPlayTime", async () => {
		vi.mocked(getAllMasteries).mockResolvedValue([riotRow, { ...riotRow, championId: 99, championPoints: 10 }]);
		const result = await resolveAllMasteries("p1");
		expect(result.map((m) => m.championId)).toEqual([267, 99]);
		expect(typeof result[0].lastPlayTime).toBe("number");
		expect(prisma.championMastery.findMany).not.toHaveBeenCalled();
	});

	it("falls back to stored rows ordered by points when Riot fails", async () => {
		vi.mocked(getAllMasteries).mockRejectedValue(new RiotApiError(503, "Riot API error: 503"));
		vi.mocked(prisma.championMastery.findMany).mockResolvedValue([
			{ id: "a", puuid: "p1", championId: 267, championLevel: 10, championPoints: 412000, lastPlayTime: BigInt(5), updatedAt: new Date() },
		] as never);
		const result = await resolveAllMasteries("p1");
		expect(result).toEqual([
			expect.objectContaining({ championId: 267, championPoints: 412000, lastPlayTime: 5 }),
		]);
		expect(prisma.championMastery.findMany).toHaveBeenCalledWith({ where: { puuid: "p1" }, orderBy: { championPoints: "desc" } });
	});

	it("returns an empty list for a player with no mastery", async () => {
		vi.mocked(getAllMasteries).mockResolvedValue([]);
		expect(await resolveAllMasteries("p1")).toEqual([]);
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test`
Expected: FAIL — `resolveAllMasteries is not a function`.

- [ ] **Step 3: Implement**

In `src/lib/riot/mastery.ts`, append:
```ts
export async function getAllMasteries(puuid: string) {
	return riotFetch<ChampionMastery[]>(
		`${BASE_URL}/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}`,
	);
}
```
In `src/lib/summoner/mastery.ts`, change the import to `import { getAllMasteries, getTopMasteries } from "@/lib/riot/mastery";`, then append:
```ts
/** Every champion's mastery straight from Riot (not stored); stored rows are the fallback when Riot fails. */
export async function resolveAllMasteries(puuid: string): Promise<MasteryEntry[]> {
	try {
		const masteries = await getAllMasteries(puuid);
		return masteries.map((m) => ({ ...m, lastPlayTime: Number(m.lastPlayTime) }));
	} catch {
		const stored = await prisma.championMastery.findMany({ where: { puuid }, orderBy: { championPoints: "desc" } });
		return stored.map((m) => ({ ...m, lastPlayTime: Number(m.lastPlayTime) }));
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Add `all=true` to the route**

In `src/app/api/mastery/route.ts`:
- import `resolveAllMasteries` alongside `resolveTopMasteries`
- read `const all = req.nextUrl.searchParams.get("all") === "true";` next to `count`
- replace the `try` body's return with:
```ts
		return NextResponse.json(all ? await resolveAllMasteries(puuid) : await resolveTopMasteries(puuid, parseInt(count)));
```

- [ ] **Step 6: Create `src/hooks/useAllMasteries.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { type MasteryEntry } from "@/lib/summoner/mastery";

async function fetchAllMasteries(puuid: string): Promise<MasteryEntry[]> {
	const res = await fetch(`/api/mastery?${new URLSearchParams({ puuid, all: "true" })}`);
	if (!res.ok) throw new Error("Failed to fetch masteries");
	return res.json();
}

/** Mastery for every champion the player has played. */
export function useAllMasteries(puuid: string | undefined) {
	return useQuery<MasteryEntry[]>({
		queryKey: ["mastery", puuid, "all"],
		queryFn: () => fetchAllMasteries(puuid!),
		staleTime: 1000 * 60 * 30,
		enabled: !!puuid,
	});
}
```
`MasteryEntry` is a type-only export from a server file. A `type` import is erased at build time, so importing it in a client hook is safe.

- [ ] **Step 7: Verify, typecheck and lint**

```bash
PUUID=$(cat .superpowers/sdd/2026-10-10-ui-redesign-phase-1-api/puuid.txt)
curl -s "http://localhost:3000/api/mastery?puuid=$PUUID&all=true" | node -pe "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));Array.isArray(r)?r.length+' champions, first '+r[0]?.championId:JSON.stringify(r)"
curl -s "http://localhost:3000/api/mastery?puuid=$PUUID" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).length"
```
Expected:
- The first command prints more than 5 champions.
- The second still prints `5`, the unchanged default.

Run: `pnpm run typecheck` → no errors.
Run: `npx eslint src/lib/summoner src/lib/riot/mastery.ts src/app/api/mastery src/hooks/useAllMasteries.ts` → 0 errors.

---

### Task 2: Champions tab

**Files:**
- Modify: `src/lib/format.ts`, `src/lib/format.test.ts`
- Create: `src/lib/summoner/champion-rows.ts`, `src/lib/summoner/champion-rows.test.ts`
- Create: `src/components/summoner/champions/champions-tab.tsx`, `champion-stats-table.tsx`, `mastery-only-list.tsx`
- Create: `src/app/summoner/[name]/champions/page.tsx`

**Interfaces:**
- Consumes:
  - Task 1: `useAllMasteries`
  - Phase 1: `useChampionStats(puuid, queue)`, `ChampionStat`, `QueueFilter`
  - Phase 2: `useSummonerContext()` (gives `{ puuid, basePath, version }`)
  - existing: `useChampions()` → `Record<number, Champion>` (`Champion = { id: string; key: string; name: string }`), `ChampionIcon`, `getChampionDisplayName`
- Produces:
  - `formatPoints(points: number): string`
  - `interface ChampionTableRow { stat: ChampionStat; mastery: MasteryEntry | null }`
  - `interface MasteryOnlyRow { championId: number; championKey: string; championName: string; mastery: MasteryEntry }`
  - `mergeChampionRows(stats: ChampionStat[], masteries: MasteryEntry[], champions: Record<number, Champion> | undefined): { rows: ChampionTableRow[]; masteryOnly: MasteryOnlyRow[] }`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/format.test.ts`, and add `formatPoints` to the import:
```ts
describe("formatPoints", () => {
	it("abbreviates thousands without decimals", () => {
		expect(formatPoints(412_345)).toBe("412k");
	});

	it("uses two decimals for millions", () => {
		expect(formatPoints(1_254_000)).toBe("1.25M");
	});

	it("keeps small values as is", () => {
		expect(formatPoints(980)).toBe("980");
	});
});
```

`src/lib/summoner/champion-rows.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { mergeChampionRows } from "./champion-rows";

const stat = (championId: number, championName: string, games: number) => ({
	championId,
	championName,
	games,
	wins: 1,
	winRate: 50,
	kills: 1,
	deaths: 1,
	assists: 1,
	kda: 2,
	csPerMin: 1,
	damagePerMin: 1,
});
const mastery = (championId: number, championPoints: number) => ({
	puuid: "p1",
	championId,
	championLevel: 7,
	championPoints,
	lastPlayTime: 0,
});
const champions = {
	267: { id: "Nami", key: "267", name: "Nami" },
	99: { id: "Lux", key: "99", name: "Lux" },
	412: { id: "Thresh", key: "412", name: "Thresh" },
};

describe("mergeChampionRows", () => {
	it("attaches mastery to stat rows and keeps the stats order", () => {
		const { rows } = mergeChampionRows([stat(267, "Nami", 10), stat(99, "Lux", 4)], [mastery(99, 500), mastery(267, 900)], champions);
		expect(rows.map((r) => [r.stat.championId, r.mastery?.championPoints])).toEqual([
			[267, 900],
			[99, 500],
		]);
	});

	it("leaves mastery null when Riot has none for that champion", () => {
		expect(mergeChampionRows([stat(267, "Nami", 1)], [], champions).rows[0].mastery).toBeNull();
	});

	it("lists mastery-only champions by points, each champion once", () => {
		const { rows, masteryOnly } = mergeChampionRows(
			[stat(267, "Nami", 1)],
			[mastery(267, 900), mastery(99, 100), mastery(412, 300)],
			champions,
		);
		expect(rows).toHaveLength(1);
		expect(masteryOnly.map((m) => [m.championId, m.championKey])).toEqual([
			[412, "Thresh"],
			[99, "Lux"],
		]);
	});

	it("skips mastery-only champions missing from the champion map", () => {
		expect(mergeChampionRows([], [mastery(9999, 1)], champions).masteryOnly).toEqual([]);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `formatPoints is not a function` and `Cannot find module './champion-rows'`.

- [ ] **Step 3: Implement**

Append to `src/lib/format.ts`:
```ts
/** Mastery points: `980`, `412k`, `1.25M`. */
export function formatPoints(points: number): string {
	if (points >= 1_000_000) return `${Math.round(points / 10_000) / 100}M`;
	if (points >= 1_000) return `${Math.round(points / 1_000)}k`;
	return `${points}`;
}
```

`src/lib/summoner/champion-rows.ts`:
```ts
import { type Champion } from "@/lib/icon-helpers";
import { type MasteryEntry } from "@/lib/summoner/mastery";
import { type ChampionStat } from "@/lib/validators/champion-stats";

export interface ChampionTableRow {
	stat: ChampionStat;
	mastery: MasteryEntry | null;
}

export interface MasteryOnlyRow {
	championId: number;
	championKey: string;
	championName: string;
	mastery: MasteryEntry;
}

/** Stat rows with their mastery, plus champions that have mastery but no stored games (by points). */
export function mergeChampionRows(
	stats: ChampionStat[],
	masteries: MasteryEntry[],
	champions: Record<number, Champion> | undefined,
): { rows: ChampionTableRow[]; masteryOnly: MasteryOnlyRow[] } {
	const byId = new Map(masteries.map((m) => [m.championId, m]));
	const rows = stats.map((stat) => ({ stat, mastery: byId.get(stat.championId) ?? null }));
	const played = new Set(stats.map((s) => s.championId));

	const masteryOnly = masteries
		.filter((m) => !played.has(m.championId) && champions?.[m.championId])
		.sort((a, b) => b.championPoints - a.championPoints)
		.map((m) => {
			const champ = champions![m.championId];
			return { championId: m.championId, championKey: champ.id, championName: champ.name, mastery: m };
		});

	return { rows, masteryOnly };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Create the components and the route**

`src/components/summoner/champions/champion-stats-table.tsx`:
```tsx
import Link from "next/link";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { Chip } from "@/components/ui/chip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPoints } from "@/lib/format";
import { getChampionDisplayName } from "@/lib/icon-helpers";
import { type ChampionTableRow } from "@/lib/summoner/champion-rows";

const MASTERY_COLOR = "#b05ad6";

function WinRateBar({ value }: { value: number }) {
	return (
		<div className="flex items-center gap-2">
			<div className="h-1.5 w-16 overflow-hidden rounded-full bg-loss/60">
				<div className="h-full bg-win" style={{ width: `${value}%` }} />
			</div>
			<span className={value >= 50 ? "text-win" : "text-loss"}>{Math.round(value)}%</span>
		</div>
	);
}

/** Per-champion stats with mastery; rows link to the champion sub-page. */
export function ChampionStatsTable({ rows, version, basePath }: { rows: ChampionTableRow[]; version: string; basePath: string }) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-8">#</TableHead>
					<TableHead>Champion</TableHead>
					<TableHead className="text-right">Games</TableHead>
					<TableHead>Winrate</TableHead>
					<TableHead>KDA</TableHead>
					<TableHead className="hidden text-right sm:table-cell">CS/min</TableHead>
					<TableHead className="hidden text-right md:table-cell">Dmg/min</TableHead>
					<TableHead className="hidden lg:table-cell">Mastery</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map(({ stat, mastery }, index) => (
					<TableRow key={stat.championId} className="cursor-pointer">
						<TableCell className="text-muted-foreground">{index + 1}</TableCell>
						<TableCell>
							<Link href={`${basePath}/champions/${stat.championName}`} className="flex items-center gap-2 font-semibold text-foreground hover:text-primary">
								<ChampionIcon version={version} championName={stat.championName} size={26} />
								{getChampionDisplayName(stat.championName)}
							</Link>
						</TableCell>
						<TableCell className="text-right">{stat.games}</TableCell>
						<TableCell>
							<WinRateBar value={stat.winRate} />
						</TableCell>
						<TableCell>
							<span className="font-semibold text-foreground">{stat.kda}</span>{" "}
							<span className="text-xs text-muted-foreground">
								{stat.kills}/{stat.deaths}/{stat.assists}
							</span>
						</TableCell>
						<TableCell className="hidden text-right sm:table-cell">{stat.csPerMin}</TableCell>
						<TableCell className="hidden text-right md:table-cell">{Math.round(stat.damagePerMin)}</TableCell>
						<TableCell className="hidden lg:table-cell">
							{mastery ? (
								<Chip color={MASTERY_COLOR}>
									M{mastery.championLevel} · {formatPoints(mastery.championPoints)}
								</Chip>
							) : (
								<span className="text-muted-foreground">—</span>
							)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
```

`src/components/summoner/champions/mastery-only-list.tsx`:
```tsx
import { ChampionIcon } from "@/components/ui/champion-icon";
import { formatPoints } from "@/lib/format";
import { type MasteryOnlyRow } from "@/lib/summoner/champion-rows";

/** Champions with mastery but no stored games, as compact tiles. */
export function MasteryOnlyList({ rows, version }: { rows: MasteryOnlyRow[]; version: string }) {
	return (
		<div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4">
			{rows.map((row) => (
				<div key={row.championId} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
					<ChampionIcon version={version} championName={row.championKey} size={24} />
					<span className="min-w-0 flex-1 truncate text-foreground">{row.championName}</span>
					<span className="text-xs text-muted-foreground">
						M{row.mastery.championLevel} · {formatPoints(row.mastery.championPoints)}
					</span>
				</div>
			))}
		</div>
	);
}
```

`src/components/summoner/champions/champions-tab.tsx`:
```tsx
"use client";

import { useMemo, useState } from "react";
import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { MatchFilters } from "@/components/summoner/matches/match-filters";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllMasteries } from "@/hooks/useAllMasteries";
import { useChampionStats } from "@/hooks/useChampionStats";
import { useChampions } from "@/hooks/useChampions";
import { type QueueFilter } from "@/lib/champion-stats/queue";
import { mergeChampionRows } from "@/lib/summoner/champion-rows";
import { ChampionStatsTable } from "./champion-stats-table";
import { MasteryOnlyList } from "./mastery-only-list";

/** Champions tab: stats table from stored matches with mastery, then mastery-only champions. */
export function ChampionsTab() {
	const { puuid, basePath, version } = useSummonerContext();
	const [queue, setQueue] = useState<QueueFilter>("all");
	const { data: stats, isLoading } = useChampionStats(puuid, queue);
	const { data: masteries } = useAllMasteries(puuid);
	const { data: champions } = useChampions();
	const { rows, masteryOnly } = useMemo(
		() => mergeChampionRows(stats ?? [], masteries ?? [], champions),
		[stats, masteries, champions],
	);

	return (
		<div className="space-y-4">
			<Panel>
				<PanelHeader
					title={
						<>
							Champion stats <span className="font-normal text-muted-foreground">· stored matches</span>
						</>
					}
					actions={<MatchFilters queue={queue} onQueueChange={setQueue} />}
				/>
				{isLoading ? (
					<div className="space-y-2 p-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<Skeleton key={i} className="h-10" />
						))}
					</div>
				) : rows.length === 0 ? (
					<EmptyState title="No stored games for this queue" />
				) : (
					<ChampionStatsTable rows={rows} version={version} basePath={basePath} />
				)}
			</Panel>

			{queue === "all" && masteryOnly.length > 0 && (
				<Panel>
					<PanelHeader title="Other champions" actions={<span className="text-xs text-muted-foreground">mastery only</span>} />
					<MasteryOnlyList rows={masteryOnly} version={version} />
				</Panel>
			)}
		</div>
	);
}
```
The mastery-only list appears only for `all`. Under a queue filter, "no games in this queue" is not the same as "never played".

`src/app/summoner/[name]/champions/page.tsx`:
```tsx
import { ChampionsTab } from "@/components/summoner/champions/champions-tab";

export default function SummonerChampionsPage() {
	return <ChampionsTab />;
}
```

- [ ] **Step 6: Verify in the Browser pane**

Open `/summoner/Skaikru-HEAVN/champions` and check:
- the Champions tab is active
- the table is sorted by games, with WR bars, KDA, CS/min, Dmg/min and mastery chips
- the queue chips filter the table
- "Other champions" lists mastery-only champions under `all`
- a row link opens `/champions/<Name>`, which returns 404 until Task 3
- dark and light mode both look right, with no console errors

- [ ] **Step 7: Typecheck and lint**

Run: `pnpm run typecheck` → no errors.
Run: `npx eslint src/components/summoner/champions src/lib/summoner src/lib/format.ts src/app/summoner` → no new errors. The pre-existing `live/page.tsx` error remains.

---

### Task 3: Champion sub-page and the legacy redirect

**Files:**
- Create: `src/lib/summoner/champion-slug.ts`, `src/lib/summoner/champion-slug.test.ts`
- Create: `src/components/summoner/champions/champion-summary.tsx`, `champion-detail.tsx`
- Create: `src/app/summoner/[name]/champions/[champion]/page.tsx`
- Rewrite: `src/app/summoner/[name]/[champion]/page.tsx`

**Interfaces:**
- Consumes:
  - Phase 2: `MatchList` (`components/summoner/matches/match-list`), `killParticipation`, `useSummonerContext`
  - existing: `useMatches(puuid, count, championId)`, `useChampions`, `useLPHistory`, `useRunes`, `getChampionSplash`, `decodeSlug` (Phase 1, `lib/summoner/get-profile`)
  - Task 1: `useAllMasteries`
  - Phase 1: `useChampionStats`
- Produces:
  - `findChampionBySlug(champions: Record<number, Champion> | undefined, slug: string): Champion | null`
  - `legacyChampionPath(name: string, champion: string): string`
  - `averageKillParticipation(matches: Match[], puuid: string): number | null`

- [ ] **Step 1: Write the failing tests**

`src/lib/summoner/champion-slug.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { averageKillParticipation, findChampionBySlug, legacyChampionPath } from "./champion-slug";
import { makeMatch, makeParticipant } from "@/test/factories";

const champions = {
	21: { id: "MissFortune", key: "21", name: "Miss Fortune" },
	9: { id: "Fiddlesticks", key: "9", name: "Fiddlesticks" },
};

describe("findChampionBySlug", () => {
	it("matches the DDragon id case-insensitively", () => {
		expect(findChampionBySlug(champions, "missfortune")?.key).toBe("21");
	});

	it("matches the FiddleSticks spelling used in match data", () => {
		expect(findChampionBySlug(champions, "FiddleSticks")?.key).toBe("9");
	});

	it("is null for unknown slugs or a missing map", () => {
		expect(findChampionBySlug(champions, "notachamp")).toBeNull();
		expect(findChampionBySlug(undefined, "MissFortune")).toBeNull();
	});
});

describe("legacyChampionPath", () => {
	it("moves the champion under /champions", () => {
		expect(legacyChampionPath("Skaikru-HEAVN", "Nami")).toBe("/summoner/Skaikru-HEAVN/champions/Nami");
	});

	it("does not double-encode an already encoded name", () => {
		expect(legacyChampionPath("Cool%20Guy-EUNE", "Nami")).toBe("/summoner/Cool%20Guy-EUNE/champions/Nami");
	});

	it("encodes a decoded name", () => {
		expect(legacyChampionPath("Cool Guy-EUNE", "Nami")).toBe("/summoner/Cool%20Guy-EUNE/champions/Nami");
	});
});

describe("averageKillParticipation", () => {
	const me = (kills: number, assists: number) => makeParticipant({ puuid: "me", teamId: 100, kills, assists });
	const mate = makeParticipant({ puuid: "mate", teamId: 100, kills: 10 });

	it("averages kill participation across matches", () => {
		const matches = [makeMatch({ participants: [me(5, 5), mate] }), makeMatch({ participants: [me(0, 0), mate] })];
		expect(averageKillParticipation(matches, "me")).toBe(33);
	});

	it("is null without matches", () => {
		expect(averageKillParticipation([], "me")).toBeNull();
	});
});
```
How the 33 comes out: the first match is (5+5)/15 = 67%, the second is 0/10 = 0%, and the average of the two rounds to 33.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './champion-slug'`.

- [ ] **Step 3: Implement `champion-slug.ts`**

```ts
import { type Champion } from "@/lib/icon-helpers";
import { decodeSlug } from "@/lib/summoner/get-profile";
import { killParticipation } from "@/lib/summoner/match-row";
import { type Match } from "@/lib/validators/match";

/** Champion for a URL slug, matching the DDragon id case-insensitively. */
export function findChampionBySlug(champions: Record<number, Champion> | undefined, slug: string): Champion | null {
	if (!champions) return null;
	const target = decodeSlug(slug).toLowerCase();
	return Object.values(champions).find((c) => c.id.toLowerCase() === target) ?? null;
}

/** New URL for a pre-redesign `/summoner/[name]/[champion]` link. */
export function legacyChampionPath(name: string, champion: string): string {
	return `/summoner/${encodeURIComponent(decodeSlug(name))}/champions/${encodeURIComponent(decodeSlug(champion))}`;
}

/** Mean kill participation of the player across matches, whole percent; `null` without matches. */
export function averageKillParticipation(matches: Match[], puuid: string): number | null {
	const values = matches.flatMap((m) => {
		const me = m.info.participants.find((p) => p.puuid === puuid);
		return me ? [killParticipation(me, m.info.participants)] : [];
	});
	if (values.length === 0) return null;
	return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}
```
`decodeSlug` lives in `get-profile.ts`, which imports server-only modules (`prisma`). Importing it into a client component would pull Prisma into the browser bundle. Before writing this file, move `decodeSlug` into `src/lib/riot-id.ts` and re-export it from `get-profile.ts`:
- In `src/lib/riot-id.ts`, append the function as defined in Phase 1, with the same JSDoc.
- In `src/lib/summoner/get-profile.ts`, delete the local definition and add `import { decodeSlug } from "@/lib/riot-id";` plus `export { decodeSlug };`.
- In `champion-slug.ts`, import from `@/lib/riot-id` instead.

Run `pnpm test` afterwards. The Phase 1 `decodeSlug` tests must still pass through the re-export.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Create the sub-page components and route**

`src/components/summoner/champions/champion-summary.tsx`:
```tsx
import { type ChampionStat } from "@/lib/validators/champion-stats";

function Item({ label, value, className }: { label: string; value: string; className?: string }) {
	return (
		<div>
			<p className={`text-lg font-bold text-foreground ${className ?? ""}`}>{value}</p>
			<p className="text-xs text-muted-foreground">{label}</p>
		</div>
	);
}

/** Games, winrate, KDA, CS/min and kill participation on one champion. */
export function ChampionSummary({ stat, killParticipation }: { stat: ChampionStat | undefined; killParticipation: number | null }) {
	return (
		<div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-5">
			<Item label="games" value={stat ? String(stat.games) : "—"} />
			<Item label="winrate" value={stat ? `${Math.round(stat.winRate)}%` : "—"} className={stat && stat.winRate >= 50 ? "text-win" : stat ? "text-loss" : ""} />
			<Item label="KDA" value={stat ? String(stat.kda) : "—"} />
			<Item label="CS/min" value={stat ? String(stat.csPerMin) : "—"} />
			<Item label="KP" value={killParticipation === null ? "—" : `${killParticipation}%`} />
		</div>
	);
}
```

`src/components/summoner/champions/champion-detail.tsx`:
```tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { MatchList } from "@/components/summoner/matches/match-list";
import { HeroBanner } from "@/components/ui/hero-banner";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllMasteries } from "@/hooks/useAllMasteries";
import { useChampionStats } from "@/hooks/useChampionStats";
import { useChampions } from "@/hooks/useChampions";
import { useLPHistory } from "@/hooks/useLPHistory";
import { useMatches } from "@/hooks/useMatches";
import { useRunes } from "@/hooks/useRunes";
import { formatPoints } from "@/lib/format";
import { getChampionSplash } from "@/lib/icon-helpers";
import { averageKillParticipation, findChampionBySlug } from "@/lib/summoner/champion-slug";
import { ChampionSummary } from "./champion-summary";

const CHAMPION_MATCH_COUNT = 20;

/** Champion sub-page: splash header with mastery, summary strip and matches on that champion. */
export function ChampionDetail({ slug }: { slug: string }) {
	const { puuid, gameName, tagLine, basePath, version } = useSummonerContext();
	const { data: champions, isLoading: championsLoading } = useChampions();
	const champion = findChampionBySlug(champions, slug);
	const championId = champion ? Number(champion.key) : undefined;

	const { data: matches, isLoading } = useMatches(championId ? puuid : undefined, CHAMPION_MATCH_COUNT, championId);
	const { data: stats } = useChampionStats(puuid, "all");
	const { data: masteries } = useAllMasteries(puuid);
	const { data: runeData } = useRunes();
	const { data: soloHistory } = useLPHistory(puuid, "RANKED_SOLO_5x5");
	const { data: flexHistory } = useLPHistory(puuid, "RANKED_FLEX_SR");

	const stat = stats?.find((s) => s.championId === championId);
	const mastery = masteries?.find((m) => m.championId === championId);
	const kp = useMemo(() => (matches ? averageKillParticipation(matches, puuid) : null), [matches, puuid]);

	if (championsLoading) return <Skeleton className="h-40" />;
	if (!champion) {
		return (
			<Panel>
				<EmptyState
					title="Champion not found"
					action={
						<Link href={`${basePath}/champions`} className="text-sm font-medium text-primary hover:underline">
							&larr; All champions
						</Link>
					}
				/>
			</Panel>
		);
	}

	return (
		<div className="space-y-4">
			<HeroBanner splashUrl={getChampionSplash(champion.id)} className="rounded-lg border">
				<div className="flex h-32 flex-col justify-end p-5">
					<Link href={`${basePath}/champions`} className="mb-auto text-xs font-medium text-primary hover:underline">
						&larr; All champions
					</Link>
					<h2 className="text-2xl font-bold text-foreground">{champion.name}</h2>
					<p className="text-sm text-muted-foreground">
						{gameName}#{tagLine}
						{mastery && ` · Mastery ${mastery.championLevel} · ${formatPoints(mastery.championPoints)} pts`}
					</p>
				</div>
			</HeroBanner>
			<Panel>
				<ChampionSummary stat={stat} killParticipation={kp} />
			</Panel>
			<MatchList
				matches={matches}
				puuid={puuid}
				version={version}
				isLoading={isLoading}
				runeData={runeData}
				soloHistory={soloHistory}
				flexHistory={flexHistory}
			/>
		</div>
	);
}
```

`src/app/summoner/[name]/champions/[champion]/page.tsx`:
```tsx
import { ChampionDetail } from "@/components/summoner/champions/champion-detail";

export default async function SummonerChampionPage({ params }: { params: Promise<{ name: string; champion: string }> }) {
	const { champion } = await params;
	return <ChampionDetail slug={champion} />;
}
```

Replace the whole of `src/app/summoner/[name]/[champion]/page.tsx` with:
```tsx
import { permanentRedirect } from "next/navigation";
import { legacyChampionPath } from "@/lib/summoner/champion-slug";

/** Pre-redesign champion URLs moved under /champions. */
export default async function LegacyChampionRedirect({ params }: { params: Promise<{ name: string; champion: string }> }) {
	const { name, champion } = await params;
	permanentRedirect(legacyChampionPath(name, champion));
}
```
Before writing it, read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/permanentRedirect.md` (if the file name differs, find it with the Glob tool under `04-functions`).

- [ ] **Step 6: Verify**

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:3000/summoner/Skaikru-HEAVN/Nami"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/summoner/Skaikru-HEAVN/champions/nami"
```
Expected:
- The first command prints `308` with a redirect URL ending in `/summoner/Skaikru-HEAVN/champions/Nami`.
- The second prints `200`.

Then open `/summoner/Skaikru-HEAVN/champions/Nami` in the Browser pane and check:
- the Champions tab stays active
- the splash header shows mastery, the summary strip and the match rows (with the win/loss gradient) on Nami
- `/champions/notachamp` shows "Champion not found" with a back link
- the console shows no errors

- [ ] **Step 7: Typecheck and lint**

Run: `pnpm run typecheck` → no errors.
Run: `npx eslint src/components/summoner/champions src/lib src/app/summoner` → no new errors.

---

### Task 4: LP History tab

**Files:**
- Create: `src/lib/lp-history/summary.ts`, `src/lib/lp-history/summary.test.ts`
- Create: `src/components/summoner/lp-history/lp-history-tab.tsx`, `lp-summary.tsx`, `lp-chart.tsx`, `lp-changes-table.tsx`
- Create: `src/app/summoner/[name]/lp/page.tsx`

**Interfaces:**
- Consumes:
  - Phase 1: `useLPHistory(puuid, queueType, range)`, `LpRange`, `LP_RANGES`, `LPSnapshot`
  - Phase 2: `toAbsoluteLp`, `useSummonerContext`
  - existing: `formatRankLabel`, `RANK_COLORS`
- Produces:
  - `interface LpSummaryData { current: LPSnapshot | null; peak: LPSnapshot | null; change: number | null }`
  - `lpSummary(snapshots: LPSnapshot[]): LpSummaryData`
  - `type LpChangeKind = "start" | "gain" | "loss" | "promotion" | "demotion" | "same"`
  - `interface LpChangeRow { id: string; createdAt: string; tier: string; rank: string; lp: number; wins: number | null; losses: number | null; delta: number | null; kind: LpChangeKind }`
  - `lpChangeRows(snapshots: LPSnapshot[]): LpChangeRow[]` (newest first)
  - `absoluteLpLabel(value: number): string`

- [ ] **Step 1: Write the failing tests**

`src/lib/lp-history/summary.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { absoluteLpLabel, lpChangeRows, lpSummary } from "./summary";

const snap = (id: string, tier: string, rank: string, lp: number) => ({
	id,
	tier,
	rank,
	lp,
	wins: null,
	losses: null,
	createdAt: `2026-10-0${id}T12:00:00.000Z`,
});

describe("lpSummary", () => {
	it("is empty for no snapshots", () => {
		expect(lpSummary([])).toEqual({ current: null, peak: null, change: null });
	});

	it("has no change for a single snapshot", () => {
		const one = snap("1", "EMERALD", "I", 8);
		expect(lpSummary([one])).toEqual({ current: one, peak: one, change: null });
	});

	it("finds the peak across divisions and the change from first to last", () => {
		const series = [snap("1", "EMERALD", "II", 90), snap("2", "EMERALD", "I", 40), snap("3", "EMERALD", "I", 8)];
		const summary = lpSummary(series);
		expect(summary.current?.id).toBe("3");
		expect(summary.peak?.id).toBe("2");
		expect(summary.change).toBe(18);
	});
});

describe("lpChangeRows", () => {
	it("labels each step newest first", () => {
		const rows = lpChangeRows([
			snap("1", "EMERALD", "II", 90),
			snap("2", "EMERALD", "I", 10),
			snap("3", "EMERALD", "I", 29),
			snap("4", "EMERALD", "I", 11),
			snap("5", "EMERALD", "II", 75),
			snap("6", "EMERALD", "II", 75),
		]);
		expect(rows.map((r) => [r.id, r.kind, r.delta])).toEqual([
			["6", "same", 0],
			["5", "demotion", -36],
			["4", "loss", -18],
			["3", "gain", 19],
			["2", "promotion", 20],
			["1", "start", null],
		]);
	});
});

describe("absoluteLpLabel", () => {
	it("inverts toAbsoluteLp for divisions", () => {
		expect(absoluteLpLabel(2350)).toBe("Emerald I · 50 LP");
	});

	it("keeps apex LP above 400 on one tier", () => {
		expect(absoluteLpLabel(2800 + 523)).toBe("Master · 523 LP");
	});

	it("clamps negative values to Iron IV", () => {
		expect(absoluteLpLabel(-10)).toBe("Iron IV · 0 LP");
	});
});
```
How the expected values come out:
- Emerald II 90 is 2000+200+90 = 2290, and Emerald I 8 is 2308, so the change is +18.
- 2350 is Emerald (idx 5 → 2000) + division I (idx 3 → 300) + 50 LP.
- Master is idx 7 → 2800, and its LP is uncapped.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './summary'`.

- [ ] **Step 3: Implement `summary.ts`**

```ts
import { toAbsoluteLp } from "@/lib/summoner/lp-change";
import { formatRankLabel } from "@/lib/rank-calculator";
import { type LPSnapshot } from "@/lib/validators/lp-history";

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const DIVISIONS = ["IV", "III", "II", "I"];
const APEX_BASE = 7 * 400;

export interface LpSummaryData {
	current: LPSnapshot | null;
	peak: LPSnapshot | null;
	change: number | null;
}

export type LpChangeKind = "start" | "gain" | "loss" | "promotion" | "demotion" | "same";

export interface LpChangeRow {
	id: string;
	createdAt: string;
	tier: string;
	rank: string;
	lp: number;
	wins: number | null;
	losses: number | null;
	delta: number | null;
	kind: LpChangeKind;
}

const absolute = (s: LPSnapshot) => toAbsoluteLp(s.tier, s.rank, s.lp);
const division = (s: LPSnapshot) => `${s.tier} ${s.rank}`;

/** Latest snapshot, highest snapshot and LP change from first to last (oldest-first input). */
export function lpSummary(snapshots: LPSnapshot[]): LpSummaryData {
	if (snapshots.length === 0) return { current: null, peak: null, change: null };
	const current = snapshots[snapshots.length - 1];
	const peak = snapshots.reduce((best, s) => (absolute(s) > absolute(best) ? s : best), snapshots[0]);
	const change = snapshots.length > 1 ? absolute(current) - absolute(snapshots[0]) : null;
	return { current, peak, change };
}

/** Each snapshot with its LP delta and whether it was a gain, loss, promotion or demotion; newest first. */
export function lpChangeRows(snapshots: LPSnapshot[]): LpChangeRow[] {
	return snapshots
		.map((s, i) => {
			const prev = snapshots[i - 1];
			const delta = prev ? absolute(s) - absolute(prev) : null;
			let kind: LpChangeKind = "start";
			if (prev && delta !== null) {
				if (division(s) !== division(prev)) kind = delta > 0 ? "promotion" : "demotion";
				else kind = delta > 0 ? "gain" : delta < 0 ? "loss" : "same";
			}
			return { id: s.id, createdAt: s.createdAt, tier: s.tier, rank: s.rank, lp: s.lp, wins: s.wins, losses: s.losses, delta, kind };
		})
		.reverse();
}

/** Rank label for an absolute LP value, e.g. `Emerald I · 50 LP`; the inverse of `toAbsoluteLp`. */
export function absoluteLpLabel(value: number): string {
	const v = Math.max(0, Math.round(value));
	if (v >= APEX_BASE) return `${formatRankLabel("MASTER", "I")} · ${v - APEX_BASE} LP`;
	const tier = TIERS[Math.floor(v / 400)];
	const rank = DIVISIONS[Math.floor((v % 400) / 100)];
	return `${formatRankLabel(tier, rank)} · ${v % 100} LP`;
}
```
`absoluteLpLabel` maps every apex value to "Master". `toAbsoluteLp` puts Grandmaster at 2800+400·1 and Challenger at 2800+400·2, but in practice those tiers rarely appear on the chart's axis ticks. The tooltip shows each snapshot's real tier instead, see `lp-chart.tsx`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Create the components and the route**

`src/components/summoner/lp-history/lp-summary.tsx`:
```tsx
import { formatRankLabel } from "@/lib/rank-calculator";
import { RANK_COLORS } from "@/lib/icon-helpers";
import { type LpSummaryData } from "@/lib/lp-history/summary";
import { type LPSnapshot } from "@/lib/validators/lp-history";

function RankValue({ label, snap }: { label: string; snap: LPSnapshot | null }) {
	return (
		<div>
			<p className="text-xs text-muted-foreground">{label}</p>
			{snap ? (
				<p className="text-base font-bold" style={{ color: RANK_COLORS[snap.tier] }}>
					{formatRankLabel(snap.tier, snap.rank)} <span className="text-sm font-medium text-muted-foreground">{snap.lp} LP</span>
				</p>
			) : (
				<p className="text-base font-bold text-muted-foreground">—</p>
			)}
		</div>
	);
}

/** Current rank, peak rank and LP change over the selected range. */
export function LpSummary({ summary, rangeLabel }: { summary: LpSummaryData; rangeLabel: string }) {
	const { change } = summary;
	return (
		<div className="flex flex-wrap gap-6 px-4 pt-4">
			<RankValue label="Current" snap={summary.current} />
			<RankValue label="Peak" snap={summary.peak} />
			<div>
				<p className="text-xs text-muted-foreground">{rangeLabel} change</p>
				<p className={`text-base font-bold ${change === null ? "text-muted-foreground" : change >= 0 ? "text-win" : "text-loss"}`}>
					{change === null ? "—" : `${change >= 0 ? "+" : ""}${change} LP`}
				</p>
			</div>
		</div>
	);
}
```

`src/components/summoner/lp-history/lp-chart.tsx`:
```tsx
"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { absoluteLpLabel } from "@/lib/lp-history/summary";
import { formatRankLabel } from "@/lib/rank-calculator";
import { toAbsoluteLp } from "@/lib/summoner/lp-change";
import { type LPSnapshot } from "@/lib/validators/lp-history";

const dateLabel = (t: number) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Area chart of absolute LP over time; tooltip shows the snapshot's real rank. */
export function LpChart({ snapshots }: { snapshots: LPSnapshot[] }) {
	const data = snapshots.map((s) => ({
		t: Date.parse(s.createdAt),
		value: toAbsoluteLp(s.tier, s.rank, s.lp),
		label: `${formatRankLabel(s.tier, s.rank)} · ${s.lp} LP`,
	}));

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
					<XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={dateLabel} stroke="var(--muted-foreground)" fontSize={11} />
					<YAxis domain={["dataMin - 20", "dataMax + 20"]} tickFormatter={(v: number) => absoluteLpLabel(v).split(" · ")[0]} stroke="var(--muted-foreground)" fontSize={11} width={90} />
					<Tooltip
						contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
						labelFormatter={(t) => dateLabel(Number(t))}
						formatter={(_value, _name, item) => [item.payload.label, "Rank"]}
					/>
					<Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill="url(#lp-fill)" />
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}
```
recharts 3 typings may require typed `formatter` arguments. If the typecheck rejects `item.payload.label`, type the callback as `(_v: unknown, _n: unknown, item: { payload?: { label?: string } })`, use `item.payload?.label ?? ""`, and record the ruling.

`src/components/summoner/lp-history/lp-changes-table.tsx`:
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRankLabel } from "@/lib/rank-calculator";
import { type LpChangeRow } from "@/lib/lp-history/summary";

const VISIBLE_ROWS = 50;

function ChangeCell({ row }: { row: LpChangeRow }) {
	if (row.kind === "start" || row.delta === null) return <span className="text-muted-foreground">—</span>;
	const sign = row.delta > 0 ? "+" : "";
	const tone = row.delta > 0 ? "text-win" : row.delta < 0 ? "text-loss" : "text-muted-foreground";
	const suffix = row.kind === "promotion" ? " · promoted" : row.kind === "demotion" ? " · demoted" : "";
	return (
		<span className={tone}>
			{sign}
			{row.delta}
			{suffix}
		</span>
	);
}

/** Newest-first LP snapshots with their change. */
export function LpChangesTable({ rows }: { rows: LpChangeRow[] }) {
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
				{rows.slice(0, VISIBLE_ROWS).map((row) => (
					<TableRow key={row.id}>
						<TableCell className="text-muted-foreground">
							{new Date(row.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
						</TableCell>
						<TableCell>{formatRankLabel(row.tier, row.rank)}</TableCell>
						<TableCell className="text-right">{row.lp}</TableCell>
						<TableCell>
							<ChangeCell row={row} />
						</TableCell>
						<TableCell className="hidden text-right text-muted-foreground sm:table-cell">
							{row.wins !== null && row.losses !== null ? `${row.wins}/${row.losses}` : "—"}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
```

`src/components/summoner/lp-history/lp-history-tab.tsx`:
```tsx
"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useLPHistory } from "@/hooks/useLPHistory";
import { type LpRange } from "@/lib/lp-history/range";
import { lpChangeRows, lpSummary } from "@/lib/lp-history/summary";
import { LpChangesTable } from "./lp-changes-table";
import { LpChart } from "./lp-chart";
import { LpSummary } from "./lp-summary";

type Queue = "RANKED_SOLO_5x5" | "RANKED_FLEX_SR";

const QUEUES: { value: Queue; label: string }[] = [
	{ value: "RANKED_SOLO_5x5", label: "Solo/Duo" },
	{ value: "RANKED_FLEX_SR", label: "Flex" },
];

const RANGES: { value: LpRange; label: string }[] = [
	{ value: "7d", label: "7D" },
	{ value: "30d", label: "30D" },
	{ value: "season", label: "Season" },
];

function Toggle<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
	return (
		<div className="flex gap-1">
			{options.map((o) => (
				<button
					key={o.value}
					type="button"
					onClick={() => onChange(o.value)}
					className={cn(
						"h-7 rounded-md border px-2.5 text-xs font-medium transition-colors",
						value === o.value ? "border-primary/50 bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
					)}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

/** LP History tab: queue and range toggles, summary, chart and the changes table. */
export function LpHistoryTab() {
	const { puuid } = useSummonerContext();
	const [queue, setQueue] = useState<Queue>("RANKED_SOLO_5x5");
	const [range, setRange] = useState<LpRange>("30d");
	const { data: snapshots, isLoading } = useLPHistory(puuid, queue, range);
	const summary = useMemo(() => lpSummary(snapshots ?? []), [snapshots]);
	const rows = useMemo(() => lpChangeRows(snapshots ?? []), [snapshots]);
	const rangeLabel = RANGES.find((r) => r.value === range)?.label ?? "";

	return (
		<div className="space-y-4">
			<Panel>
				<PanelHeader
					title={<Toggle options={QUEUES} value={queue} onChange={setQueue} />}
					actions={<Toggle options={RANGES} value={range} onChange={setRange} />}
				/>
				{isLoading ? (
					<Skeleton className="m-4 h-64" />
				) : !snapshots || snapshots.length === 0 ? (
					<EmptyState title="No LP history in this range" description="Snapshots are recorded while the profile is tracked." />
				) : (
					<>
						<LpSummary summary={summary} rangeLabel={rangeLabel} />
						{snapshots.length > 1 ? <LpChart snapshots={snapshots} /> : <p className="p-4 text-sm text-muted-foreground">One snapshot so far.</p>}
					</>
				)}
			</Panel>
			{rows.length > 0 && (
				<Panel>
					<PanelHeader title="Changes" />
					<LpChangesTable rows={rows} />
				</Panel>
			)}
		</div>
	);
}
```

`PanelHeader` wraps `title` in an `<h2>`. A toggle group inside an `<h2>` is invalid content. Before writing the tab, change `PanelHeader` in `src/components/ui/panel.tsx`:
- Render the `<h2>` only when `title` is a string.
- Otherwise render it inside a `<div className="flex items-center gap-2">`.

Code:
```tsx
			{typeof title === "string" ? (
				<h2 className="text-sm font-semibold text-foreground">{title}</h2>
			) : (
				<div className="flex items-center gap-2 text-sm font-semibold text-foreground">{title}</div>
			)}
```
Champions tab titles that are fragments render in the `div` too, which is fine.

`src/app/summoner/[name]/lp/page.tsx`:
```tsx
import { LpHistoryTab } from "@/components/summoner/lp-history/lp-history-tab";

export default function SummonerLpPage() {
	return <LpHistoryTab />;
}
```

- [ ] **Step 6: Verify in the Browser pane**

Open `/summoner/Skaikru-HEAVN/lp` (after the Phase 2 prod-dump restore, Skaikru has real history) and check:
- the LP History tab is active
- Solo/Flex and 7D/30D/Season switch the data
- the summary shows current, peak and change
- the chart tooltip shows the real rank
- the Changes table labels promotions and demotions
- an empty range shows the empty state
- dark and light mode both look right, with no console errors

- [ ] **Step 7: Typecheck and lint**

Run: `pnpm run typecheck` → no errors.
Run: `npx eslint src/components/summoner/lp-history src/lib/lp-history src/components/ui/panel.tsx src/app/summoner` → no new errors.

---

### Task 5: Achievements placeholder and removal of the old match components

**Files:**
- Create: `src/components/summoner/achievements/achievements-tab.tsx`
- Create: `src/app/summoner/[name]/achievements/page.tsx`
- Delete: `src/components/summoner/match-history.tsx`, `src/components/summoner/match-card.tsx`

**Interfaces:**
- Consumes:
  - existing: `ACHIEVEMENTS` (27 entries; `{ id, name, description, icon, color, category: "combat" | "mastery" | "rank" | "playstyle" }`), `useAchievements(puuid)` → `{ achievementId: string; earnedAt: string }[]`
  - Phase 0: `Panel`, `PanelHeader`
- Produces: `AchievementsTab()`

- [ ] **Step 1: Create the tab and route**

`src/components/summoner/achievements/achievements-tab.tsx`:
```tsx
"use client";

import { cn } from "@/lib/utils";
import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { useAchievements } from "@/hooks/useAchievements";
import { ACHIEVEMENTS, type AchievementDef } from "@/lib/achievements/definitions";

const CATEGORIES: { id: AchievementDef["category"]; label: string }[] = [
	{ id: "combat", label: "Combat" },
	{ id: "playstyle", label: "Playstyle" },
	{ id: "mastery", label: "Mastery" },
	{ id: "rank", label: "Rank" },
];

/** Placeholder grid of earned and locked achievements, grouped by category, until the system rework. */
export function AchievementsTab() {
	const { puuid } = useSummonerContext();
	const { data: saved } = useAchievements(puuid);
	const earned = new Map(saved?.map((a) => [a.achievementId, a.earnedAt]) ?? []);

	return (
		<div className="space-y-4">
			<p className="text-sm text-muted-foreground">
				{earned.size} of {ACHIEVEMENTS.length} earned. The achievement system is being reworked; this view is temporary.
			</p>
			{CATEGORIES.map((category) => (
				<Panel key={category.id}>
					<PanelHeader title={category.label} />
					<div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
						{ACHIEVEMENTS.filter((a) => a.category === category.id).map((a) => {
							const earnedAt = earned.get(a.id);
							return (
								<div key={a.id} className={cn("flex items-start gap-3 rounded-md border p-3", !earnedAt && "opacity-50 grayscale")}>
									<img src={`/achi/${a.icon}.svg`} alt="" width={32} height={32} className="size-8 shrink-0" />
									<div className="min-w-0">
										<p className="text-sm font-semibold" style={{ color: earnedAt ? a.color : undefined }}>
											{a.name}
										</p>
										<p className="text-xs text-muted-foreground">{a.description}</p>
										<p className="mt-1 text-[11px] text-muted-foreground">
											{earnedAt ? `Earned ${new Date(earnedAt).toLocaleDateString()}` : "Locked"}
										</p>
									</div>
								</div>
							);
						})}
					</div>
				</Panel>
			))}
		</div>
	);
}
```
Before writing, check `src/lib/achievements/definitions.ts`: confirm that `AchievementDef` is exported (it is, as an interface) and that every `icon` has a matching file in `public/achi/`. List the folder with `ls public/achi`. For any icon without a file, record it in the ledger. The broken image is acceptable in a placeholder, but list it.

`src/app/summoner/[name]/achievements/page.tsx`:
```tsx
import { AchievementsTab } from "@/components/summoner/achievements/achievements-tab";

export default function SummonerAchievementsPage() {
	return <AchievementsTab />;
}
```

- [ ] **Step 2: Delete the old match components**

Use the Grep tool on `src` with the pattern `summoner/match-history"|summoner/match-card"|from "./match-card"`.
Expected: matches only inside `match-history.tsx` itself, which imports `./match-card`.

```bash
git rm src/components/summoner/match-history.tsx src/components/summoner/match-card.tsx
```

- [ ] **Step 3: Verify**

Open `/summoner/Skaikru-HEAVN/achievements`. Expected:
- the Achievements tab is active
- four category panels appear
- earned items show their color and date, and locked items are dimmed
- the console shows no errors

Run: `pnpm run typecheck` → no errors.
Run: `pnpm test` → all green.
Run: `pnpm run lint` → exactly the 5 pre-existing errors: api/matches `any` ×4 and `summoner/[name]/live/page.tsx` ×1.

---

### Task 6: Phase verification, review and the phase commit

- [ ] **Step 1: Production build**

Run: `pnpm run build`
Expected: success. These routes are dynamic (`ƒ`): `/summoner/[name]/champions`, `/summoner/[name]/champions/[champion]`, `/summoner/[name]/lp` and `/summoner/[name]/achievements`.

- [ ] **Step 2: Browser pass in dark and light mode, and at 375px**

Click through every tab of `/summoner/Skaikru-HEAVN`: Overview, Champions (open a champion), LP History and Achievements. Check:
- the tab highlight follows the route
- each tab shows only the shell plus its content, with no duplicate header
- the console shows no errors

At the mobile preset, run `({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth })` on each tab. Expected: equal values; the tables scroll inside their panel. Reset the viewport afterwards.

- [ ] **Step 3: Pre-commit review of the staged diff**

Run `git add -A`, then dispatch the whole-diff reviewer, as in previous phases. Fix Critical and Important findings with RED→GREEN tests, and ledger the minors.

- [ ] **Step 4: Commit the phase (single commit)**

```bash
git add -A
git status
git commit -m "$(cat <<'EOF'
feat(profile): champions, champion page, LP history and achievements tabs

- Champions tab: stored-match stats table with queue filter and mastery,
  plus mastery-only champions; /api/mastery?all=true with DB fallback
- Champion sub-page under /champions/[champion] (splash, summary, matches);
  legacy /summoner/[name]/[champion] URLs redirect permanently
- LP History tab: Solo/Flex and 7D/30D/Season, current/peak/change summary,
  area chart with real-rank tooltip, labelled changes table
- Achievements tab placeholder grouped by category, earned vs locked
- Remove the last pre-redesign match components

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```
Before committing, check that `git status` lists no `.env`, `.superpowers/` or `test_matches.json` changes.
