# EUW Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support EUW next to EUNE: a platform picker in the search, platform-aware Riot calls, and the account's platform stored on `Account`, with profile URLs unchanged.

**Architecture:** A small platform registry (`lib/game/platforms.ts`) feeds every platform-host Riot wrapper. Each account's platform lives in `Account.platform`; server code reads it with `platformOf(puuid)`, so client hooks keep passing only puuid. One injected-dependency function, `locatePlatform`, decides which platform a Riot ID lives on, for both the profile page (no hint) and the search (picker hint).

**Tech Stack:** Next.js 16 App Router (route params are a `Promise`; layouts get no `searchParams`), Prisma 7, Zod 4, TanStack Query 5, Tailwind 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-22-euw-support-design.md`

## Global Constraints

- pnpm only. Never apply migrations: create the migration file; the user runs it. `pnpm prisma generate` (client only) is allowed.
- Work on `main`; one commit per task.
- Very few comments (only a non-obvious why). Zod schemas for network payloads, types via `z.infer`. Small components, one per file. Sizes in rem.
- Tests: `src/**/*.test.ts` only, `pnpm vitest run <file>`.
- Shared dev Riot key: no Riot-calling loops while verifying.
- Platforms: `eune` → host `eun1`, label `EUNE`; `euw` → host `euw1`, label `EUW`; `DEFAULT_PLATFORM = "eune"`.
- Active region: `GET https://europe.api.riotgames.com/riot/account/v1/region/by-game/lol/by-puuid/{puuid}` → `{ puuid, game, region }` (verified in the Riot docs; `region` is e.g. `"eun1"`, `"euw1"`).
- Profile URLs stay `/summoner/{Name-TAG}/…`. Free rotation stays on EUNE.
- Apex cut-off AppSettings key: `apex-cutoffs:{platform}`. localStorage picker key: `summon-gg-platform`.

## Review Focus

1. Migration not applied yet while the new code runs: Prisma errors on `Account.platform` must not be swallowed silently — the plan's last task stops and asks the user to apply it before the browser check.
2. Active-region answer is a platform the app does not support (e.g. `na1`): the profile shows not-found, the search shows not-found, no redirect loop.
3. Live-game participants with no `Account` row: ranks are fetched on the viewed profile's platform and placeholder accounts store that platform.
4. An account switches platform (stored `eune`, now found on `euw`): ranked/mastery/summoner rows are replaced, not mixed; the MMR line uses the new platform's cut-offs.
5. Old localStorage search history (plain `"Name#TAG"` strings) keeps working after the change.

Lines 2, 4, 5 have tests in Tasks 3 and 6; lines 1 and 3 are checked in Tasks 8 and 4.

---

### Task 1: Platform registry and platform-aware Riot wrappers

**Files:**
- Create: `src/lib/game/platforms.ts`, `src/lib/game/platforms.test.ts`
- Create: `src/lib/validators/account-region.ts`
- Modify: `src/lib/riot/riot.ts` (remove `BASE_URL`, rename `EURPOE_URL` → `EUROPE_URL`), `src/lib/riot/{summoner,ranked,mastery,spectator,apex,account,matches,rotation}.ts`
- Modify: every caller of the changed wrappers so the build stays green (pass `DEFAULT_PLATFORM` for now; later tasks replace it with the real platform)

**Interfaces:**
- Produces:
  - `PLATFORMS`, `type Platform = "eune" | "euw"`, `DEFAULT_PLATFORM`, `PLATFORM_LIST: Platform[]`
  - `isPlatform(value: unknown): value is Platform`
  - `platformUrl(platform: Platform): string`
  - `platformFromRiotRegion(region: string | null | undefined): Platform | null` (case-insensitive host match)
  - `accountRegionSchema = z.object({ puuid: z.string(), game: z.string(), region: z.string() })`
  - Wrappers: `getSummonerByPuuid(platform, puuid)`, `getRankedByPuuid(platform, puuid)`, `getTopMasteries(platform, puuid, count = 5)`, `getAllMasteries(platform, puuid)`, `getLiveGame(platform, puuid)`, `getApexLeague(platform, tier, queue)`, `getActiveRegion(puuid): Promise<AccountRegion>` (europe host)
  - `getChampionRotation()` uses `platformUrl(DEFAULT_PLATFORM)`

- [ ] **Step 1: Failing tests** — `platforms.test.ts`:

```ts
describe("platforms", () => {
	it("recognises supported platforms only", () => {
		expect(["eune", "euw", "na", "", null].map(isPlatform)).toEqual([true, true, false, false, false]);
	});
	it("builds the platform host URL", () => {
		expect(platformUrl("euw")).toBe("https://euw1.api.riotgames.com");
		expect(platformUrl("eune")).toBe("https://eun1.api.riotgames.com");
	});
	it("maps Riot's active region to a platform", () => {
		expect(platformFromRiotRegion("eun1")).toBe("eune");
		expect(platformFromRiotRegion("EUW1")).toBe("euw");
		expect(platformFromRiotRegion("na1")).toBeNull();
		expect(platformFromRiotRegion(null)).toBeNull();
	});
});
```

- [ ] **Step 2:** `pnpm vitest run src/lib/game/platforms.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement `platforms.ts`, the schema, the wrapper signatures and `getActiveRegion` (parse with `accountRegionSchema`). Update callers with `DEFAULT_PLATFORM` so behaviour is unchanged.
- [ ] **Step 4:** `pnpm vitest run src/lib/game/platforms.test.ts` → PASS; `pnpm tsc --noEmit` → clean (see Task 8 note on stale `.next/dev/types`).
- [ ] **Step 5:** Commit `feat(platform): platform registry and platform-aware Riot wrappers`.

---

### Task 2: `Account.platform` and `platformOf`

**Files:**
- Modify: `prisma/schema.prisma` (`Account.platform String?`)
- Create: `prisma/migrations/20261023120000_add_account_platform/migration.sql`:

```sql
ALTER TABLE "Account" ADD COLUMN "platform" TEXT;
UPDATE "Account" SET "platform" = 'eune';
```

- Create: `src/lib/summoner/profile/platform.ts`

**Interfaces:**
- Consumes: `Platform`, `isPlatform`, `DEFAULT_PLATFORM` (Task 1)
- Produces:
  - `storedPlatform(value: string | null | undefined): Platform | null` in `src/lib/game/platforms.ts` (pure, so its test loads no Prisma)
  - `platformOf(puuid: string): Promise<Platform>` in `src/lib/summoner/profile/platform.ts` (Account row → `storedPlatform` → `DEFAULT_PLATFORM`)

- [ ] **Step 1: Failing test** — add to `src/lib/game/platforms.test.ts`:

```ts
it("reads a stored platform, ignoring unknown values", () => {
	expect(storedPlatform("euw")).toBe("euw");
	expect(storedPlatform("na")).toBeNull();
	expect(storedPlatform(null)).toBeNull();
});
```
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement; write the migration file; `pnpm prisma generate`. **Step 4:** Run → PASS, `pnpm tsc --noEmit` clean.
- [ ] **Step 5:** Commit `feat(platform): store each account's platform`.

---

### Task 3: `locatePlatform` and platform-aware profile resolution

**Files:**
- Create: `src/lib/summoner/profile/locate.ts`, `src/lib/summoner/profile/locate.test.ts`
- Modify: `src/lib/summoner/profile/summoner.ts`, `src/lib/summoner/profile/get-profile.ts`, `src/lib/summoner/profile/get-profile.test.ts` (it expects `"Agurin-EUW"` → null; update to the new behaviour or mock)

**Interfaces:**
- Consumes: Task 1 wrappers and `platformFromRiotRegion`; Task 2 `platformOf` / `storedPlatform`
- Produces:
  - `locatePlatform<S>(input: { hint?: Platform | null; stored?: Platform | null }, deps: { trySummoner: (p: Platform) => Promise<S | null>; activeRegion: () => Promise<string | null> }): Promise<{ platform: Platform; summoner: S } | null>` — order: hint → stored → `platformFromRiotRegion(await activeRegion())`; skip platforms already tried; call `activeRegion` only when earlier tries fail.
  - `resolveSummoner(platform: Platform, puuid: string): Promise<Summoner | null>` — `null` on Riot 404. DB row is used only when `Account.platform === platform`; a fetch on a different platform than stored sets `Account.platform` and deletes the account's `RankedEntry` and `ChampionMastery` rows before storing the new summoner.
  - `getSummonerProfile(slug)` returns `SummonerProfile & { platform: Platform }`, using `locatePlatform({ stored })` (no hint).
  - `locateAccount(gameName: string, tagLine: string, hint: Platform | null): Promise<{ account: Account; platform: Platform } | null>` (used by Task 6's route).

- [ ] **Step 1: Failing tests** — `locate.test.ts` (fake deps record calls):
  - `"uses the hint when a summoner is found there"` → `{ platform: "euw" }`, `activeRegion` not called.
  - `"falls back from the hint to the stored platform"` (hint euw → null, stored eune → found) → `eune`.
  - `"asks Riot for the active region when nothing else works"` (stored eune → null, activeRegion `"euw1"`) → `euw`.
  - `"never tries a platform twice"` (hint eune, stored eune, activeRegion `"eun1"`, all null) → `trySummoner` called once with `"eune"`, result null.
  - `"is not found for an unsupported active region"` (activeRegion `"na1"`) → null.
  - `"without hint or stored platform goes straight to the active region"` → first `trySummoner` call is the active region's platform.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS; `pnpm vitest run src/lib/summoner/profile` → PASS.
- [ ] **Step 5:** Commit `feat(platform): locate the platform a Riot ID plays on`.

---

### Task 4: Ranked, mastery and live game on the account's platform

**Files:**
- Modify: `src/lib/summoner/profile/ranked.ts` (`resolveRankedEntries` uses `platformOf`), `src/app/api/cron/ranked/route.ts` (select `platform`, call `getRankedByPuuid(storedPlatform(a.platform) ?? DEFAULT_PLATFORM, puuid)`), `src/lib/summoner/champions/mastery.ts`, `src/app/api/live-game/route.ts`, `src/app/api/ranked/batch/route.ts` (`?platform=` param, validated with `isPlatform`, default EUNE; placeholder accounts get `platform`), `src/hooks/usePlayerRanks.ts` (`usePlayerRanks(puuids, platform)`), `src/components/live/live-game.tsx` (pass the context platform — available after Task 7; until then `DEFAULT_PLATFORM`)

**Interfaces:**
- Consumes: Task 1 wrappers, Task 2 `platformOf` / `storedPlatform`
- Produces: `usePlayerRanks(puuids: string[] | undefined, platform: Platform)`; `/api/ranked/batch?puuids=&platform=`

- [ ] **Step 1:** No new pure logic; the existing suites cover these modules. Make the changes.
- [ ] **Step 2:** `pnpm tsc --noEmit` clean; `pnpm vitest run` → all pass.
- [ ] **Step 3:** Commit `feat(platform): ranked, mastery and live game on the account's platform`.

---

### Task 5: Apex cut-offs per platform

**Files:**
- Modify: `src/lib/game/apex-cutoffs.ts` (+ `apexCacheKey`), `src/lib/game/apex-cutoffs.test.ts`, `src/lib/summoner/profile/apex-cutoffs-store.ts`, `src/app/api/ranked/apex-cutoffs/route.ts` (`?platform=`), `src/app/api/cron/apex-cutoffs/route.ts` (refresh every platform, answer `{ ok, cutoffs: { eune, euw } }`), `src/hooks/useApexCutoffs.ts`, `src/components/summoner/matches/match-list.tsx`, `src/lib/summoner/profile/mmr.ts`

**Interfaces:**
- Produces:
  - `apexCacheKey(platform: Platform): string` → `apex-cutoffs:{platform}`
  - Store: `apexCutoffs(platform)`, `forceRefreshApexCutoffs(platform)`, `cachedApexCutoffs(platform)`; `attempts` and `inFlight` become `Map<Platform, …>`
  - `useApexCutoffs(platform: Platform)` (query key `["apex-cutoffs", platform]`)
  - `getApexLeague(platform, tier, queue)` from Task 1

- [ ] **Step 1: Failing test** — `apex-cutoffs.test.ts`:

```ts
it("keys the cache per platform", () => {
	expect(apexCacheKey("eune")).toBe("apex-cutoffs:eune");
	expect(apexCacheKey("euw")).toBe("apex-cutoffs:euw");
});
```

- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement; `mmr.ts` uses `cachedApexCutoffs(await platformOf(puuid))`; `match-list.tsx` takes the platform from `useSummonerContext()` (Task 7 adds it; until then pass `DEFAULT_PLATFORM` via a prop default). **Step 4:** Run → PASS; full suite green.
- [ ] **Step 5:** Commit `feat(platform): Grandmaster and Challenger cut-offs per platform`.

---

### Task 6: Search — picker, locate route, history, suggestions

**Files:**
- Create: `src/app/api/summoner/locate/route.ts`, `src/hooks/useLocateSummoner.ts` (or a plain async `locateSummoner()` in `src/lib/summoner/search/locate-client.ts`), `src/components/search/platform-picker.tsx`, `src/lib/home/platform-preference.ts`
- Modify: `src/lib/home/search-history.ts` (+ test), `src/components/search/summoner-search.tsx`, `src/components/search/search-history.tsx`, `src/components/search/search-suggestions.tsx`, `src/lib/summoner/search/search.ts`, `src/lib/home/recent-searches.ts`, `src/lib/validators/recent-searches.ts`, `src/components/home/recently-searched.tsx`

**Interfaces:**
- Consumes: Task 3 `locateAccount`, Task 1 `isPlatform`, `PLATFORMS`, `PLATFORM_LIST`, `DEFAULT_PLATFORM`
- Produces:
  - `GET /api/summoner/locate?gameName=&tagLine=&platform=` → `{ slug: string; platform: Platform }` (Zod `locateResultSchema`) or 404 `{ error }`; 400 on missing params; unknown `platform` param is treated as no hint.
  - `type SearchHistoryEntry = { riotId: string; platform: Platform }`; `parseSearchHistory(raw): SearchHistoryEntry[]`; `addSearchHistory(entry: SearchHistoryEntry)`
  - `readPlatformPreference(): Platform`, `writePlatformPreference(p: Platform)` (localStorage `summon-gg-platform`, try/catch, default EUNE)
  - `PlatformPicker({ value, onChange, compact }: { value: Platform; onChange: (p: Platform) => void; compact?: boolean })`
  - `RecentSearch` gains `platform: Platform`

- [ ] **Step 1: Failing tests** — `search-history.test.ts` (create if missing):

```ts
it("reads legacy plain Riot IDs as EUNE entries", () => {
	expect(parseSearchHistory(JSON.stringify(["Faker#KR1"]))).toEqual([{ riotId: "Faker#KR1", platform: "eune" }]);
});
it("keeps stored entries and drops invalid ones", () => {
	const raw = JSON.stringify([{ riotId: "A#EUW", platform: "euw" }, { riotId: "B#1", platform: "na" }, 42, { platform: "euw" }]);
	expect(parseSearchHistory(raw)).toEqual([{ riotId: "A#EUW", platform: "euw" }]);
});
```

- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement:
  - `SummonerSearch` holds `platform` state (initialised from `readPlatformPreference()` after mount), renders `PlatformPicker` left of the input, and `go()` calls the locate route; on success `addSearchHistory({ riotId, platform: result.platform })` and `router.push('/summoner/' + slug)`; on 404 `router.push('/summoner/' + toSummonerSlug(...))` so the existing not-found page shows; keep the existing loading/disabled state while locating.
  - History chips and suggestion picks call the same `go()` with their own platform as hint.
  - Suggestions and recently-searched rows show `PLATFORMS[p].label` as a small muted tag.
- [ ] **Step 4:** Run → PASS; full suite green; `pnpm eslint src` → only the 4 known errors.
- [ ] **Step 5:** Commit `feat(search): platform picker and platform-aware search`.

---

### Task 7: Profile shell and copy

**Files:**
- Modify: `src/app/summoner/[name]/layout.tsx`, `src/components/summoner/shell/summoner-provider.tsx` (+ `platform`), `src/components/summoner/shell/summoner-hero.tsx` (label instead of `EUNE`), `src/lib/summoner/profile/metadata.ts` (+ test if present), `src/components/home/home-hero.tsx` (`EUNE & EUW`), `src/app/summoner/not-found.tsx` (drop "only tracks EUNE accounts"), and the Task 4/5 placeholders (`live-game.tsx`, `match-list.tsx`) to read `useSummonerContext().platform`

**Interfaces:**
- Consumes: Task 3 `getSummonerProfile` → `platform`
- Produces: `SummonerContextValue.platform: Platform`; `buildProfileMetadata(profile, …)` uses `PLATFORMS[profile.platform].label`

- [ ] **Step 1: Failing test** — in the metadata test (create `metadata.test.ts` if absent): a profile with `platform: "euw"` → description contains `(EUW)`; `"eune"` → `(EUNE)`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS; full suite, typecheck, lint.
- [ ] **Step 5:** Commit `feat(platform): show the profile's platform`.

---

### Task 8: Migration hand-off and browser check

- [ ] **Step 1:** Stop and ask the user to apply `20261023120000_add_account_platform`. Do not continue until they confirm.
- [ ] **Step 2:** With the dev server running (restart regenerates `.next/dev/types`; until then typecheck with a config that excludes `.next/dev`), once each, no reload loops:
  - search an EUW Riot ID with the picker on EUW → EUW profile, hero says EUW, ranked card and live banner load;
  - open an EUW profile URL whose account has no stored platform → resolves via active region;
  - search an EUNE Riot ID with the picker on EUW → lands on the EUNE profile;
  - an existing EUNE profile still loads unchanged; old search-history chips still work.
- [ ] **Step 3:** `GET /api/cron/apex-cutoffs` with the cron secret header → `cutoffs` has `eune` and `euw`.
- [ ] **Step 4:** Report; fix only what is broken, test-first when the fix is in logic.
