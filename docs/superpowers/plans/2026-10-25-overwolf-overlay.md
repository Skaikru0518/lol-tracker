# Summon.gg Overwolf Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An ow-electron app that shows all ten players of the current League game (rank, mains, today's W/L, tags) in a hotkey overlay, and the Summon.gg site in its desktop window, backed by one new Summon.gg endpoint.

**Architecture:** The current repo moves whole into `nextjsfullstack/summon/`; a new repo `nextjsfullstack/summon-electron/` holds the app. The app reads the local puuid and platform from Overwolf GEP (launcher), calls `GET /api/overlay/game` from its main process, and renders the cards in an `OverlayBrowserWindow`. The backend builds the ten cards from Spectator-v5, existing ranked/mastery caches, stored achievements and a capped number of Match-v5 calls.

**Tech Stack:** Next.js 16, Prisma 7, Zod 4, Vitest (summon). ow-electron + `@overwolf/ow-electron-packages-types`, TypeScript, React + Vite renderer, Vitest (summon-electron). pnpm only.

**Spec:** `docs/superpowers/specs/2026-10-25-overwolf-overlay-design.md` (in the summon repo; after Task 1 it is at `summon/docs/superpowers/specs/…`).

## Global Constraints

- pnpm only. Never run Prisma migrations (this plan needs none). Never print the Riot key or DB credentials.
- Dev Riot key is shared with production: no call loops, no searching new Riot IDs, no manual hammering of the new endpoint. The spike polls only the existing `/api/live-game` endpoint, at most once every 5 s, at most 24 times per game.
- Commit straight to `main` in both repos, no new branches. Don't push either repo; the owner pushes and deploys.
- Minimal comments: only the non-obvious why. Zod schemas + inferred types for every payload.
- summon: logic in `src/lib/…`, Vitest TDD, read `node_modules/next/dist/docs/` before touching route code (Next 16).
- Site base URL: `https://summon.vandslab.com`. Profile URL: `https://summon.vandslab.com/summoner/{encodeURIComponent(`${gameName}-${tagLine}`)}` (same as `toSummonerSlug`).
- Overlay must not show Est. MMR, performance rank, or anything during champion select.
- Hotkey default `Alt+Z`, configurable. Overlay runs in Overwolf "standard" mode.
- Match-detail cap: at most 30 new Match-v5 detail fetches per overlay request. Response cache TTL: 60 s.
- Theme tokens (copy into the app): background `#0d0f1a`, nav `#0a0c15`, card `#151827`, border `#252a40`, secondary `#1d2136`, foreground `#d4d7e6`, muted `#7d829c`, primary `#b05ad6`, gold `#e9b949`, win `#34c38f`, loss `#ef5350`, team blue `#4f8fe6`, team red `#ef5350`. Font Geist / Geist Mono.
- **Gate:** Task 9 (designs) must be approved by the owner before Tasks 12–13 start.

## Review Focus

1. Bots and blank Riot IDs in Spectator data (custom/co-op games, `riotId` empty, puuid not a real account) → those cards render with champion only; no `Account` row is written for them. Test in Task 6.
2. Account whose stored platform differs from the game's platform (moved EUNE→EUW) → handled like `recordPlatform` (old ranked/mastery rows dropped, platform updated), never mixed. Test in Task 6.
3. Riot 429 halfway through a request → the response still returns, with later sections listed in `unavailable`, and no further Riot calls are made in that request. Test in Task 6.
4. App started while League is already in loading screen or in game → the state machine recovers from the current launcher phase / game info instead of waiting for a phase change. Test in Task 10.
5. Non-standard queues (ARAM, Arena with more than 10 players, custom games with `queueId` 0) → no crash. Today W/L is null for queue 0, Solo/Duo rank is shown outside Flex, and the UI copes with any player count. Tests in Tasks 5 and 6.

---

## Phase 0 — Repositories

### Task 1: Move the current repo into `summon/`

**Files:** whole repo (no content changes).

- [ ] **Step 1: Owner precondition.** Ask the owner to stop the dev server, close editors/terminals using the folder, and confirm. Do not continue without that confirmation (Windows file locks; a half-moved repo is painful).
- [ ] **Step 2: Check clean state.** Run `git -C "G:/Personal/CODING/Personal Projects/nextjsfullstack" status --short`. Expected: empty. If not empty, stop and ask.
- [ ] **Step 3: Move.** Create `nextjsfullstack/summon/` and move **every** entry of `nextjsfullstack/` (including `.git`, `.claude`, `.superpowers`, `.env`, `node_modules`, `.next`) into it, except `summon/` itself. Use a same-volume rename (PowerShell `Move-Item`), not copy+delete.
- [ ] **Step 4: Verify.** In `summon/`: `git status --short` → empty; `pnpm test` → all pass (the same count as before the move, 637+); `pnpm build` → succeeds.
- [ ] **Step 5: Report.** Tell the owner that future Claude Code sessions should be opened in `summon/` or `summon-electron/`, and that per-folder memory starts fresh there. No commit (nothing changed inside the repo).

From here on, summon paths are relative to `nextjsfullstack/summon/`.

---

## Phase 1 — Spike (throwaway)

### Task 2: ow-electron spike

Throwaway code in `nextjsfullstack/spike-ow/` (not a repo, never committed). Its output is a findings file.

**Files:**
- Create: `nextjsfullstack/spike-ow/…` (throwaway)
- Create (kept): `nextjsfullstack/summon-electron/docs/spike-findings.md` (written now, committed in Task 7)

- [ ] **Step 1: Read the docs** before writing code: https://dev.overwolf.com/ow-electron/getting-started/overview, the GEP intro https://dev.overwolf.com/ow-electron/live-game-data-gep/live-game-data-gep-intro, the LoL and LoL Launcher GEP pages, and the overlay API reference https://dev.overwolf.com/ow-electron/reference/Overwolf-electron-APIs/overlay/Overview. Install `@overwolf/ow-electron` and `@overwolf/ow-electron-packages-types` from npm with pnpm; enable the `gep` and `overlay` packages as the docs describe.
- [ ] **Step 2: Log to `spike-ow/spike.log`** (timestamped JSON lines):
  - launcher (10902): every `game_flow.phase`, `lobby_info.player_info`, `summoner_info` (`platform_id`, `region`)
  - game (5426): `match_info.players_tagline`, `live_client_data.all_players`, `game_info.teams`, `matchState`, with time since `GameStart`
  - every 5 s after `GameStart` (max 24 tries, stop at first success): `GET https://summon.vandslab.com/api/live-game?puuid=<own puuid>`, logging only status and `inGame`
  - response headers of `GET https://summon.vandslab.com/` (look for `x-frame-options`, `content-security-policy`)
- [ ] **Step 3: Overlay check.** Register `Alt+Z` that toggles one `OverlayBrowserWindow` (standard mode) loading `https://summon.vandslab.com`. Also open a desktop `BrowserWindow` with an `<iframe src="https://summon.vandslab.com">`.
- [ ] **Step 4: Owner runs one real game** (ranked or normal) with the spike running, and reports whether the hotkey, the overlay window and the iframe worked.
- [ ] **Step 5: Write `summon-electron/docs/spike-findings.md`**: which source gives the ten players at loading screen and how many seconds after `GameStart` Spectator answered; whether `players_tagline` arrives during the loading screen; `platform_id` values seen; framing headers; overlay/hotkey/iframe results; anything that contradicts this plan.
- [ ] **Step 6: Decide.** If Spectator answered during the loading screen in the test game, the plan proceeds unchanged. If not, record the ruling in the findings file: add a `riotIds` query variant to Task 7's route that builds the cards from `players_tagline` (resolving puuids via the existing `locateAccount`). Delete `spike-ow/` afterwards.

---

## Phase 2 — Backend (summon repo)

### Task 3: Match id filters and a shared match store

**Files:**
- Modify: `src/lib/riot/matches.ts` (`getMatchIdsByPuuid`)
- Create: `src/lib/match/store.ts`, `src/lib/match/store.test.ts`, `src/lib/riot/matches.test.ts`
- Modify: `src/app/api/matches/route.ts:107-125` (use the store helper)

**Interfaces:**
- Produces: `getMatchIdsByPuuid(puuid: string, count?: number, start?: number, filter?: { startTime?: number; queue?: number }): Promise<string[]>`, where `startTime` is epoch **seconds**, sent as `startTime` and `queue` query params.
- Produces: `fetchAndStoreMatch(matchId: string): Promise<Match>`. It calls `getMatchById`, then does a `prisma.match.upsert` with the same fields as the current route (queueId, gameMode, gameDuration, gameCreation BigInt, data), and returns the match.

- [ ] **Step 1: Failing tests.**
  - `matches.test.ts`: mock `./riot`'s `riotFetch`. Test `"adds startTime and queue filters to the ids request"`: calling `getMatchIdsByPuuid("p1", 20, 0, { startTime: 1761350400, queue: 420 })` requests a URL containing `count=20`, `startTime=1761350400` and `queue=420`. Test `"omits filters that are not given"`: the URL contains neither `startTime` nor `queue`.
  - `store.test.ts`: mock `@/lib/riot/matches` and `@/lib/server/db`. Test `"stores a fetched match once and returns it"`: `prisma.match.upsert` is called with `where: { matchId }`, `update: {}` and `create.gameCreation` as a BigInt.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/riot/matches.test.ts src/lib/match/store.test.ts`. Expected: FAIL (filter not sent, module missing).
- [ ] **Step 3: Implement** both, and replace the inline upsert in `src/app/api/matches/route.ts` with `fetchAndStoreMatch` (keep `cachedMap.set`).
- [ ] **Step 4: Run** the two test files plus `pnpm vitest run src/app/api/matches`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(matches): id filters and a shared match store`.

### Task 4: Overlay response schema

**Files:**
- Create: `src/lib/validators/overlay.ts`, `src/lib/validators/overlay.test.ts`

**Interfaces:**
- Produces (exact):

```ts
export const overlaySectionSchema = z.enum(["rank", "mains", "today"]);
export const overlayTagSchema = z.enum(["on-fire", "one-trick"]);
export const overlayPlayerSchema = z.object({
	puuid: z.string(),
	gameName: z.string(),
	tagLine: z.string(),
	teamId: z.number(),
	championId: z.number(),
	isSelf: z.boolean(),
	rank: z.object({ queueType: z.string(), tier: z.string(), division: z.string(), leaguePoints: z.number(), wins: z.number(), losses: z.number() }).nullable(),
	mains: z.array(z.number()).max(3),
	today: z.object({ wins: z.number(), losses: z.number(), partial: z.boolean() }).nullable(),
	tags: z.array(overlayTagSchema),
	unavailable: z.array(overlaySectionSchema),
});
export const overlayGameSchema = z.object({
	inGame: z.literal(true),
	gameId: z.number(),
	queueId: z.number(),
	platform: platformSchema,
	gameStartTime: z.number(),
	players: z.array(overlayPlayerSchema),
});
export const overlayResponseSchema = z.union([overlayGameSchema, z.object({ inGame: z.literal(false) })]);
export const overlayQuerySchema = z.object({ puuid: z.string().min(1), platform: platformSchema, since: z.coerce.number().int().nonnegative() });
```

plus the inferred types `OverlayPlayer`, `OverlayGame`, `OverlayResponse`, `OverlayQuery`.

- [ ] **Step 1: Failing test** `overlay.test.ts`: `"rejects a query without a platform or with a non-numeric since"` (`overlayQuerySchema.safeParse({ puuid: "p", since: "x" }).success === false`), and `"accepts a not-in-game response"`.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/validators/overlay.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the schema file.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(overlay): response schema`.

### Task 5: Pure overlay helpers

**Files:**
- Create: `src/lib/overlay/cards.ts`, `src/lib/overlay/cards.test.ts`

**Interfaces:**
- Consumes: `rankedQueueForQueueId` (`src/lib/game/ranked-queues.ts`), `isRemake` (`src/lib/match/remake.ts`), `RankedEntry`, `Match` types.
- Produces:
  - `splitRiotId(riotId: string): { gameName: string; tagLine: string }`. It splits at the **last** `#`; with no `#`, the whole string is the game name and the tag is `""`.
  - `overlayRank(entries: RankedEntry[], queueId: number): OverlayPlayer["rank"]`: the Flex entry for queue 440, otherwise the Solo/Duo entry; null when absent. `division` = entry `rank`.
  - `todayRecord(matches: Match[], puuid: string, sinceMs: number, queueId: number): { wins: number; losses: number }`: counts matches with `info.queueId === queueId`, `info.gameCreation >= sinceMs`, not a remake, and the participant with `puuid` present, by `win`.
  - `allocateMatchFetches(missing: string[][], cap: number): { fetch: string[]; partial: boolean[] }`. Input is the missing match ids per player, in player order. It de-duplicates ids across players, then takes them round-robin (each player's first id, then each player's second, …) until `cap`. `partial[i]` is true when any of player i's ids were left out.
  - `overlayTags(achievementIds: string[]): OverlayTag[]`: `win-streak` → `"on-fire"`, `one-trick` → `"one-trick"`, others ignored.

- [ ] **Step 1: Failing tests** in `cards.test.ts`:
  - `splitRiotId("Cool#Guy#EUNE")` → `{ gameName: "Cool#Guy", tagLine: "EUNE" }`; `splitRiotId("")` → `{ gameName: "", tagLine: "" }`.
  - `overlayRank` returns Flex for 440, Solo for 420, 450 and 0, and null when only Flex exists in a 420 game.
  - `todayRecord` ignores an older match, another queue, a remake (`gameDuration` 200) and a match without the player; it counts 2W 1L in a mixed fixture.
  - `allocateMatchFetches([["a","b","c"],["a","d"],[]], 3)` → `fetch: ["a","d","b"]` (or any order containing exactly a, d, b), `partial: [true,false,false]`.
  - `overlayTags(["win-streak","feeder","one-trick"])` → `["on-fire","one-trick"]`.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/overlay/cards.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(overlay): card helpers`.

### Task 6: Overlay game builder

**Files:**
- Create: `src/lib/overlay/overlay-game.ts`, `src/lib/overlay/overlay-game.test.ts`
- Modify: `src/lib/summoner/profile/locate-summoner.ts` (export `recordPlatform`)

**Interfaces:**
- Consumes: `getLiveGame` (`@/lib/riot/spectator`), `resolveRankedEntries` (`@/lib/summoner/profile/ranked`), `resolveTopMasteries` (`@/lib/summoner/champions/mastery`), `getMatchIdsByPuuid` (with filter) and `fetchAndStoreMatch` (Task 3), `recordPlatform`, `storedPlatform`, `prisma` (account, playerAchievement, match), Task 4 types, Task 5 helpers, `RiotApiError`.
- Produces: `buildOverlayGame(query: OverlayQuery, now?: number): Promise<OverlayResponse>`, plus `clearOverlayCache(): void` for tests.

Behavior:

1. Cache: a module `Map<puuid, { value: OverlayGame; expires: number }>`. A hit within 60 s returns it with no Riot or DB calls. A built game is stored under **every** participant's puuid.
2. `getLiveGame(query.platform, query.puuid)`; 404 → `{ inGame: false }` (not cached). Other errors are rethrown.
3. For each participant with a non-empty `riotId` and `puuid`: upsert `Account` (`gameName`/`tagLine` from `splitRiotId`; `create.platform = query.platform`). Then, if the stored platform differs, call `recordPlatform(puuid, stored, query.platform)` so `platformOf` resolves correctly in the next steps. Participants with a blank `riotId` get only `championId`/`teamId`, `rank: null`, `mains: []`, `today: null`, `tags: []`, and all sections in `unavailable`.
4. Per real player, in parallel:
   - `resolveRankedEntries(puuid)` → `overlayRank`.
   - `resolveTopMasteries(puuid, 3)` → champion ids.
   - `prisma.playerAchievement.findMany({ where: { puuid } })` → `overlayTags`.
   - If `queueId > 0`: `getMatchIdsByPuuid(puuid, 20, 0, { startTime: Math.floor(since / 1000), queue: queueId })`.
5. Missing ids are the ones not already in `prisma.match` (one `findMany` for all ids). `allocateMatchFetches(missing, 30)`, then `fetchAndStoreMatch` for each id in `fetch` (sequential, so a 429 stops the rest). `todayRecord` runs over the stored and fetched matches, with `partial` from the allocation.
6. Errors: a `RiotApiError` in a section adds that section to the player's `unavailable`. After the first 429 in the request, no further Riot call is started: remaining sections that would need Riot are marked unavailable, while DB-only data (cached ranks and masteries, tags) is still returned. A non-Riot error is rethrown.
7. `isSelf` = `puuid === query.puuid`.

- [ ] **Step 1: Failing tests** (mock the modules above, in the style of `src/lib/summoner/profile/locate-summoner.test.ts`):
  - `"returns not-in-game when spectator has no game"` (RiotApiError 404).
  - `"builds ten cards with rank, mains, today and tags"`: 10 participants, Flex game (440). The self card has `isSelf: true` and `rank.queueType === "RANKED_FLEX_SR"`.
  - `"creates accounts with the real Riot ID and the game's platform"`: `account.upsert` is called with `create: { puuid, gameName: "Zed", tagLine: "EUW", platform: "euw" }`.
  - `"moves an account whose stored platform differs"`: stored `eune`, query `euw` → `recordPlatform("p1","eune","euw")`.
  - `"skips bots and blank Riot IDs"`: no `account.upsert` for them, and their card has all three sections unavailable.
  - `"caps new match fetches at 30 and marks those players partial"`: 10 players × 5 unique missing ids → `fetchAndStoreMatch` called 30 times, and some `today.partial === true`.
  - `"stops calling Riot after a 429 and still answers"`: the first `fetchAndStoreMatch` throws 429 → called once, response resolves, affected players have `"today"` in `unavailable`.
  - `"has no today record for custom games"`: `queueId` 0 → `getMatchIdsByPuuid` not called, `today === null`.
  - `"serves a teammate's request from the cache"`: build for p1, then for p2 (same game) → `getLiveGame` called once; after 61 s (`now` param), it is called again.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/overlay/overlay-game.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** (export `recordPlatform` without changing its behavior).
- [ ] **Step 4: Run** the file plus `pnpm vitest run src/lib/summoner/profile`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(overlay): build the ten player cards for a live game`.

### Task 7: Route, IP rate limit, and the electron repo bootstrap commit

**Files (summon):**
- Create: `src/lib/server/ip-rate-limit.ts`, `src/lib/server/ip-rate-limit.test.ts`, `src/app/api/overlay/game/route.ts`

**Files (summon-electron):**
- Create: `README.md`, `.gitignore`, `docs/overlay-design.md` (copy of the spec), `docs/spike-findings.md` (from Task 2)

**Interfaces:**
- Produces: `allowRequest(key: string, now?: number): boolean`, a sliding window of **30 requests per 60 s** per key, held in an in-memory Map with entries pruned on access. Also `resetRateLimit(): void` for tests.
- Produces: `GET /api/overlay/game?puuid&platform&since`:
  - Rate key: the first IP in the `x-forwarded-for` header, or `"unknown"`.
  - Limited → 429 `{ error: "Too many requests" }`.
  - Bad query (`overlayQuerySchema`) → 400.
  - Otherwise 200 with `buildOverlayGame(...)`.
  - Upstream `RiotApiError` → its status with `{ error }`; anything else → 500.
  - Wrapped in `withApiLog`, like `src/app/api/live-game/route.ts`.

- [ ] **Step 1: Failing test** `ip-rate-limit.test.ts`: `"allows 30 requests a minute per key and blocks the 31st"`, `"frees the key after the window passes"` (now + 60_001), `"keeps keys independent"`.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/server/ip-rate-limit.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the limiter and the route (read the Next 16 route-handler doc in `node_modules/next/dist/docs/` first).
- [ ] **Step 4: Verify.** `pnpm test` → all pass; `pnpm lint` → clean; `pnpm build` → succeeds. Do **not** call the new endpoint against the real Riot key.
- [ ] **Step 5: Commit (summon)** `feat(overlay): game endpoint with per-IP rate limit`.
- [ ] **Step 6: Bootstrap summon-electron.** In `nextjsfullstack/summon-electron/`: run `git init`, create the files above, `git branch -M main`, `git remote add origin https://github.com/Skaikru0518/summon-electron.git`, and commit `docs: overlay design and spike findings`. Don't push.
- [ ] **Step 7: Tell the owner** to push and deploy summon. The app's real-game tests need the endpoint live.

---

## Phase 3 — Designs (gate)

### Task 8: App skeleton (summon-electron)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `src/main/main.ts`, `src/main/preload.ts`, `src/renderer/index.html`, `src/renderer/desktop/main.tsx`, `src/renderer/overlay/main.tsx`, `src/shared/theme.css`

Decisions:
- Main and preload are compiled by `tsc` to `dist/main`; the renderer is built by Vite (React), with two entries, `desktop` and `overlay`. It runs via the `ow-electron` binary (`pnpm dev` = build + `ow-electron .`).
- `package.json` enables the Overwolf `gep` and `overlay` packages as the docs specify (same as the spike).
- `theme.css` holds the Global Constraints tokens as CSS variables and loads Geist / Geist Mono from Google Fonts.

- [ ] **Step 1:** Scaffold the files; the desktop entry renders "Summon.gg" on the theme background; the overlay entry renders an empty panel.
- [ ] **Step 2: Verify** `pnpm build` succeeds, `pnpm test` runs (no tests yet → passes with no tests), and `pnpm dev` opens the desktop window (owner confirms visually).
- [ ] **Step 3: Commit** `chore: ow-electron skeleton`.

### Task 9: Overlay and desktop designs — OWNER APPROVAL REQUIRED

- [ ] **Step 1:** Invoke the `frontend-design:frontend-design` skill. Use as references: the spec's "UI content" section, the mockups `summon/.superpowers/brainstorm/1864-1792875747/content/overlay-a-v2.html` and `card-border-v3.html` (variant A border), and the current Summon.gg UI (`summon/src/components/summoner/**`, `summon/src/app/globals.css`).
- [ ] **Step 2:** Produce static HTML designs, at 1920×1080 and 2560×1440:
  1. Loading-screen panel (two team rows, full cards).
  2. In-game compact panel (rank, today W/L, mains).
  3. Card states: unranked, `unavailable` sections ("—"), `today.partial` (`3W 1L+`), tags, self card.
  4. Profile overlay window (frame, close, "open in browser").
  5. Desktop window app bar above the iframe (status, hotkey, overlay toggle).
- [ ] **Step 3:** Save to `summon-electron/docs/designs/*.html`, show them to the owner, and iterate until the owner explicitly approves. **Stop here until approval.**
- [ ] **Step 4: Commit** `docs: approved overlay designs`.

---

## Phase 4 — App logic and UI (summon-electron)

### Task 10: Session state machine and API client

**Files:**
- Create: `src/shared/overlay-schema.ts` (verbatim copy of summon's `src/lib/validators/overlay.ts`, with `platformSchema` inlined as `z.enum(["eune","euw"])`)
- Create: `src/main/session.ts`, `src/main/session.test.ts`, `src/main/api.ts`, `src/main/api.test.ts`, `src/main/platform.ts`, `src/main/platform.test.ts`

**Interfaces:**
- Produces:
  - `platformFromPlatformId(id: string | undefined): "eune" | "euw" | null`, mapping `EUN1` → eune and `EUW1` → euw, case-insensitive.
  - `localMidnight(now: Date): number`, the epoch ms of local 00:00.
  - `profileUrl(gameName: string, tagLine: string): string`, built per Global Constraints.
  - `type SessionState = { kind: "idle" } | { kind: "champ-select" } | { kind: "loading" } | { kind: "in-game" } | { kind: "unsupported-platform" }`.
  - `sessionReducer(state: SessionState, event: SessionEvent): SessionState`, where `SessionEvent = { type: "phase"; phase: string } | { type: "match-started"; started: boolean } | { type: "platform"; platform: "eune" | "euw" | null }`:
    - phase `ChampSelect` → champ-select;
    - `GameStart`/`InProgress` → loading;
    - `match-started` true while loading → in-game;
    - `WaitingForStats`/`PreEndOfGame`/`EndOfGame`/`Lobby`/`None` → idle;
    - platform null → unsupported-platform.
  - `retryDelayMs(attempt: number): number`: 3000 for attempts 0–3, 5000 for 4–9, then 10000; `shouldRetry(attempt)` is false from attempt 40.
  - `fetchOverlayGame(query: { puuid: string; platform: "eune" | "euw"; since: number }, fetchImpl = fetch): Promise<OverlayResponse>`. It GETs `https://summon.vandslab.com/api/overlay/game` and parses the result with `overlayResponseSchema`. A non-2xx status throws an `ApiError` with that status.

- [ ] **Step 1: Failing tests:**
  - phase sequence ChampSelect → GameStart → match-started → EndOfGame gives champ-select → loading → in-game → idle;
  - **recovery:** first event phase `InProgress` from idle → loading, and `match-started` true right after → in-game;
  - `platformFromPlatformId("kr")` → null;
  - the retry delays and cutoff;
  - `profileUrl("Cool-Guy","EUNE")` → `https://summon.vandslab.com/summoner/Cool-Guy-EUNE`;
  - `fetchOverlayGame` parses `{ inGame: false }` and throws `ApiError` with status 429.
- [ ] **Step 2: Run** `pnpm test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: session state, API client`.

### Task 11: GEP wiring, settings, windows, hotkey

**Files:**
- Create: `src/main/gep.ts`, `src/main/settings.ts`, `src/main/settings.test.ts`, `src/main/windows.ts`, `src/main/ipc.ts`
- Modify: `src/main/main.ts`, `src/main/preload.ts`

**Interfaces:**
- Consumes: Task 10.
- Produces:
  - `loadSettings(raw: unknown): Settings`, with `Settings = { hotkey: string; overlayEnabled: boolean }` and defaults `{ hotkey: "Alt+Z", overlayEnabled: true }`. It is Zod-parsed, so invalid input falls back to the defaults. Settings are persisted as JSON in `app.getPath("userData")`.
  - IPC to the overlay renderer: `overlay:state` (`SessionState`), `overlay:game` (`OverlayGame` or `null`), `overlay:error` (`string`). From the renderer: `profile:open` (`{ gameName, tagLine }`), `profile:external` (`url`), `settings:get`, `settings:set`.

Behavior:
- `gep.ts`:
  - `setRequiredFeatures` for launcher 10902 (`game_flow`, `lobby_info`, `summoner_info`) and game 5426 (`matchState`, `match_info`).
  - It feeds `sessionReducer`.
  - On startup it reads `getInfo` for both, so the app recovers when it is started mid-game (Review Focus 4).
- On entering `loading`: fetch with `since = localMidnight(new Date())`, and retry using `retryDelayMs`/`shouldRetry` while the result is `inGame: false` and the state is still loading or in-game. Stop on any other state. Send the result to the overlay.
- `windows.ts`:
  - desktop `BrowserWindow` (desktop entry);
  - an overlay `OverlayBrowserWindow` (overlay entry, standard mode), toggled by the hotkey only in loading or in-game, hidden on idle;
  - a profile `OverlayBrowserWindow` created on `profile:open` with `profileUrl(...)`;
  - `profile:external` → `shell.openExternal`.

- [ ] **Step 1: Failing test** `settings.test.ts`: `loadSettings(undefined)` gives the defaults; `loadSettings({ hotkey: 5 })` gives the defaults; `loadSettings({ hotkey: "Ctrl+Shift+S", overlayEnabled: false })` is kept.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** settings, then the GEP, window and IPC wiring per the overlay/GEP docs.
- [ ] **Step 4: Verify.** `pnpm test` passes, `pnpm build` succeeds, and the owner checks in a real game that the hotkey toggles an (empty) overlay at the loading screen and in game, and that it hides after the game.
- [ ] **Step 5: Commit** `feat: GEP session, overlay windows and hotkey`.

### Task 12: Overlay UI (requires Task 9 approval)

**Files:**
- Create: `src/renderer/overlay/App.tsx`, `LoadingPanel.tsx`, `CompactPanel.tsx`, `PlayerCard.tsx`, `ChampionIcon.tsx`, `RankBadge.tsx`, `src/renderer/overlay/view.ts`, `src/renderer/overlay/view.test.ts`, `src/renderer/assets/rank/*.png` (copied from `summon/public/icons/rank/`)

**Interfaces:**
- Consumes: IPC from Task 11 and `OverlayGame` from Task 10.
- Produces (pure, tested):
  - `teamsForView(players: OverlayPlayer[]): { ally: OverlayPlayer[]; enemy: OverlayPlayer[] }`: the self player's team is ally; if no self, team 100 is ally; teams other than 100/200 are split in halves by order.
  - `todayLabel(today: OverlayPlayer["today"]): string`: `"3W 1L"`, `"3W 1L+"` when partial, `"—"` when null or 0–0.
  - `rankLabel(rank, compact: boolean)`: `"Emerald II · 54 LP"` / `"E2"`; unranked → `"Unranked"`; apex tiers have no division (`"Master · 120 LP"` / `"M"`).

Behavior: follow the approved designs exactly.
- Champion icons use Data Dragon (`versions.json` → `champion.json` id map → `cdn/{version}/img/champion/{id}.png`), cached in memory; these are static files, not Riot API calls.
- Names call `profile:open`.
- `loading` renders `LoadingPanel`, `in-game` renders `CompactPanel`.
- While loading with no data yet, show a "Waiting for game data…" state. On `overlay:error`, show a one-line error and keep the last data.

- [ ] **Step 1: Failing tests** `view.test.ts` for the three functions, including no-self and 16-player (Arena) inputs.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the helpers, then the components.
- [ ] **Step 4: Verify.** `pnpm test` and `pnpm build` pass. The owner checks one real game against the designs: cards, hotkey, name → profile window, "open in browser".
- [ ] **Step 5: Commit** `feat: overlay panels`.

### Task 13: Desktop window (iframe + app bar)

**Files:**
- Create: `src/renderer/desktop/App.tsx`, `AppBar.tsx`, `src/renderer/desktop/start-url.ts`, `src/renderer/desktop/start-url.test.ts`

**Interfaces:**
- Produces: `desktopStartUrl(self: { gameName: string; tagLine: string } | null): string`. It returns `profileUrl(...)` when known, else `https://summon.vandslab.com/`.

Behavior:
- The iframe fills the window under the approved app bar. The app bar shows the session status, the hotkey (editable via `settings:set`) and the overlay toggle.
- The self Riot ID comes from launcher `lobby_info.player_info`; add an IPC `self:info` from Task 11's GEP module.
- The iframe changes URL only when the self Riot ID first becomes known, never while the user is browsing inside it.

- [ ] **Step 1: Failing test** `start-url.test.ts`: null gives the home URL; `{ gameName: "Skaikru", tagLine: "HEAVN" }` gives `https://summon.vandslab.com/summoner/Skaikru-HEAVN`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Verify.** `pnpm test` and `pnpm build` pass. The owner checks that the desktop window shows their profile once the League client is logged in, and that the hotkey change applies.
- [ ] **Step 5: Commit** `feat: desktop window with the site`.

### Task 14: Friend install notes

- [ ] **Step 1:** Following Overwolf's ow-electron testing/distribution docs, add `pnpm dist` (ow-electron-builder) producing a Windows installer, and write `README.md` sections: dev setup, building the installer, how a friend installs it, and the in-game checklist (hotkey, loading panel, compact panel, profile window, desktop iframe).
- [ ] **Step 2: Verify** `pnpm dist` produces an installer.
- [ ] **Step 3: Commit** `docs: build and install notes`.
