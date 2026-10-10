# UI Redesign — Phase 1: API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the data layer that the redesigned pages need:
- a server-side summoner profile loader for the new server shell
- three new endpoints: champion stats, recent searches and free rotation
- a `range` filter on LP history

Each piece gets a Zod schema and a typed React Query hook.

**Architecture:**
- The account, summoner, ranked and mastery fetch-and-upsert logic currently lives inline in the API routes. It moves into `src/lib/summoner/*` functions that both the routes and the new `getSummonerProfile` loader call, with stale-while-revalidate behaviour unchanged.
- New endpoints keep their pure logic (input parsing, row mapping, cache decisions) in small tested helpers. The route handler only does I/O.

**Tech Stack:** Next.js 16.2.1 route handlers, Prisma 7 (`$queryRaw` + `Prisma.sql`) on PostgreSQL, Zod 4, TanStack Query 5, Vitest 5, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-10-ui-redesign-design.md` — §1 "Server shell", §4 "Data and API", §5, §7 Phase 1.

## Global Constraints

- Package manager is **pnpm** (`pnpm test`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run build`).
- **Comments:** keep them minimal. Only JSDoc (prefer one line) and single-line inline `//` comments are allowed.
- Every new response has a Zod schema and an exported type in `src/lib/validators/`, plus a hook typed as `useQuery<T>`. Never use `any`.
- No new env variables; use constants.
- Stale-while-revalidate is the caching model: the DB is the only cache and Riot fetches use `cache: "no-store"` (already in `riotFetch`).
- Behaviour of the existing `/api/account`, `/api/summoner`, `/api/ranked`, `/api/mastery`, `/api/cron/ranked` and `/api/lp-history` (without `range`) must not change: same response shapes, same TTLs (account 600s, summoner 300s, ranked 120s with `force=true`, mastery 1800s).
- No Prisma schema change and no migration. The rotation cache uses the existing `AppSettings` table.
- **Commits:** none per task; one commit at the end of the phase (Task 7).

## Review Focus

1. **Riot ID slugs in odd forms** reach the server loader: URL-encoded spaces (`Cool%20Guy-EUNE`), dashes in the game name (`Cool-Guy-EUNE`), a missing tag (`Skaikru`). The loader resolves the right account, or returns `null` (summoner not found), and never throws on a malformed slug. Pinned by the `decodeSlug` and `getSummonerProfile` tests in Task 2.
2. **Riot answers 404 versus anything else** (429, 5xx, network) for an unknown summoner. A 404 means "summoner not found" (`null`); every other error propagates so the error page shows instead of a false "not found". Pinned by the `getSummonerProfile` tests in Task 2.
3. **Champion stat rows with zero deaths or zero duration.** The JSON must never contain `null`, `Infinity` or `NaN`: `JSON.stringify(Infinity)` is `null`, and that would break the table. Perfect KDA is reported as kills + assists. Pinned by the `toChampionStat` tests in Task 3.
4. **Unknown `queue` or `range` query values** (`?queue=urf`, `?range=1y`, empty string) return `400` with an error message instead of silently returning everything. Pinned by the `parseQueueFilter` (Task 3) and `parseLpRange` (Task 6) tests.
5. **Rotation cache that is corrupt, or a Riot outage while a stale cache exists.** A corrupt cache counts as missing. Riot failing while a stale copy exists serves the stale copy, never a 500. Pinned by the `parseCachedRotation` / `rotationCacheState` tests in Task 5 (the stale branch answers from cache before any Riot call).

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/lib/summoner/account.ts` | create | `resolveAccount` (DB-first account by Riot ID) |
| `src/lib/summoner/summoner.ts` | create | `resolveSummoner` |
| `src/lib/summoner/ranked.ts` (+ `.test.ts`) | create | `shouldSnapshot`, `saveRankedEntries`, `resolveRankedEntries` |
| `src/lib/summoner/mastery.ts` | create | `resolveTopMasteries` |
| `src/lib/summoner/get-profile.ts` (+ `.test.ts`) | create | `decodeSlug`, `getSummonerProfile` (React `cache`) |
| `src/app/api/{account,summoner,ranked,mastery}/route.ts` | modify | thin wrappers over `lib/summoner/*` |
| `src/app/api/cron/ranked/route.ts` | modify | uses `saveRankedEntries` |
| `src/lib/champion-stats/queue.ts` (+ `.test.ts`) | create | queue filter parsing |
| `src/lib/champion-stats/aggregate.ts` (+ `.test.ts`) | create | SQL row → `ChampionStat` |
| `src/lib/champion-stats/query.ts` | create | the aggregation SQL |
| `src/lib/validators/champion-stats.ts` | create | schema + type |
| `src/app/api/champion-stats/route.ts` | create | endpoint |
| `src/hooks/useChampionStats.ts` | create | hook |
| `src/lib/recent-searches.ts` (+ `.test.ts`) | create | row → `RecentSearch`, query |
| `src/lib/validators/recent-searches.ts` | create | schema + type |
| `src/app/api/recent-searches/route.ts` | create | endpoint |
| `src/hooks/useRecentSearches.ts` | create | hook |
| `src/lib/riot/rotation.ts` | create | champion-v3 call |
| `src/lib/rotation.ts` (+ `.test.ts`) | create | cache parse/serialise/state, `getFreeRotation` |
| `src/lib/validators/rotation.ts` | create | schemas + types |
| `src/app/api/rotation/route.ts` | create | endpoint |
| `src/hooks/useRotation.ts` | create | hook |
| `src/lib/lp-history/range.ts` (+ `.test.ts`) | create | range parsing and start date |
| `src/lib/validators/lp-history.ts` | create | `lpSnapshotSchema` + `LPSnapshot` |
| `src/app/api/lp-history/route.ts` | modify | `range` param |
| `src/hooks/useLPHistory.ts` | modify | optional `range`, type from validator |

---

### Task 1: Extract summoner data functions from the routes

**Files:**
- Create: `src/lib/summoner/account.ts`, `src/lib/summoner/summoner.ts`, `src/lib/summoner/ranked.ts`, `src/lib/summoner/ranked.test.ts`, `src/lib/summoner/mastery.ts`
- Modify: `src/app/api/account/route.ts`, `src/app/api/summoner/route.ts`, `src/app/api/ranked/route.ts`, `src/app/api/mastery/route.ts`, `src/app/api/cron/ranked/route.ts`

**Interfaces:**
- Consumes (existing):
  - `getAccountById(gameName, tagLine): Promise<Account>`
  - `getSummonerByPuuid(puuid): Promise<Summoner>`
  - `getRankedByPuuid(puuid): Promise<RankedEntry[]>`
  - `getTopMasteries(puuid, count): Promise<ChampionMastery[]>`
  - `isRecent(updatedAt: Date, maxAgeSeconds: number): boolean`
  - `revalidateInBackground(fn: () => Promise<void>): void`
  - `prisma`
- Produces:
  - `resolveAccount(gameName: string, tagLine: string): Promise<Account>`
  - `resolveSummoner(puuid: string): Promise<Summoner>`
  - `shouldSnapshot(last: { tier: string; rank: string; lp: number } | null, entry: { tier: string; rank: string; leaguePoints: number }): boolean`
  - `saveRankedEntries(puuid: string, entries: RankedEntry[]): Promise<number>` (returns snapshots created)
  - `resolveRankedEntries(puuid: string, options?: { force?: boolean }): Promise<RankedEntry[]>`
  - `type MasteryEntry = Pick<ChampionMastery, "puuid" | "championId" | "championLevel" | "championPoints" | "lastPlayTime">`
  - `resolveTopMasteries(puuid: string, count: number): Promise<MasteryEntry[]>`

- [ ] **Step 1: Capture a characterization baseline of the current routes**

The dev server must be running on `http://localhost:3000` (`pnpm dev`). Then run:
```bash
W=.superpowers/sdd/2026-10-10-ui-redesign-phase-1-api; mkdir -p $W/before
BASE=http://localhost:3000/api
PUUID=$(curl -s "$BASE/account?gameName=Skaikru&tagLine=HEAVN" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).puuid")
echo "$PUUID" > $W/puuid.txt
curl -s "$BASE/account?gameName=Skaikru&tagLine=HEAVN" > $W/before/account.json
curl -s "$BASE/summoner?puuid=$PUUID" > $W/before/summoner.json
curl -s "$BASE/ranked?puuid=$PUUID" > $W/before/ranked.json
curl -s "$BASE/mastery?puuid=$PUUID" > $W/before/mastery.json
curl -s "$BASE/account?gameName=NoSuchPlayerXyz&tagLine=0000" -o $W/before/account-404.json -w "%{http_code}\n"
```
Expected:
- `puuid.txt` holds a 78-character puuid.
- The four JSON files are non-empty and none contains `"error"`.
- The last command prints `404`.

- [ ] **Step 2: Write the failing `shouldSnapshot` test**

`src/lib/summoner/ranked.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { shouldSnapshot } from "./ranked";

const entry = { tier: "EMERALD", rank: "I", leaguePoints: 8 };

describe("shouldSnapshot", () => {
	it("snapshots when there is no previous snapshot", () => {
		expect(shouldSnapshot(null, entry)).toBe(true);
	});

	it("skips when tier, rank and LP are unchanged", () => {
		expect(shouldSnapshot({ tier: "EMERALD", rank: "I", lp: 8 }, entry)).toBe(false);
	});

	it("snapshots on an LP change", () => {
		expect(shouldSnapshot({ tier: "EMERALD", rank: "I", lp: 26 }, entry)).toBe(true);
	});

	it("snapshots on a division change with equal LP", () => {
		expect(shouldSnapshot({ tier: "EMERALD", rank: "II", lp: 8 }, entry)).toBe(true);
	});

	it("snapshots on a tier change", () => {
		expect(shouldSnapshot({ tier: "DIAMOND", rank: "I", lp: 8 }, entry)).toBe(true);
	});
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './ranked'`.

- [ ] **Step 4: Create `src/lib/summoner/ranked.ts`**

```ts
import { prisma } from "@/lib/db";
import { getRankedByPuuid } from "@/lib/riot/ranked";
import { isRecent, revalidateInBackground } from "@/lib/cache-utils";
import { type RankedEntry } from "@/lib/validators/ranked";

const RANKED_MAX_AGE_SECONDS = 120;

/** Whether a ranked entry differs from the last LP snapshot, or there is none yet. */
export function shouldSnapshot(
	last: { tier: string; rank: string; lp: number } | null,
	entry: { tier: string; rank: string; leaguePoints: number },
): boolean {
	return (
		!last ||
		last.tier !== entry.tier ||
		last.rank !== entry.rank ||
		last.lp !== entry.leaguePoints
	);
}

/** Upserts ranked entries and records an LP snapshot for each changed one; returns snapshots created. */
export async function saveRankedEntries(
	puuid: string,
	entries: RankedEntry[],
): Promise<number> {
	let created = 0;

	for (const entry of entries) {
		const data = {
			tier: entry.tier,
			rank: entry.rank,
			leaguePoints: entry.leaguePoints,
			wins: entry.wins,
			losses: entry.losses,
			hotStreak: entry.hotStreak,
			veteran: entry.veteran,
			freshBlood: entry.freshBlood,
			inactive: entry.inactive,
		};

		await prisma.rankedEntry.upsert({
			where: { puuid_queueType: { puuid, queueType: entry.queueType } },
			update: data,
			create: { puuid, queueType: entry.queueType, ...data },
		});

		const last = await prisma.lPHistory.findFirst({
			where: { puuid, queueType: entry.queueType },
			orderBy: { createdAt: "desc" },
		});

		if (shouldSnapshot(last, entry)) {
			await prisma.lPHistory.create({
				data: {
					puuid,
					queueType: entry.queueType,
					tier: entry.tier,
					rank: entry.rank,
					lp: entry.leaguePoints,
					wins: entry.wins,
					losses: entry.losses,
				},
			});
			created++;
		}
	}

	return created;
}

/** Ranked entries, DB first; `force` or an empty DB fetches Riot synchronously. */
export async function resolveRankedEntries(
	puuid: string,
	{ force = false }: { force?: boolean } = {},
): Promise<RankedEntry[]> {
	const cached = await prisma.rankedEntry.findMany({ where: { puuid } });

	if (force || cached.length === 0) {
		const entries = await getRankedByPuuid(puuid);
		await saveRankedEntries(puuid, entries);
		return entries;
	}

	if (!cached.every((entry) => isRecent(entry.updatedAt, RANKED_MAX_AGE_SECONDS))) {
		revalidateInBackground(async () => {
			await saveRankedEntries(puuid, await getRankedByPuuid(puuid));
		});
	}

	return cached;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — all files green, including the 5 new `shouldSnapshot` tests.

- [ ] **Step 6: Create `src/lib/summoner/account.ts`**

```ts
import { prisma } from "@/lib/db";
import { getAccountById } from "@/lib/riot/account";
import { isRecent, revalidateInBackground } from "@/lib/cache-utils";
import { type Account } from "@/lib/validators/summoner";

const ACCOUNT_MAX_AGE_SECONDS = 600;

async function fetchAndStoreAccount(gameName: string, tagLine: string): Promise<Account> {
	const account = await getAccountById(gameName, tagLine);
	await prisma.account.upsert({
		where: { puuid: account.puuid },
		update: { gameName: account.gameName, tagLine: account.tagLine },
		create: { puuid: account.puuid, gameName: account.gameName, tagLine: account.tagLine },
	});
	return account;
}

/** Account by Riot ID: DB first (revalidated in the background when stale), else Riot. */
export async function resolveAccount(gameName: string, tagLine: string): Promise<Account> {
	const cached = await prisma.account.findFirst({ where: { gameName, tagLine } });
	if (!cached) return fetchAndStoreAccount(gameName, tagLine);

	if (!isRecent(cached.updatedAt, ACCOUNT_MAX_AGE_SECONDS)) {
		revalidateInBackground(async () => {
			await fetchAndStoreAccount(gameName, tagLine);
		});
	}

	return { puuid: cached.puuid, gameName: cached.gameName, tagLine: cached.tagLine };
}
```

- [ ] **Step 7: Create `src/lib/summoner/summoner.ts`**

```ts
import { prisma } from "@/lib/db";
import { getSummonerByPuuid } from "@/lib/riot/summoner";
import { isRecent, revalidateInBackground } from "@/lib/cache-utils";
import { type Summoner } from "@/lib/validators/summoner";

const SUMMONER_MAX_AGE_SECONDS = 300;

async function fetchAndStoreSummoner(puuid: string): Promise<Summoner> {
	const summoner = await getSummonerByPuuid(puuid);
	const data = {
		profileIconId: summoner.profileIconId,
		summonerLevel: summoner.summonerLevel,
		revisionDate: BigInt(summoner.revisionDate),
	};
	await prisma.summoner.upsert({
		where: { puuid },
		update: data,
		create: { puuid, ...data },
	});
	return summoner;
}

/** Summoner by puuid: DB first (revalidated in the background when stale), else Riot. */
export async function resolveSummoner(puuid: string): Promise<Summoner> {
	const cached = await prisma.summoner.findUnique({ where: { puuid } });
	if (!cached) return fetchAndStoreSummoner(puuid);

	if (!isRecent(cached.updatedAt, SUMMONER_MAX_AGE_SECONDS)) {
		revalidateInBackground(async () => {
			await fetchAndStoreSummoner(puuid);
		});
	}

	return {
		puuid: cached.puuid,
		profileIconId: cached.profileIconId,
		summonerLevel: cached.summonerLevel,
		revisionDate: Number(cached.revisionDate),
	};
}
```

- [ ] **Step 8: Create `src/lib/summoner/mastery.ts`**

```ts
import { prisma } from "@/lib/db";
import { getTopMasteries } from "@/lib/riot/mastery";
import { isRecent, revalidateInBackground } from "@/lib/cache-utils";
import { type ChampionMastery } from "@/lib/validators/mastery";

const MASTERY_MAX_AGE_SECONDS = 1800;

/** The mastery fields both the DB and the Riot path provide. */
export type MasteryEntry = Pick<
	ChampionMastery,
	"puuid" | "championId" | "championLevel" | "championPoints" | "lastPlayTime"
>;

async function fetchAndStoreMasteries(puuid: string, count: number): Promise<MasteryEntry[]> {
	const masteries = await getTopMasteries(puuid, count);

	for (const mastery of masteries) {
		const data = {
			championLevel: mastery.championLevel,
			championPoints: mastery.championPoints,
			lastPlayTime: BigInt(mastery.lastPlayTime),
		};
		await prisma.championMastery.upsert({
			where: { puuid_championId: { puuid, championId: mastery.championId } },
			update: data,
			create: { puuid, championId: mastery.championId, ...data },
		});
	}

	return masteries.map((mastery) => ({ ...mastery, lastPlayTime: Number(mastery.lastPlayTime) }));
}

/** Top masteries by points, DB first; `lastPlayTime` is a number in both paths. */
export async function resolveTopMasteries(puuid: string, count: number): Promise<MasteryEntry[]> {
	const cached = await prisma.championMastery.findMany({
		where: { puuid },
		orderBy: { championPoints: "desc" },
		take: count,
	});

	if (cached.length === 0) return fetchAndStoreMasteries(puuid, count);

	if (!cached.every((entry) => isRecent(entry.updatedAt, MASTERY_MAX_AGE_SECONDS))) {
		revalidateInBackground(async () => {
			await fetchAndStoreMasteries(puuid, count);
		});
	}

	return cached.map((entry) => ({ ...entry, lastPlayTime: Number(entry.lastPlayTime) }));
}
```

- [ ] **Step 9: Replace the four route bodies with thin wrappers**

`src/app/api/account/route.ts`:
```ts
import { RiotApiError } from "@/lib/riot/riot";
import { resolveAccount } from "@/lib/summoner/account";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const gameName = req.nextUrl.searchParams.get("gameName");
	const tagLine = req.nextUrl.searchParams.get("tagLine");

	if (!gameName || !tagLine) {
		return NextResponse.json(
			{ error: "gameName and tagLine are required" },
			{ status: 400 },
		);
	}

	try {
		return NextResponse.json(await resolveAccount(gameName, tagLine));
	} catch (error) {
		if (error instanceof RiotApiError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[api/account] Unhandled error:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
```

`src/app/api/summoner/route.ts`:
```ts
import { RiotApiError } from "@/lib/riot/riot";
import { resolveSummoner } from "@/lib/summoner/summoner";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const puuid = req.nextUrl.searchParams.get("puuid");
	if (!puuid)
		return NextResponse.json({ error: "puuid is required" }, { status: 400 });

	try {
		return NextResponse.json(await resolveSummoner(puuid));
	} catch (error) {
		if (error instanceof RiotApiError)
			return NextResponse.json({ error: error.message }, { status: error.status });

		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
```

`src/app/api/ranked/route.ts`:
```ts
import { RiotApiError } from "@/lib/riot/riot";
import { resolveRankedEntries } from "@/lib/summoner/ranked";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const puuid = req.nextUrl.searchParams.get("puuid");
	const force = req.nextUrl.searchParams.get("force") === "true";

	if (!puuid)
		return NextResponse.json({ error: "puuid is required" }, { status: 400 });

	try {
		return NextResponse.json(await resolveRankedEntries(puuid, { force }));
	} catch (error) {
		if (error instanceof RiotApiError)
			return NextResponse.json({ error: error.message }, { status: error.status });

		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
```

`src/app/api/mastery/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { RiotApiError } from "@/lib/riot/riot";
import { resolveTopMasteries } from "@/lib/summoner/mastery";

export async function GET(req: NextRequest) {
	const puuid = req.nextUrl.searchParams.get("puuid");
	const count = req.nextUrl.searchParams.get("count") ?? "5";

	if (!puuid) {
		return NextResponse.json({ error: "puuid is required" }, { status: 400 });
	}

	try {
		return NextResponse.json(await resolveTopMasteries(puuid, parseInt(count)));
	} catch (error) {
		if (error instanceof RiotApiError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
```

- [ ] **Step 10: Use `saveRankedEntries` in the cron route**

In `src/app/api/cron/ranked/route.ts`, add `import { saveRankedEntries } from "@/lib/summoner/ranked";`. Then replace the whole per-account `try { … } catch { … }` block inside `for (const account of accounts)` with:
```ts
			try {
				const entries = await getRankedByPuuid(account.puuid);
				snapshotsCreated += await saveRankedEntries(account.puuid, entries);
			} catch {
				// Skip individual account errors (e.g. unranked)
			}
```
Keep the auth check, the `accounts` query, the response and the outer `try/catch` unchanged.

- [ ] **Step 11: Compare against the baseline**

```bash
W=.superpowers/sdd/2026-10-10-ui-redesign-phase-1-api; mkdir -p $W/after
BASE=http://localhost:3000/api; PUUID=$(cat $W/puuid.txt)
curl -s "$BASE/account?gameName=Skaikru&tagLine=HEAVN" > $W/after/account.json
curl -s "$BASE/summoner?puuid=$PUUID" > $W/after/summoner.json
curl -s "$BASE/ranked?puuid=$PUUID" > $W/after/ranked.json
curl -s "$BASE/mastery?puuid=$PUUID" > $W/after/mastery.json
curl -s "$BASE/account?gameName=NoSuchPlayerXyz&tagLine=0000" -o $W/after/account-404.json -w "%{http_code}\n"
node -e "const f=require('fs');const n=o=>Array.isArray(o)?o.map(n):o&&typeof o==='object'?Object.fromEntries(Object.keys(o).filter(k=>k!=='updatedAt').sort().map(k=>[k,n(o[k])])):o;for(const x of ['account','summoner','ranked','mastery','account-404']){const r=d=>JSON.stringify(n(JSON.parse(f.readFileSync(process.argv[1]+'/'+d+'/'+x+'.json','utf8'))));console.log(x,r('before')===r('after')?'SAME':'DIFF')}" $W
```
Expected: `404`, then `SAME` for all five.

A `DIFF` on `ranked` or `mastery` is acceptable only when the underlying values changed between the two runs (new LP, a mastery point update). Confirm by inspecting both files. Field names and shapes must match.

Hit the cron route once, so a broken `saveRankedEntries` call would show up:
```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/cron/ranked"
```
Expected: `401`. No secret is sent, which proves the route still compiles and the auth check still runs first.

- [ ] **Step 12: Typecheck and lint**

Run: `pnpm run typecheck` → no errors.
Run: `npx eslint src/lib/summoner src/app/api/account src/app/api/summoner src/app/api/ranked src/app/api/mastery src/app/api/cron/ranked`
Expected: 0 errors.

---

### Task 2: Server-side summoner profile loader

**Files:**
- Create: `src/lib/summoner/get-profile.ts`
- Create: `src/lib/summoner/get-profile.test.ts`

**Interfaces:**
- Consumes:
  - Task 1: `resolveAccount`, `resolveSummoner`, `resolveRankedEntries`, `resolveTopMasteries`
  - existing: `parseSummonerSlug(slug): RiotId`, `RiotApiError` (has `status: number`), types `Account`, `Summoner`, `RankedEntry`
- Produces:
  - `decodeSlug(slug: string): string`
  - `interface SummonerProfile { account: Account; summoner: Summoner; ranked: RankedEntry[]; topMasteryChampionId: number | null }`
  - `getSummonerProfile(slug: string): Promise<SummonerProfile | null>`, wrapped in React `cache` so the layout and `generateMetadata` share one call per request
  - `PROFILE_MASTERY_COUNT = 5` (same count the mastery panel requests, so the DB never ends up holding fewer rows than the panel shows)

- [ ] **Step 1: Write the failing tests**

`src/lib/summoner/get-profile.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RiotApiError } from "@/lib/riot/riot";

vi.mock("@/lib/summoner/account", () => ({ resolveAccount: vi.fn() }));
vi.mock("@/lib/summoner/summoner", () => ({ resolveSummoner: vi.fn() }));
vi.mock("@/lib/summoner/ranked", () => ({ resolveRankedEntries: vi.fn() }));
vi.mock("@/lib/summoner/mastery", () => ({ resolveTopMasteries: vi.fn() }));

const { resolveAccount } = await import("@/lib/summoner/account");
const { resolveSummoner } = await import("@/lib/summoner/summoner");
const { resolveRankedEntries } = await import("@/lib/summoner/ranked");
const { resolveTopMasteries } = await import("@/lib/summoner/mastery");
const { decodeSlug, getSummonerProfile, PROFILE_MASTERY_COUNT } = await import("./get-profile");

const account = { puuid: "p1", gameName: "Cool Guy", tagLine: "EUNE" };
const summoner = { puuid: "p1", profileIconId: 1, summonerLevel: 30, revisionDate: 1 };

describe("decodeSlug", () => {
	it("decodes percent-encoded slugs", () => {
		expect(decodeSlug("Cool%20Guy-EUNE")).toBe("Cool Guy-EUNE");
	});

	it("leaves already-decoded slugs alone", () => {
		expect(decodeSlug("Cool Guy-EUNE")).toBe("Cool Guy-EUNE");
	});

	it("returns malformed escapes unchanged instead of throwing", () => {
		expect(decodeSlug("bad%E0%A4%A-EUNE")).toBe("bad%E0%A4%A-EUNE");
	});
});

describe("getSummonerProfile", () => {
	beforeEach(() => {
		vi.mocked(resolveAccount).mockReset().mockResolvedValue(account);
		vi.mocked(resolveSummoner).mockReset().mockResolvedValue(summoner);
		vi.mocked(resolveRankedEntries).mockReset().mockResolvedValue([]);
		vi.mocked(resolveTopMasteries)
			.mockReset()
			.mockResolvedValue([
				{ puuid: "p1", championId: 267, championLevel: 10, championPoints: 412000, lastPlayTime: 1 },
			]);
	});

	it("resolves an encoded slug with a dash in the game name", async () => {
		const profile = await getSummonerProfile("Cool-Guy%20X-EUNE");
		expect(resolveAccount).toHaveBeenCalledWith("Cool-Guy X", "EUNE");
		expect(profile).toEqual({ account, summoner, ranked: [], topMasteryChampionId: 267 });
	});

	it("asks for the same mastery count as the mastery panel", async () => {
		await getSummonerProfile("Cool%20Guy-EUNE");
		expect(resolveTopMasteries).toHaveBeenCalledWith("p1", PROFILE_MASTERY_COUNT);
	});

	it("returns null for a slug without a tag line", async () => {
		expect(await getSummonerProfile("Skaikru")).toBeNull();
		expect(resolveAccount).not.toHaveBeenCalled();
	});

	it("returns null when Riot does not know the account", async () => {
		vi.mocked(resolveAccount).mockRejectedValue(new RiotApiError(404, "Not Found"));
		expect(await getSummonerProfile("Nobody-0000")).toBeNull();
	});

	it("rethrows Riot errors other than 404", async () => {
		vi.mocked(resolveAccount).mockRejectedValue(new RiotApiError(429, "Rate limit exceeded"));
		await expect(getSummonerProfile("Cool%20Guy-EUNE")).rejects.toBeInstanceOf(RiotApiError);
	});

	it("still returns the profile when masteries fail", async () => {
		vi.mocked(resolveTopMasteries).mockRejectedValue(new RiotApiError(503, "Riot API error: 503"));
		const profile = await getSummonerProfile("Cool%20Guy-EUNE");
		expect(profile?.topMasteryChampionId).toBeNull();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './get-profile'` (or `Failed to load url ./get-profile`).

- [ ] **Step 3: Implement `src/lib/summoner/get-profile.ts`**

```ts
import { cache } from "react";
import { parseSummonerSlug } from "@/lib/riot-id";
import { RiotApiError } from "@/lib/riot/riot";
import { resolveAccount } from "@/lib/summoner/account";
import { resolveSummoner } from "@/lib/summoner/summoner";
import { resolveRankedEntries } from "@/lib/summoner/ranked";
import { resolveTopMasteries } from "@/lib/summoner/mastery";
import { type Account, type Summoner } from "@/lib/validators/summoner";
import { type RankedEntry } from "@/lib/validators/ranked";

/** Same count the mastery panel requests, so the DB never holds fewer rows than it shows. */
export const PROFILE_MASTERY_COUNT = 5;

/** Data the summoner shell (hero, tabs, metadata) renders on the server. */
export interface SummonerProfile {
	account: Account;
	summoner: Summoner;
	ranked: RankedEntry[];
	topMasteryChampionId: number | null;
}

/** `decodeURIComponent` that returns the input unchanged on malformed escapes. */
export function decodeSlug(slug: string): string {
	try {
		return decodeURIComponent(slug);
	} catch {
		return slug;
	}
}

/** Profile for a `/summoner/[name]` slug, or `null` if the Riot ID does not exist; deduped per request. */
export const getSummonerProfile = cache(
	async (slug: string): Promise<SummonerProfile | null> => {
		const { gameName, tagLine } = parseSummonerSlug(decodeSlug(slug));
		if (!gameName || !tagLine) return null;

		let account: Account;
		try {
			account = await resolveAccount(gameName, tagLine);
		} catch (error) {
			if (error instanceof RiotApiError && error.status === 404) return null;
			throw error;
		}

		const [summoner, ranked, masteries] = await Promise.all([
			resolveSummoner(account.puuid),
			resolveRankedEntries(account.puuid),
			resolveTopMasteries(account.puuid, PROFILE_MASTERY_COUNT).catch(() => []),
		]);

		return {
			account,
			summoner,
			ranked,
			topMasteryChampionId: masteries[0]?.championId ?? null,
		};
	},
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — the 3 `decodeSlug` tests and 6 `getSummonerProfile` tests pass, and the earlier suites stay green.

- [ ] **Step 5: Typecheck and lint**

Run: `pnpm run typecheck` → no errors.
Run: `npx eslint src/lib/summoner` → 0 errors.

---

### Task 3: Champion stats endpoint

**Files:**
- Create: `src/lib/champion-stats/queue.ts`, `src/lib/champion-stats/queue.test.ts`
- Create: `src/lib/champion-stats/aggregate.ts`, `src/lib/champion-stats/aggregate.test.ts`
- Create: `src/lib/champion-stats/query.ts`
- Create: `src/lib/validators/champion-stats.ts`
- Create: `src/app/api/champion-stats/route.ts`
- Create: `src/hooks/useChampionStats.ts`

**Interfaces:**
- Produces:
  - `type QueueFilter = "all" | "solo" | "flex" | "aram" | "normal"`
  - `QUEUE_FILTERS: readonly QueueFilter[]`
  - `parseQueueFilter(value: string | null): QueueFilter | null`. `null`/missing becomes `"all"`; an unknown value returns `null`.
  - `interface QueueSelection { mode: "include" | "exclude"; ids: number[] }`
  - `queueSelection(filter: QueueFilter): QueueSelection`
  - `interface ChampionStatRow { championId: number; championName: string; games: number; wins: number; kills: number; deaths: number; assists: number; cs: number; damage: number; durationSeconds: number }`
  - `toChampionStat(row: ChampionStatRow): ChampionStat`
  - `queryChampionStats(puuid: string, filter: QueueFilter): Promise<ChampionStatRow[]>`
  - `championStatSchema`
  - `type ChampionStat = { championId: number; championName: string; games: number; wins: number; winRate: number; kills: number; deaths: number; assists: number; kda: number; csPerMin: number; damagePerMin: number }`. `kills`, `deaths` and `assists` are per-game averages; `winRate` is 0–100.
  - `useChampionStats(puuid: string | undefined, queue?: QueueFilter)` → `useQuery<ChampionStat[]>`

Rules from the spec and the existing "most played" logic:
- Arena (`1700`, `1710`) is excluded from `all`, because its stats are not comparable.
- `normal` covers Normal Draft 400, Normal Blind 430, Swiftplay 480 and Quickplay 490.
- Remakes (`gameDuration < 300` seconds) are excluded.
- Rows are ordered by games, then wins.

- [ ] **Step 1: Write the failing tests**

`src/lib/champion-stats/queue.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parseQueueFilter, queueSelection } from "./queue";

describe("parseQueueFilter", () => {
	it("defaults to all when missing", () => {
		expect(parseQueueFilter(null)).toBe("all");
	});

	it.each(["all", "solo", "flex", "aram", "normal"])("accepts %s", (value) => {
		expect(parseQueueFilter(value)).toBe(value);
	});

	it.each(["", "urf", "SOLO", "420"])("rejects %j", (value) => {
		expect(parseQueueFilter(value)).toBeNull();
	});
});

describe("queueSelection", () => {
	it("excludes Arena from all", () => {
		expect(queueSelection("all")).toEqual({ mode: "exclude", ids: [1700, 1710] });
	});

	it("maps solo to 420", () => {
		expect(queueSelection("solo")).toEqual({ mode: "include", ids: [420] });
	});

	it("covers draft, blind, swiftplay and quickplay for normal", () => {
		expect(queueSelection("normal")).toEqual({ mode: "include", ids: [400, 430, 480, 490] });
	});
});
```

`src/lib/champion-stats/aggregate.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { toChampionStat } from "./aggregate";

const row = {
	championId: 267,
	championName: "Nami",
	games: 4,
	wins: 3,
	kills: 4,
	deaths: 8,
	assists: 60,
	cs: 120,
	damage: 48000,
	durationSeconds: 7200,
};

describe("toChampionStat", () => {
	it("derives per-game averages, ratios and per-minute rates", () => {
		expect(toChampionStat(row)).toEqual({
			championId: 267,
			championName: "Nami",
			games: 4,
			wins: 3,
			winRate: 75,
			kills: 1,
			deaths: 2,
			assists: 15,
			kda: 8,
			csPerMin: 1,
			damagePerMin: 400,
		});
	});

	it("reports perfect KDA as kills plus assists", () => {
		expect(toChampionStat({ ...row, deaths: 0 }).kda).toBe(64);
	});

	it("never produces non-finite numbers for zero duration", () => {
		const stat = toChampionStat({ ...row, durationSeconds: 0 });
		expect(stat.csPerMin).toBe(0);
		expect(stat.damagePerMin).toBe(0);
	});

	it("rounds to two decimals", () => {
		const stat = toChampionStat({ ...row, games: 3, wins: 2, kills: 10, deaths: 3, assists: 1 });
		expect(stat.winRate).toBe(66.67);
		expect(stat.kills).toBe(3.33);
		expect(stat.kda).toBe(3.67);
	});

	it("survives JSON serialisation unchanged", () => {
		const stat = toChampionStat({ ...row, deaths: 0, durationSeconds: 0 });
		expect(JSON.parse(JSON.stringify(stat))).toEqual(stat);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './queue'` and `Cannot find module './aggregate'`.

- [ ] **Step 3: Implement `queue.ts`**

```ts
export type QueueFilter = "all" | "solo" | "flex" | "aram" | "normal";

export const QUEUE_FILTERS: readonly QueueFilter[] = ["all", "solo", "flex", "aram", "normal"];

/** Which queue ids a filter keeps (`include`) or drops (`exclude`). */
export interface QueueSelection {
	mode: "include" | "exclude";
	ids: number[];
}

const SELECTIONS: Record<QueueFilter, QueueSelection> = {
	all: { mode: "exclude", ids: [1700, 1710] },
	solo: { mode: "include", ids: [420] },
	flex: { mode: "include", ids: [440] },
	aram: { mode: "include", ids: [450] },
	normal: { mode: "include", ids: [400, 430, 480, 490] },
};

/** `?queue=` value to a filter; missing means `all`, unknown values return `null`. */
export function parseQueueFilter(value: string | null): QueueFilter | null {
	if (value === null) return "all";
	return (QUEUE_FILTERS as readonly string[]).includes(value) ? (value as QueueFilter) : null;
}

/** Queue ids behind a filter. */
export function queueSelection(filter: QueueFilter): QueueSelection {
	return SELECTIONS[filter];
}
```

- [ ] **Step 4: Create `src/lib/validators/champion-stats.ts`**

```ts
import { z } from "zod";

export const championStatSchema = z.object({
	championId: z.number(),
	championName: z.string(),
	games: z.number(),
	wins: z.number(),
	winRate: z.number(),
	kills: z.number(),
	deaths: z.number(),
	assists: z.number(),
	kda: z.number(),
	csPerMin: z.number(),
	damagePerMin: z.number(),
});

export type ChampionStat = z.infer<typeof championStatSchema>;
```

- [ ] **Step 5: Implement `aggregate.ts`**

```ts
import { type ChampionStat } from "@/lib/validators/champion-stats";

/** Totals per champion as returned by the aggregation query. */
export interface ChampionStatRow {
	championId: number;
	championName: string;
	games: number;
	wins: number;
	kills: number;
	deaths: number;
	assists: number;
	cs: number;
	damage: number;
	durationSeconds: number;
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

/** Totals to per-game averages and rates; perfect KDA is kills + assists, zero duration gives 0 rates. */
export function toChampionStat(row: ChampionStatRow): ChampionStat {
	const minutes = row.durationSeconds / 60;
	const perMinute = (total: number) => (minutes > 0 ? round2(total / minutes) : 0);
	const perGame = (total: number) => round2(total / row.games);

	return {
		championId: row.championId,
		championName: row.championName,
		games: row.games,
		wins: row.wins,
		winRate: round2((row.wins / row.games) * 100),
		kills: perGame(row.kills),
		deaths: perGame(row.deaths),
		assists: perGame(row.assists),
		kda: round2(row.deaths > 0 ? (row.kills + row.assists) / row.deaths : row.kills + row.assists),
		csPerMin: perMinute(row.cs),
		damagePerMin: perMinute(row.damage),
	};
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — the `queue` and `aggregate` suites are green.

- [ ] **Step 7: Implement `query.ts`**

The row filter uses the existing GIN index on `data->'metadata'->'participants'`, with the same `@>` pattern as `/api/matches`. `jsonb_array_elements` then picks the player's own participant.
```ts
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { queueSelection, type QueueFilter } from "./queue";
import { type ChampionStatRow } from "./aggregate";

const MIN_GAME_DURATION_SECONDS = 300;

/** Per-champion totals for a player over stored matches, remakes excluded. */
export async function queryChampionStats(
	puuid: string,
	filter: QueueFilter,
): Promise<ChampionStatRow[]> {
	const { mode, ids } = queueSelection(filter);
	const queueClause =
		mode === "include"
			? Prisma.sql`AND m."queueId" = ANY(${ids}::int[])`
			: Prisma.sql`AND NOT (m."queueId" = ANY(${ids}::int[]))`;

	return prisma.$queryRaw<ChampionStatRow[]>`
		SELECT
			(p->>'championId')::int AS "championId",
			p->>'championName' AS "championName",
			COUNT(*)::int AS games,
			(COUNT(*) FILTER (WHERE (p->>'win')::boolean))::int AS wins,
			SUM((p->>'kills')::int)::int AS kills,
			SUM((p->>'deaths')::int)::int AS deaths,
			SUM((p->>'assists')::int)::int AS assists,
			SUM((p->>'totalMinionsKilled')::int + (p->>'neutralMinionsKilled')::int)::int AS cs,
			SUM((p->>'totalDamageDealtToChampions')::int)::int AS damage,
			SUM(m."gameDuration")::int AS "durationSeconds"
		FROM "Match" m
		CROSS JOIN LATERAL jsonb_array_elements(m.data->'info'->'participants') AS p
		WHERE m.data->'metadata'->'participants' @> ${JSON.stringify(puuid)}::jsonb
			AND p->>'puuid' = ${puuid}
			AND m."gameDuration" >= ${MIN_GAME_DURATION_SECONDS}
			${queueClause}
		GROUP BY 1, 2
		ORDER BY games DESC, wins DESC
	`;
}
```

- [ ] **Step 8: Create the route `src/app/api/champion-stats/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { parseQueueFilter, QUEUE_FILTERS } from "@/lib/champion-stats/queue";
import { queryChampionStats } from "@/lib/champion-stats/query";
import { toChampionStat } from "@/lib/champion-stats/aggregate";
import { type ChampionStat } from "@/lib/validators/champion-stats";

export async function GET(
	req: NextRequest,
): Promise<NextResponse<ChampionStat[] | { error: string }>> {
	const puuid = req.nextUrl.searchParams.get("puuid");
	const queue = parseQueueFilter(req.nextUrl.searchParams.get("queue"));

	if (!puuid)
		return NextResponse.json({ error: "puuid is required" }, { status: 400 });
	if (!queue)
		return NextResponse.json(
			{ error: `queue must be one of: ${QUEUE_FILTERS.join(", ")}` },
			{ status: 400 },
		);

	try {
		const rows = await queryChampionStats(puuid, queue);
		return NextResponse.json(rows.map(toChampionStat));
	} catch (error) {
		console.error("[api/champion-stats] query failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
```

- [ ] **Step 9: Create the hook `src/hooks/useChampionStats.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { type ChampionStat } from "@/lib/validators/champion-stats";
import { type QueueFilter } from "@/lib/champion-stats/queue";

async function fetchChampionStats(puuid: string, queue: QueueFilter): Promise<ChampionStat[]> {
	const params = new URLSearchParams({ puuid, queue });
	const res = await fetch(`/api/champion-stats?${params}`);
	if (!res.ok) throw new Error("Failed to fetch champion stats");
	return res.json();
}

/** Per-champion stats over the player's stored matches. */
export function useChampionStats(puuid: string | undefined, queue: QueueFilter = "all") {
	return useQuery<ChampionStat[]>({
		queryKey: ["champion-stats", puuid, queue],
		queryFn: () => fetchChampionStats(puuid!, queue),
		staleTime: 1000 * 60 * 5,
		enabled: !!puuid,
	});
}
```

- [ ] **Step 10: Verify against the dev database**

```bash
W=.superpowers/sdd/2026-10-10-ui-redesign-phase-1-api; PUUID=$(cat $W/puuid.txt); BASE=http://localhost:3000/api
curl -s "$BASE/champion-stats?puuid=$PUUID" | node -pe "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));JSON.stringify({n:r.length,first:r[0],ok:r.every(s=>Object.values(s).every(v=>v!==null))})"
for q in solo flex aram normal; do printf "$q "; curl -s "$BASE/champion-stats?puuid=$PUUID&queue=$q" | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).reduce((a,s)=>a+s.games,0)"; done
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/champion-stats?puuid=$PUUID&queue=urf"
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/champion-stats"
```
Expected:
- The first line shows `n` > 0, a `first` object with all eleven `ChampionStat` fields, and `"ok":true`.
- Each queue prints a game total; solo + flex + aram + normal must be ≤ the `all` total. Get the `all` total by summing `games` in the first command's array.
- The last two lines print `400` and `400`.

If the query throws on the array parameter, read the server log. The likely fix is the cast: try `ANY(${ids})` without `::int[]`, then record the ruling.

- [ ] **Step 11: Typecheck and lint**

Run: `pnpm run typecheck` → no errors.
Run: `npx eslint src/lib/champion-stats src/lib/validators/champion-stats.ts src/app/api/champion-stats src/hooks/useChampionStats.ts` → 0 errors.

---

### Task 4: Recent searches endpoint

**Files:**
- Create: `src/lib/validators/recent-searches.ts`
- Create: `src/lib/recent-searches.ts`, `src/lib/recent-searches.test.ts`
- Create: `src/app/api/recent-searches/route.ts`
- Create: `src/hooks/useRecentSearches.ts`

**Interfaces:**
- Produces:
  - `recentSearchSchema`
  - `type RecentSearch = { puuid: string; gameName: string; tagLine: string; profileIconId: number | null; soloTier: string | null; soloRank: string | null; soloLp: number | null }`
  - `interface RecentSearchRow { puuid: string; gameName: string; tagLine: string; summoner: { profileIconId: number } | null; rankedEntries: { queueType: string; tier: string; rank: string; leaguePoints: number }[] }`
  - `toRecentSearch(row: RecentSearchRow): RecentSearch`
  - `RECENT_SEARCH_LIMIT = 8`
  - `getRecentSearches(): Promise<RecentSearch[]>`
  - `useRecentSearches()` → `useQuery<RecentSearch[]>`

- [ ] **Step 1: Write the failing test**

`src/lib/recent-searches.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { toRecentSearch } from "./recent-searches";

const base = { puuid: "p1", gameName: "Skaikru", tagLine: "HEAVN" };

describe("toRecentSearch", () => {
	it("takes the solo queue rank and the profile icon", () => {
		expect(
			toRecentSearch({
				...base,
				summoner: { profileIconId: 6643 },
				rankedEntries: [
					{ queueType: "RANKED_FLEX_SR", tier: "PLATINUM", rank: "I", leaguePoints: 76 },
					{ queueType: "RANKED_SOLO_5x5", tier: "EMERALD", rank: "I", leaguePoints: 8 },
				],
			}),
		).toEqual({ ...base, profileIconId: 6643, soloTier: "EMERALD", soloRank: "I", soloLp: 8 });
	});

	it("returns nulls for an unranked player without a summoner row", () => {
		expect(toRecentSearch({ ...base, summoner: null, rankedEntries: [] })).toEqual({
			...base,
			profileIconId: null,
			soloTier: null,
			soloRank: null,
			soloLp: null,
		});
	});

	it("ignores flex when there is no solo entry", () => {
		const result = toRecentSearch({
			...base,
			summoner: { profileIconId: 1 },
			rankedEntries: [{ queueType: "RANKED_FLEX_SR", tier: "GOLD", rank: "II", leaguePoints: 10 }],
		});
		expect(result.soloTier).toBeNull();
	});
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './recent-searches'`.

- [ ] **Step 3: Create the validator `src/lib/validators/recent-searches.ts`**

```ts
import { z } from "zod";

export const recentSearchSchema = z.object({
	puuid: z.string(),
	gameName: z.string(),
	tagLine: z.string(),
	profileIconId: z.number().nullable(),
	soloTier: z.string().nullable(),
	soloRank: z.string().nullable(),
	soloLp: z.number().nullable(),
});

export type RecentSearch = z.infer<typeof recentSearchSchema>;
```

- [ ] **Step 4: Implement `src/lib/recent-searches.ts`**

```ts
import { prisma } from "@/lib/db";
import { type RecentSearch } from "@/lib/validators/recent-searches";

export const RECENT_SEARCH_LIMIT = 8;

/** Account row with the relations `toRecentSearch` reads. */
export interface RecentSearchRow {
	puuid: string;
	gameName: string;
	tagLine: string;
	summoner: { profileIconId: number } | null;
	rankedEntries: { queueType: string; tier: string; rank: string; leaguePoints: number }[];
}

/** Account row to a recent-search card; rank fields come from solo queue only. */
export function toRecentSearch(row: RecentSearchRow): RecentSearch {
	const solo = row.rankedEntries.find((entry) => entry.queueType === "RANKED_SOLO_5x5");
	return {
		puuid: row.puuid,
		gameName: row.gameName,
		tagLine: row.tagLine,
		profileIconId: row.summoner?.profileIconId ?? null,
		soloTier: solo?.tier ?? null,
		soloRank: solo?.rank ?? null,
		soloLp: solo?.leaguePoints ?? null,
	};
}

/** Most recently looked-up accounts across all users. */
export async function getRecentSearches(): Promise<RecentSearch[]> {
	const rows = await prisma.account.findMany({
		where: { gameName: { not: "" } },
		orderBy: { updatedAt: "desc" },
		take: RECENT_SEARCH_LIMIT,
		select: {
			puuid: true,
			gameName: true,
			tagLine: true,
			summoner: { select: { profileIconId: true } },
			rankedEntries: {
				select: { queueType: true, tier: true, rank: true, leaguePoints: true },
			},
		},
	});
	return rows.map(toRecentSearch);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Create the route and the hook**

`src/app/api/recent-searches/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getRecentSearches } from "@/lib/recent-searches";
import { type RecentSearch } from "@/lib/validators/recent-searches";

export async function GET(): Promise<NextResponse<RecentSearch[] | { error: string }>> {
	try {
		return NextResponse.json(await getRecentSearches());
	} catch (error) {
		console.error("[api/recent-searches] query failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
```

`src/hooks/useRecentSearches.ts`:
```ts
import { useQuery } from "@tanstack/react-query";
import { type RecentSearch } from "@/lib/validators/recent-searches";

async function fetchRecentSearches(): Promise<RecentSearch[]> {
	const res = await fetch("/api/recent-searches");
	if (!res.ok) throw new Error("Failed to fetch recent searches");
	return res.json();
}

/** Server-wide recently looked-up summoners for the home page. */
export function useRecentSearches() {
	return useQuery<RecentSearch[]>({
		queryKey: ["recent-searches"],
		queryFn: fetchRecentSearches,
		staleTime: 1000 * 60,
	});
}
```

- [ ] **Step 7: Verify against the dev database**

```bash
curl -s "http://localhost:3000/api/recent-searches" | node -pe "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));JSON.stringify({n:r.length,first:r[0]})"
```
Expected: `n` between 1 and 8, and `first` holds the seven `RecentSearch` fields. If Skaikru was looked up in Task 1, it should appear near the top.

- [ ] **Step 8: Typecheck and lint**

Run: `pnpm run typecheck` → no errors.
Run: `npx eslint src/lib/recent-searches.ts src/lib/validators/recent-searches.ts src/app/api/recent-searches src/hooks/useRecentSearches.ts` → 0 errors.

---

### Task 5: Free rotation endpoint

**Files:**
- Create: `src/lib/validators/rotation.ts`
- Create: `src/lib/riot/rotation.ts`
- Create: `src/lib/rotation.ts`, `src/lib/rotation.test.ts`
- Create: `src/app/api/rotation/route.ts`
- Create: `src/hooks/useRotation.ts`

**Interfaces:**
- Consumes (existing):
  - `riotFetch<T>(url): Promise<T>`
  - `BASE_URL` (platform host, `eun1`)
  - `getAppSetting(key): Promise<string | null>`
  - `setAppSetting(key, value): Promise<void>`
  - `revalidateInBackground`
- Produces:
  - `championRotationSchema` — the Riot response: `freeChampionIds`, `freeChampionIdsForNewPlayers`, `maxNewPlayerLevel`
  - `freeRotationSchema` and `type FreeRotation = { freeChampionIds: number[] }`
  - `getChampionRotation(): Promise<ChampionRotation>`
  - `interface CachedRotation { fetchedAt: string; freeChampionIds: number[] }`
  - `parseCachedRotation(raw: string | null): CachedRotation | null`
  - `serializeRotation(freeChampionIds: number[], now: Date): string`
  - `rotationCacheState(cached: CachedRotation | null, now: Date): "fresh" | "stale" | "missing"`
  - `ROTATION_MAX_AGE_MS = 6h`
  - `ROTATION_SETTING_KEY = "FREE_ROTATION"`
  - `getFreeRotation(now?: Date): Promise<FreeRotation>`
  - `useRotation()` → `useQuery<FreeRotation>`

- [ ] **Step 1: Write the failing tests**

`src/lib/rotation.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
	parseCachedRotation,
	rotationCacheState,
	serializeRotation,
	ROTATION_MAX_AGE_MS,
} from "./rotation";

const now = new Date("2026-10-10T12:00:00Z");

describe("parseCachedRotation", () => {
	it("round-trips a serialized rotation", () => {
		expect(parseCachedRotation(serializeRotation([1, 2, 3], now))).toEqual({
			fetchedAt: "2026-10-10T12:00:00.000Z",
			freeChampionIds: [1, 2, 3],
		});
	});

	it.each([null, "", "{bad", "[]", '{"fetchedAt":"x"}', '{"fetchedAt":"2026-10-10T12:00:00Z","freeChampionIds":["a"]}'])(
		"treats %j as missing",
		(raw) => {
			expect(parseCachedRotation(raw)).toBeNull();
		},
	);

	it("rejects an unparseable date", () => {
		expect(parseCachedRotation('{"fetchedAt":"yesterday","freeChampionIds":[1]}')).toBeNull();
	});
});

describe("rotationCacheState", () => {
	const at = (msAgo: number) => ({
		fetchedAt: new Date(now.getTime() - msAgo).toISOString(),
		freeChampionIds: [1],
	});

	it("is missing without a cache", () => {
		expect(rotationCacheState(null, now)).toBe("missing");
	});

	it("is fresh within the max age", () => {
		expect(rotationCacheState(at(ROTATION_MAX_AGE_MS - 1000), now)).toBe("fresh");
	});

	it("is stale after the max age", () => {
		expect(rotationCacheState(at(ROTATION_MAX_AGE_MS + 1000), now)).toBe("stale");
	});

	it("is stale for a timestamp in the future", () => {
		expect(rotationCacheState(at(-60_000), now)).toBe("stale");
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './rotation'`.

- [ ] **Step 3: Create the validators and the Riot call**

`src/lib/validators/rotation.ts`:
```ts
import { z } from "zod";

export const championRotationSchema = z.object({
	freeChampionIds: z.array(z.number()),
	freeChampionIdsForNewPlayers: z.array(z.number()),
	maxNewPlayerLevel: z.number(),
});

export const freeRotationSchema = z.object({
	freeChampionIds: z.array(z.number()),
});

export type ChampionRotation = z.infer<typeof championRotationSchema>;
export type FreeRotation = z.infer<typeof freeRotationSchema>;
```

`src/lib/riot/rotation.ts`:
```ts
import { BASE_URL, riotFetch } from "./riot";
import { type ChampionRotation } from "@/lib/validators/rotation";

export async function getChampionRotation() {
	return riotFetch<ChampionRotation>(`${BASE_URL}/lol/platform/v3/champion-rotations`);
}
```

- [ ] **Step 4: Implement `src/lib/rotation.ts`**

```ts
import { z } from "zod";
import { getAppSetting, setAppSetting } from "@/lib/app-settings";
import { revalidateInBackground } from "@/lib/cache-utils";
import { getChampionRotation } from "@/lib/riot/rotation";
import { type FreeRotation } from "@/lib/validators/rotation";

export const ROTATION_SETTING_KEY = "FREE_ROTATION";
export const ROTATION_MAX_AGE_MS = 6 * 60 * 60 * 1000;

const cachedRotationSchema = z.object({
	fetchedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
	freeChampionIds: z.array(z.number()),
});

export type CachedRotation = z.infer<typeof cachedRotationSchema>;

/** Stored `AppSettings` value to a rotation; anything invalid counts as missing. */
export function parseCachedRotation(raw: string | null): CachedRotation | null {
	if (!raw) return null;
	try {
		const parsed = cachedRotationSchema.safeParse(JSON.parse(raw));
		return parsed.success
			? { ...parsed.data, fetchedAt: new Date(parsed.data.fetchedAt).toISOString() }
			: null;
	} catch {
		return null;
	}
}

export function serializeRotation(freeChampionIds: number[], now: Date): string {
	return JSON.stringify({ fetchedAt: now.toISOString(), freeChampionIds });
}

/** Cache freshness; a future timestamp counts as stale. */
export function rotationCacheState(
	cached: CachedRotation | null,
	now: Date,
): "fresh" | "stale" | "missing" {
	if (!cached) return "missing";
	const age = now.getTime() - Date.parse(cached.fetchedAt);
	return age >= 0 && age < ROTATION_MAX_AGE_MS ? "fresh" : "stale";
}

async function fetchAndStoreRotation(now: Date): Promise<FreeRotation> {
	const { freeChampionIds } = await getChampionRotation();
	await setAppSetting(ROTATION_SETTING_KEY, serializeRotation(freeChampionIds, now));
	return { freeChampionIds };
}

/** Free rotation from the `AppSettings` cache, refreshed from Riot when older than 6h. */
export async function getFreeRotation(now: Date = new Date()): Promise<FreeRotation> {
	const cached = parseCachedRotation(await getAppSetting(ROTATION_SETTING_KEY));
	const state = rotationCacheState(cached, now);

	if (state === "missing") return fetchAndStoreRotation(now);
	if (state === "stale") {
		revalidateInBackground(async () => {
			await fetchAndStoreRotation(now);
		});
	}
	return { freeChampionIds: cached!.freeChampionIds };
}
```

The stale path answers from the cache straight away and refreshes in the background, so a Riot outage with a stale cache never surfaces as an error. `revalidateInBackground` swallows the failure.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Create the route and the hook**

`src/app/api/rotation/route.ts`:
```ts
import { NextResponse } from "next/server";
import { RiotApiError } from "@/lib/riot/riot";
import { getFreeRotation } from "@/lib/rotation";
import { type FreeRotation } from "@/lib/validators/rotation";

export async function GET(): Promise<NextResponse<FreeRotation | { error: string }>> {
	try {
		return NextResponse.json(await getFreeRotation());
	} catch (error) {
		if (error instanceof RiotApiError)
			return NextResponse.json({ error: error.message }, { status: error.status });

		console.error("[api/rotation] failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
```

`src/hooks/useRotation.ts`:
```ts
import { useQuery } from "@tanstack/react-query";
import { type FreeRotation } from "@/lib/validators/rotation";

async function fetchRotation(): Promise<FreeRotation> {
	const res = await fetch("/api/rotation");
	if (!res.ok) throw new Error("Failed to fetch free rotation");
	return res.json();
}

/** Current free champion rotation. */
export function useRotation() {
	return useQuery<FreeRotation>({
		queryKey: ["rotation"],
		queryFn: fetchRotation,
		staleTime: 1000 * 60 * 60,
	});
}
```

- [ ] **Step 7: Verify against Riot and the database**

```bash
curl -s "http://localhost:3000/api/rotation" | node -pe "const r=JSON.parse(require('fs').readFileSync(0,'utf8'));JSON.stringify({n:r.freeChampionIds?.length,err:r.error})"
curl -s "http://localhost:3000/api/rotation" -o /dev/null -w "%{time_total}\n"
```
Expected:
- First call: `n` is roughly 15–20 with no `err`. This is the Riot path, and it stores `FREE_ROTATION`.
- Second call: it answers from the `AppSettings` cache, faster than the first.

If the first call returns `403`, the production key lacks champion-v3. Record that in the ledger and stop the task; that is a key-permission decision for the user.

- [ ] **Step 8: Typecheck and lint**

Run: `pnpm run typecheck` → no errors.
Run: `npx eslint src/lib/rotation.ts src/lib/riot/rotation.ts src/lib/validators/rotation.ts src/app/api/rotation src/hooks/useRotation.ts` → 0 errors.

---

### Task 6: LP history `range` filter

**Files:**
- Create: `src/lib/lp-history/range.ts`, `src/lib/lp-history/range.test.ts`
- Create: `src/lib/validators/lp-history.ts`
- Modify: `src/app/api/lp-history/route.ts`
- Modify: `src/hooks/useLPHistory.ts`

**Interfaces:**
- Produces:
  - `type LpRange = "7d" | "30d" | "season"`
  - `LP_RANGES: readonly LpRange[]`
  - `parseLpRange(value: string | null): LpRange | "legacy" | null`. Missing means `"legacy"`, which keeps the existing last-100 behaviour; unknown values return `null`.
  - `lpRangeStart(range: LpRange, now: Date): Date`
  - `SEASON_START: Date`
  - `RANGE_SNAPSHOT_LIMIT = 2000`
  - `lpSnapshotSchema` and `type LPSnapshot` (fields unchanged: `id`, `tier`, `rank`, `lp`, `wins: number | null`, `losses: number | null`, `createdAt: string`)
  - `useLPHistory(puuid, queueType?, range?: LpRange)`. Existing two-argument callers keep working.
  - `src/hooks/useLPHistory.ts` keeps exporting `type LPSnapshot`, for `lp-history-chart.tsx` and `match-history.tsx`.

`SEASON_START` is `2026-01-08T00:00:00Z`, the 2026 season start (patch 26.1). Keep it as a single constant so a wrong date is a one-line fix.

- [ ] **Step 1: Write the failing tests**

`src/lib/lp-history/range.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { lpRangeStart, parseLpRange, SEASON_START } from "./range";

const now = new Date("2026-10-10T12:00:00Z");

describe("parseLpRange", () => {
	it("keeps the legacy behaviour when missing", () => {
		expect(parseLpRange(null)).toBe("legacy");
	});

	it.each(["7d", "30d", "season"])("accepts %s", (value) => {
		expect(parseLpRange(value)).toBe(value);
	});

	it.each(["", "1y", "7D", "all"])("rejects %j", (value) => {
		expect(parseLpRange(value)).toBeNull();
	});
});

describe("lpRangeStart", () => {
	it("goes back 7 days", () => {
		expect(lpRangeStart("7d", now).toISOString()).toBe("2026-10-03T12:00:00.000Z");
	});

	it("goes back 30 days", () => {
		expect(lpRangeStart("30d", now).toISOString()).toBe("2026-09-10T12:00:00.000Z");
	});

	it("uses the season start", () => {
		expect(lpRangeStart("season", now)).toEqual(SEASON_START);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './range'`.

- [ ] **Step 3: Implement `range.ts`**

```ts
export type LpRange = "7d" | "30d" | "season";

export const LP_RANGES: readonly LpRange[] = ["7d", "30d", "season"];

export const SEASON_START = new Date("2026-01-08T00:00:00Z");

export const RANGE_SNAPSHOT_LIMIT = 2000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `?range=` value; missing keeps the legacy last-100 behaviour, unknown values return `null`. */
export function parseLpRange(value: string | null): LpRange | "legacy" | null {
	if (value === null) return "legacy";
	return (LP_RANGES as readonly string[]).includes(value) ? (value as LpRange) : null;
}

/** First instant included in a range. */
export function lpRangeStart(range: LpRange, now: Date): Date {
	if (range === "season") return SEASON_START;
	const days = range === "7d" ? 7 : 30;
	return new Date(now.getTime() - days * DAY_MS);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Create `src/lib/validators/lp-history.ts`**

```ts
import { z } from "zod";

export const lpSnapshotSchema = z.object({
	id: z.string(),
	tier: z.string(),
	rank: z.string(),
	lp: z.number(),
	wins: z.number().nullable(),
	losses: z.number().nullable(),
	createdAt: z.string(),
});

export type LPSnapshot = z.infer<typeof lpSnapshotSchema>;
```

- [ ] **Step 6: Rewrite `src/app/api/lp-history/route.ts`**

```ts
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import {
	LP_RANGES,
	lpRangeStart,
	parseLpRange,
	RANGE_SNAPSHOT_LIMIT,
} from "@/lib/lp-history/range";
import { type LPSnapshot } from "@/lib/validators/lp-history";

const LEGACY_SNAPSHOT_LIMIT = 100;

export async function GET(
	req: NextRequest,
): Promise<NextResponse<LPSnapshot[] | { error: string }>> {
	const puuid = req.nextUrl.searchParams.get("puuid");
	const queueType = req.nextUrl.searchParams.get("queueType") ?? "RANKED_SOLO_5x5";
	const range = parseLpRange(req.nextUrl.searchParams.get("range"));

	if (!puuid)
		return NextResponse.json({ error: "puuid is required" }, { status: 400 });
	if (!range)
		return NextResponse.json(
			{ error: `range must be one of: ${LP_RANGES.join(", ")}` },
			{ status: 400 },
		);

	try {
		const history = await prisma.lPHistory.findMany({
			where:
				range === "legacy"
					? { puuid, queueType }
					: { puuid, queueType, createdAt: { gte: lpRangeStart(range, new Date()) } },
			orderBy: { createdAt: "desc" },
			take: range === "legacy" ? LEGACY_SNAPSHOT_LIMIT : RANGE_SNAPSHOT_LIMIT,
		});

		return NextResponse.json(
			history.reverse().map((h) => ({
				id: h.id,
				tier: h.tier,
				rank: h.rank,
				lp: h.lp,
				wins: h.wins,
				losses: h.losses,
				createdAt: h.createdAt.toISOString(),
			})),
		);
	} catch {
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
```

- [ ] **Step 7: Rewrite `src/hooks/useLPHistory.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { type LPSnapshot } from "@/lib/validators/lp-history";
import { type LpRange } from "@/lib/lp-history/range";

export type { LPSnapshot };

async function fetchLPHistory(
	puuid: string,
	queueType: string,
	range?: LpRange,
): Promise<LPSnapshot[]> {
	const params = new URLSearchParams({ puuid, queueType });
	if (range) params.set("range", range);
	const res = await fetch(`/api/lp-history?${params}`);
	if (!res.ok) throw new Error("Failed to fetch LP history");
	return res.json();
}

/** LP snapshots oldest first; without `range` the last 100 are returned. */
export function useLPHistory(
	puuid: string | undefined,
	queueType: string = "RANKED_SOLO_5x5",
	range?: LpRange,
) {
	return useQuery<LPSnapshot[]>({
		queryKey: ["lp-history", puuid, queueType, range ?? "legacy"],
		queryFn: () => fetchLPHistory(puuid!, queueType, range),
		staleTime: 1000 * 60 * 5,
		enabled: !!puuid,
	});
}
```

- [ ] **Step 8: Verify**

```bash
W=.superpowers/sdd/2026-10-10-ui-redesign-phase-1-api; PUUID=$(cat $W/puuid.txt); BASE=http://localhost:3000/api
for r in "" "&range=7d" "&range=30d" "&range=season"; do printf "[$r] "; curl -s "$BASE/lp-history?puuid=$PUUID$r" | node -pe "const a=JSON.parse(require('fs').readFileSync(0,'utf8'));a.length+' '+(a[0]?.createdAt??'-')"; done
curl -s -o /dev/null -w "%{http_code}\n" "$BASE/lp-history?puuid=$PUUID&range=1y"
```
Expected:
- Each line prints a count and the oldest `createdAt`.
- The `7d` count ≤ the `30d` count ≤ the `season` count.
- The `7d` and `30d` oldest dates fall inside their windows.
- The legacy line (no range) is at most 100.
- The last line prints `400`.

Also open `http://localhost:3000/summoner/Skaikru-HEAVN` in the Browser pane and confirm the existing LP history chart still renders, since it uses the legacy call.

- [ ] **Step 9: Typecheck and lint**

Run: `pnpm run typecheck` → no errors.
Run: `npx eslint src/lib/lp-history src/lib/validators/lp-history.ts src/app/api/lp-history src/hooks/useLPHistory.ts` → 0 errors.

---

### Task 7: Phase verification and the phase commit

- [ ] **Step 1: Full suite, typecheck and lint**

Run: `pnpm test` → all green.
Run: `pnpm run typecheck` → no errors.
Run: `pnpm run lint` → the same 6 pre-existing errors as after Phase 0, and no new ones. They are in `api/matches/[id]/route.ts`, `api/matches/[id]/timeline/route.ts`, `api/matches/route.ts` (×2), `summoner/[name]/live/page.tsx` and `summoner/live-game-banner.tsx`.

- [ ] **Step 2: Production build**

Run: `pnpm run build`
Expected: success. `/api/champion-stats`, `/api/recent-searches` and `/api/rotation` are listed as dynamic routes (`ƒ`).

- [ ] **Step 3: Regression pass in the Browser pane**

Open `/summoner/Skaikru-HEAVN` and check that these old components still work on the refactored routes: ranked card, LP chart, mastery list, and the profile header icon and level. The console must show no new errors. Then open `/` and check that the search still navigates to a profile.

- [ ] **Step 4: Commit the phase (single commit)**

```bash
git add -A
git status
git commit -m "$(cat <<'EOF'
feat(api): data layer for the UI redesign

- Extract account, summoner, ranked and mastery fetch-and-upsert into
  lib/summoner; routes and the cron job call the shared functions
- getSummonerProfile: request-deduped server loader for the summoner shell
- GET /api/champion-stats: per-champion aggregates over stored matches
  (queue filter, remakes and Arena excluded)
- GET /api/recent-searches: recently looked-up accounts with solo rank
- GET /api/rotation: free champion rotation cached in AppSettings for 6h
- LP history: optional range=7d|30d|season, Zod schema for snapshots
- Zod schemas, typed hooks and Vitest coverage for the new pure helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```
Before committing, check that `git status` lists no `.env`, `.superpowers/` or `test_matches.json` changes.
