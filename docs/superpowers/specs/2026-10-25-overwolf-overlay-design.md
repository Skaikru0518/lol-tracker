# Summon.gg Overwolf overlay — design

An Overwolf (ow-electron) companion app for Summon.gg. On a hotkey it opens an overlay over League of Legends that shows who is in the current game: rank, mains, today's results and peak rank for all ten players, like Porofessor does. Clicking a name opens that player's Summon.gg profile without leaving the game.

## Why

The owner plays with friends and wants Summon.gg data in front of them during the loading screen, without alt-tabbing to the site. First audience: the owner and their friends. If it works well, it goes to the Overwolf store with monetization. That later step is out of scope here, but nothing built now should block it.

## Goals

- Loading screen: hotkey opens a full-screen panel with ten player cards (own team on top, enemy below).
- In-game: the same hotkey opens a compact version of the panel.
- Each player name links to `https://summon.vandslab.hu/summoner/{Name-TAG}` and opens inside an overlay window over the game, with an "open in browser" button.
- Looks like Summon.gg: same dark palette and font.
- The Riot API key lives only on the Summon.gg backend.

## Non-goals (this phase)

- Overwolf store submission, ads, subscriptions.
- Champion select data (Riot hides enemy names there).
- 30-day win rate (too many Match-v5 calls per loading screen; dropped by the owner).
- Previous-season rank: our LP history only starts in March 2026 (Season 2026 began 2026-01-08) and Riot's API has none, so it would be empty everywhere. Dropped for now; revisit after the 2027 reset.
- TFT, other games.
- Detailed visual design: done separately afterwards with the `frontend-design` skill, using the current Summon.gg UI as the reference. This document fixes layout and content, not pixel styling.

## Anti-goals

- Anything Riot policy forbids. Concretely: **no Est. MMR and no performance rank in the overlay** (no "alternatives for official skill ranking systems"); no data about players the game deliberately hides; no advice that tells the player what to do.
- An overlay that hammers the shared Riot key. The dev key is shared with production; one loading screen must not cost hundreds of calls.
- Steal game focus or block input: League uses Overwolf "standard" overlay mode (cursor visible, game keeps focus).

## Constraints (project-wide)

- pnpm only. Never run Prisma migrations (the owner does). Never print the Riot key or DB credentials. Don't search new Riot IDs in loops against the shared key.
- Commit straight to `main`, no new branches.
- Minimal comments: only the non-obvious why.
- Zod schemas and inferred types for every API payload; logic in `src/lib/…` with Vitest tests (TDD) in the web app.
- Read `node_modules/next/dist/docs/` before Next.js work (Next 16, see `AGENTS.md`).

## Repository layout (decided)

```
nextjsfullstack/            plain folder, no longer a repo
  summon/                   the current repo, moved whole (including .git, .claude, docs)
  summon-electron/          a new, separate git repo
```

- **Two separate git repos, no pnpm workspace.** Each has its own `package.json` and `pnpm-lock.yaml`. Code shared between them (the API response schema, theme colors) is copied, not imported.
- Moving the current repo is **step 1**, done before any overlay work. Every path inside the repo stays the same, so git shows no changes and the production build is unaffected.
  - The owner stops the dev server and editors first (Windows file locks).
  - After the move, `git status` must be clean, and `pnpm test` and `pnpm build` must pass inside `summon/`.
- Claude Code sessions from then on are opened in `summon/` or `summon-electron/`. Per-project memory is keyed by folder, so it starts fresh there.
- `summon-electron` commits to its own `main`, remote `https://github.com/Skaikru0518/summon-electron.git` (already created by the owner).
- This spec lives in the `summon` repo. `summon-electron` gets a copy under `docs/`.

## Data flow (decided)

1. The app listens to GEP for League of Legends (game id 5426) and the League launcher (10902). Both are in Overwolf's production environment for ow-electron.
2. When the launcher's `game_flow.phase` reaches `GameStart`/`InProgress`, the app reads the local player's puuid from launcher `lobby_info.player_info` (fallback: `summoner_info`) and the platform from launcher `summoner_info.platform_id` (EUN1/EUW1). *(Builder's call.)* Platforms other than EUNE/EUW: the app shows "server not supported".
3. The app's **main process** calls the Summon.gg backend with that puuid and platform (main-process fetch, so no CORS changes on the site).
4. The backend uses the existing Spectator-v5 live-game code with the **platform sent by the app**, not `platformOf(puuid)`, because that falls back to EUNE for unknown puuids. It to get the ten participants, then builds all ten cards and returns them in **one response**.
5. Spectator can 404 for a short while after the game starts. The app retries with backoff while the loading screen lasts.
6. GEP `match_info.players_tagline` is the documented fallback source of the ten Riot IDs. Whether it is needed is decided by the spike below.

### Spike first (throwaway, before the real build)

A minimal ow-electron app that logs: launcher phases, `player_info`, `players_tagline`/`all_players` timing, and how many seconds after `GameStart` Spectator-v5 starts returning the game. It also opens one `OverlayBrowserWindow` on a hotkey during a real game. Its findings decide whether the Riot-ID fallback endpoint variant is built. The owner runs the game; the builder reads the logs.

## Backend: overlay endpoint (in `summon/`)

New route, e.g. `GET /api/overlay/game?puuid=…&platform=…&since=…` (exact name is the builder's call). `since` is the epoch ms of the user's local midnight, sent by the app, so "today" means the user's day.

Response: Zod-validated, the same schema copied into `summon-electron`. Shape:

- game: `queueId`, `platform`, `gameStartTime`
- ten players, each: `puuid`, `gameName`, `tagLine`, `teamId`, `championId`, `isSelf`
  - `rank`: tier, division, LP, season wins/losses (from the league-v4 call, so free)
  - `mains`: top 3 champions by mastery
  - `today`: wins and losses since `since`
  - `peak`: highest rank recorded in our `LPHistory` (see below), or null
  - `tags`: e.g. on-fire streak, one-trick, using the existing badge/achievement logic where it already exists
  - per-section availability so the UI can show "—" for a part that failed (rate limited) instead of failing the card

Rules:

- **Which rank queue:** Ranked Flex games show Flex; every other queue shows Solo/Duo. *(Builder's call recorded here.)*
- **Today W/L** counts games in the current game's queue since `since`: one Match-v5 ids call per player (with `startTime` and `queue`), then details only for matches not already stored. Stored matches are never fetched again.
- **Peak** = highest tier/division/LP in `LPHistory` for that queue in the current season. *(Builder's call; the source is only what we have tracked, which the Riot API cannot fill in.)*
- **All ten players become tracked accounts** (owner's decision): the endpoint creates/updates their `Account` with the real Riot ID and the game's platform, and saves ranked entries through the path that also writes `LPHistory` (`saveRankedEntries`), not the `ranked/batch` path that creates `gameName: ""` accounts. They then join the ranked cron, so peak fills in over time. The cron is already budgeted (fixed batch per run, cursor, active-first), which keeps per-run cost bounded as the account count grows.
- Players with no LP history yet: peak is null and shown as "—".
- Caching: reuse the existing per-player caches (RankedEntry, ChampionMastery, Match). The whole response is also cached briefly (a few minutes) per game, so reopening the overlay costs nothing.
- **Match-detail cap:** at most ~30 new Match-v5 detail fetches per request across all ten players *(builder's call)*. If today's games need more, `today` is marked partial (shown e.g. as "3W 1L+") and later opens fill it in from what got stored.
- **Abuse protection** *(builder's call)*: the response is cached per Spectator `gameId`, so requests for any of the ten puuids hit the same entry; plus a simple per-IP rate limit on the route. An app token is deferred to the store phase.
- On 429 the endpoint returns what it already has with the affected sections marked unavailable. It never retries in a loop.
- Reuse the existing services (`getLiveGame`, the ranked batch logic, mastery, match store, season helpers). Don't trigger the full profile sync (match backfill, achievements) for the ten players.

## Electron app (`summon-electron/`)

- ow-electron, TypeScript. Renderer UI in React (same stack as the site) unless the Overwolf sample makes that unreasonable; the builder starts from Overwolf's official ow-electron sample/boilerplate.
- **Desktop window:** status (waiting for game / in game / error), hotkey setting, on/off toggle. Overwolf expects hotkey settings inside the app.
- **Overlay window** (`OverlayBrowserWindow`, standard mode):
  - Loading screen: full panel, two team rows of five cards.
  - In-game: compact panel (rank, today W/L, mains).
  - Toggled by one hotkey with a modifier; default **Alt+Z**, changeable in settings (plain keys clash with League; Overwolf forums report stuck keys with non-modifier hotkeys).
  - Closes automatically when the game ends.
- **Profile window:** clicking a name opens a second overlay window that loads the Summon.gg profile URL, with a close button and an "open in browser" button (`shell.openExternal`).

## UI content (decided with mockups)

Layout A: like Porofessor. Reference mockups (local, git-ignored): `.superpowers/brainstorm/1864-1792875747/content/overlay-a-v2.html` and `card-border-v3.html` (variant A).

- Top bar: Summon.gg logo, queue and platform, hotkey hint.
- "Your team" row (blue) above the "Enemy" row (red), five cards each.
- **Loading-screen card:**
  - Riot ID (game name and dimmed tag) as a link with ↗
  - rank emblem/color, tier and division, LP
  - 2–3 main champion icons
  - today's W/L
  - season W/L
  - peak rank, "—" when unknown
  - chips (On Fire, OTP)
- The own card has a purple (primary) ring.
- **Card border:** a gradient in the team color, strong at the top and fading toward the bottom. No colored top strip.
- **Theme:** Summon.gg dark tokens copied from `summon/src/app/globals.css` (`.dark`): background `#0d0f1a`, card `#151827`, border `#252a40`, primary `#b05ad6`, gold `#e9b949`, win `#34c38f`, loss `#ef5350`, team blue `#4f8fe6`, team red `#ef5350`, muted text `#7d829c`. Font: Geist / Geist Mono.

## Testing

- Backend: Vitest unit tests for the card builder (today W/L and the match-detail cap, peak, queue choice, account tracking, partial data on 429), in the style of the existing tests.
- Electron: unit tests for pure logic (phase → overlay state, retry/backoff, response parsing). In-game behavior is checked by the owner in a real game; the builder gives them a short checklist.
- The web app's existing test suite stays green after the move.

## Left to the builder

- Endpoint name, file split, cache mechanism and TTL.
- Retry timings and how long to keep retrying Spectator.
- Electron project structure and build tooling, and how the renderer is bundled.
- How tags are computed from existing logic, and which ones ship first.
- How a friend installs the phase-1 build (follow Overwolf's ow-electron onboarding and testing docs).
