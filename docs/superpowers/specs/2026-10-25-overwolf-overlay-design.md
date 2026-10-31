# Summon.gg Overwolf overlay — design

An Overwolf (ow-electron) companion app for Summon.gg. On a hotkey it opens an overlay over League of Legends that shows who is in the current game: rank, mains and today's results for all ten players, like Porofessor does. Clicking a name opens that player's Summon.gg profile without leaving the game.

## Why

The owner plays with friends and wants Summon.gg data in front of them during the loading screen, without alt-tabbing to the site. First audience: the owner and their friends. If it works well, it goes to the Overwolf store with monetization. That later step is out of scope here, but nothing built now should block it.

## Goals

- Loading screen: hotkey opens a full-screen panel with ten player cards (own team on top, enemy below).
- In-game: the same hotkey opens a scoreboard-style panel with both teams and live item gold (team totals and laner vs laner).
- Each player name links to `https://summon.vandslab.com/summoner/{Name-TAG}` and opens inside an overlay window over the game, with an "open in browser" button.
- Desktop: the app's main window embeds the Summon.gg site in an iframe, opened on the local player's own profile.
- Champion select: the desktop window switches to a champion select view (your champion pool for your role, and both teams' composition), then back to the site when champion select ends.
- Looks like Summon.gg: same dark palette and font.
- The Riot API key lives only on the Summon.gg backend.

## Non-goals (this phase)

- Overwolf store submission, ads, subscriptions.
- 30-day win rate (too many Match-v5 calls per loading screen; dropped by the owner).
- Peak rank: dropped for now by the owner.
- Previous-season rank: our LP history only starts in March 2026 (Season 2026 began 2026-01-08) and Riot's API has none, so it would be empty everywhere. Dropped for now; revisit after the 2027 reset.
- TFT, other games.
- Builds, buy order and skill order for the player's own champion ("Your <champion>" block, designed in `designs/ingame-a3.html`): no data source yet (needs aggregated match data, tied to the production key). Added in a later round.
- Runes, builds and matchup knowledge ("good/bad into Zed") in champion select: no data source yet, same as the builds above.
- Champion select in the overlay: Overwolf overlays only attach to the game, not the League client, so champion select lives in the desktop window.
- Pixel styling in this document: it fixes layout and content only. The detailed overlay visuals are designed with the `frontend-design` skill (current Summon.gg UI as the reference) **before the overlay UI is implemented, and the owner approves those designs first**.

## Anti-goals

- Anything Riot policy forbids. Concretely: **no Est. MMR and no performance rank in the overlay** (no "alternatives for official skill ranking systems"); no data about players the game deliberately hides (champion select: enemy names, and allies whose `nameVisibilityType` is not visible); no advice that tells the player what to do in game. Champion select text states facts ("Only one frontline champion so far", "Enemy damage so far is all physical"), never orders; champion options are shown as "from X's pool", not as "pick this".
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
2. When the launcher's `game_flow.phase` reaches `GameStart`/`InProgress`, the app reads the local player's Riot ID (`gameName`, `tagLine`) from launcher `summoner_info.player_info` and the platform from `summoner_info.platform_id` (EUN1/EUW1). The launcher's `puuid` is the client-internal one, not Riot API's (spike finding), so it is not used. *(Builder's call.)* Platforms other than EUNE/EUW: the app shows "server not supported".
3. The app's **main process** calls the Summon.gg backend with that Riot ID and platform (main-process fetch, so no CORS changes on the site).
4. The backend resolves the Riot ID to a puuid with the existing DB-first `resolveAccount`, then calls Spectator-v5 (`getLiveGame`) with the **platform sent by the app**, not `platformOf(puuid)`, because that falls back to EUNE for unknown accounts. It gets the ten participants, then builds all ten cards and returns them in **one response**.
5. Spectator can 404 for a short while after the game starts. The app retries with backoff while the loading screen lasts.
6. GEP `match_info.players_tagline` is the documented fallback source of the ten Riot IDs. Whether it is needed is decided by the spike below.

### Spike first (throwaway, before the real build)

A minimal ow-electron app that logs: launcher phases, `player_info`, `players_tagline`/`all_players` timing, and how many seconds after `GameStart` Spectator-v5 starts returning the game. It also opens one `OverlayBrowserWindow` on a hotkey during a real game. Its findings decide whether the Riot-ID fallback endpoint variant is built. The owner runs the game; the builder reads the logs.

## Backend: overlay endpoint (in `summon/`)

New route, e.g. `GET /api/overlay/game?gameName=…&tagLine=…&platform=…&since=…` (exact name is the builder's call). `since` is the epoch ms of the user's local midnight, sent by the app, so "today" means the user's day.

Response: Zod-validated, the same schema copied into `summon-electron`. Shape:

- game: `queueId`, `platform`, `gameStartTime`
- ten players, each: `puuid`, `gameName`, `tagLine`, `teamId`, `championId`, `isSelf`
  - `rank`: tier, division, LP, season wins/losses (from the league-v4 call, so free)
  - `mains`: top 3 champions by mastery
  - `today`: wins and losses since `since`
  - `tags`: e.g. on-fire streak, one-trick, using the existing badge/achievement logic where it already exists
  - per-section availability so the UI can show "—" for a part that failed (rate limited) instead of failing the card

Rules:

- **Which rank queue:** Ranked Flex games show Flex; every other queue shows Solo/Duo. *(Builder's call recorded here.)*
- **Today W/L** counts games in the current game's queue since `since`: one Match-v5 ids call per player (with `startTime` and `queue`), then details only for matches not already stored. Stored matches are never fetched again.
- **All ten players become tracked accounts** (owner's decision): the endpoint creates/updates their `Account` with the real Riot ID and the game's platform, and saves ranked entries through the path that also writes `LPHistory` (`saveRankedEntries`), not the `ranked/batch` path that creates `gameName: ""` accounts. They then join the ranked cron, so their LP history builds up for later features. The cron is already budgeted (fixed batch per run, cursor, active-first), which keeps per-run cost bounded as the account count grows.
- Caching: reuse the existing per-player caches (RankedEntry, ChampionMastery, Match). The whole response is also cached briefly (a few minutes) per game, so reopening the overlay costs nothing.
- **Match-detail cap:** at most ~30 new Match-v5 detail fetches per request across all ten players *(builder's call)*. If today's games need more, `today` is marked partial (shown e.g. as "3W 1L+") and later opens fill it in from what got stored.
- **Abuse protection** *(builder's call)*: the response is cached per Spectator `gameId`, so requests for any of the ten puuids hit the same entry; plus a simple per-IP rate limit on the route. An app token is deferred to the store phase.
- On 429 the endpoint returns what it already has with the affected sections marked unavailable. It never retries in a loop.
- Reuse the existing services (`getLiveGame`, the ranked batch logic, mastery, match store, season helpers). Don't trigger the full profile sync (match backfill, achievements) for the ten players.

## Electron app (`summon-electron/`)

- ow-electron, TypeScript. Renderer UI in React (same stack as the site) unless the Overwolf sample makes that unreasonable; the builder starts from Overwolf's official ow-electron sample/boilerplate.
- **Desktop window** (main app window, works without a game running):
  - Fills with an iframe of the Summon.gg site. It opens `https://summon.vandslab.com/summoner/{Name-TAG}` for the local player once the launcher reports who is logged in, and the site's home page before that. *(Which page shows before login is the builder's call.)* The site sends no `X-Frame-Options`/`frame-ancestors`, so framing works today. The spike confirms production doesn't add such headers at the ingress.
  - A thin app bar above the iframe shows status (waiting for game / in game / error), the hotkey setting and an on/off toggle for the overlay. Overwolf expects hotkey settings inside the app.
- **Overlay window** (`OverlayBrowserWindow`, standard mode):
  - Loading screen: full panel, two team rows of five cards.
  - In-game: scoreboard panel (two columns: champion, Riot ID, main role icon, mains, tags, short rank, today W/L) and below it live item gold (team totals bar and five laner-vs-laner difference bars).
  - Toggled by one hotkey with a modifier; default **Alt+X**, changeable in settings (plain keys clash with League; Overwolf forums report stuck keys with non-modifier hotkeys).
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
  - chips (On Fire, OTP)
- The own card has a purple (primary) ring.
- **Card border:** a gradient in the team color, strong at the top and fading toward the bottom. No colored top strip.
- **In-game panel** (approved design `summon-electron/docs/designs/ingame-a3.html`, without the "Your Ahri" block for now): two columns like the Tab scoreboard; under them "Item gold": blue/red team bar with both totals and "Your team ahead/behind by N", then one column per lane with both champions, a centred difference bar and "+850"/"−550".
- **Item gold** comes from GEP `live_client_data.all_players` items (what the scoreboard shows), priced with Data Dragon `item.json` (`gold.total`). Current gold of enemies is never shown. Lanes are paired by the `position` field; when it is blank, by order.
- **Main role** = the most played `teamPosition` in the player's last 20 stored Summoner's Rift matches (needs at least 3 games there and 40% of them), else no icon. DB only, no Riot call.
- Approved designs for all screens: `summon-electron/docs/designs/` (loading-panel, card-states, ingame-a3, profile-window, desktop-window, cs-combined).
- **Theme:** Summon.gg dark tokens copied from `summon/src/app/globals.css` (`.dark`): background `#0d0f1a`, card `#151827`, border `#252a40`, primary `#b05ad6`, gold `#e9b949`, win `#34c38f`, loss `#ef5350`, team blue `#4f8fe6`, team red `#ef5350`, muted text `#7d829c`. Font: Geist / Geist Mono.

## Champion select (desktop window)

Approved design: `summon-electron/docs/designs/cs-combined.html` (concepts 1 + 3 from `cs-concepts.html`).

**When it shows.** The launcher's `game_flow.phase` is `ChampSelect`: the desktop window hides the iframe and shows the champion select view; any other phase brings the iframe back. The overlay hotkey does nothing in champion select.

**Draft state** comes from the launcher GEP feature `champ_select` (info `raw`: the LCU champion select session as JSON) *(the spike did not reach champion select; its first real run confirms the fields)*:

- `localPlayerCellId`, `myTeam[]` and `theirTeam[]` (cell, `championId`, `championPickIntent`, `assignedPosition`, `gameName`, `tagLine`, `nameVisibilityType`), `actions` (whose turn it is), `timer`.
- The hovered champion is the local player's `championPickIntent`, or the champion in their in-progress pick action.
- Allies are shown by name only when `nameVisibilityType` is visible; otherwise "Name hidden", no rank, no pool. Enemy slots show the champion only.

**Layout:**

- **Draft bar:** five ally slots (champion, name, short rank, "Hovering"/"Picks next"), phase and timer in the middle, five enemy slots.
- **Your pool** (left): your champions for your assigned role, from your stored matches this season in queues 400/420/440, sorted by games, top 5. Each row: champion, games and when last played, win rate bar, KDA, your record against the likely lane opponent ("3W 1L" or "Never played"), and fit chips for this draft. The hovered champion is highlighted, and added as a row with "No games this season" if it is not in your top 5.
  - Role: `assignedPosition`; when blank (blind pick), your main role (same rule as the overlay); when that is empty too, all roles.
  - Likely lane opponent: the locked enemy champion that is most often played in your role in all stored matches. Empty until one exists.
  - Fit chips (green adds what your team lacks, yellow repeats a surplus): "Magic damage", "Physical damage", "Crowd control", "Frontline", "No frontline". Computed from the composition data below, never from win rates.
- **Composition** (right): for each team, a damage split bar (physical / magic / true), frontline dots, crowd control dots and a one-word label. The hovered champion is drawn striped in your team's meters. Below it "What your team needs": up to three fact lines, plus up to three frontline/CC champions from the pool of the next ally who still picks and whose name is visible (games per champion).

**Composition data** lives in the app, not the backend:

- Data Dragon `champion.json`: `tags` (Tank, Fighter, …) and `info.attack` / `info.magic` give each champion's physical/magic share.
- A hand-maintained JSON in `summon-electron` for what Data Dragon lacks: per champion `cc` (0–3), `frontline` (bool), `trueDamage` (share 0–1). Missing champions count as zero/false; a test lists any Data Dragon champion missing from the file.
- Fact lines (rules are the builder's call): no or one frontline champion with picks left; one damage type at least 70% (own team: "mostly physical"; enemy: "Enemy damage so far is all physical"); low crowd control; a type covered by a locked champion ("Magic damage covered by Ahri").

**Backend:** a second endpoint in `summon/` (name is the builder's call), called by the main process when champion select starts and when the set of visible allies or the local player's role changes, never per hover:

- Input: own Riot ID and platform, queue id, assigned role, and the visible allies' Riot IDs with their `assignedPosition`.
- Output (Zod, copied into `summon-electron`): own pool rows (champion, games, wins, kills/deaths/assists, last played, record against each enemy champion seen in those matches as lane opponent), and for each visible ally: short rank and their top champions for their position (games).
- Own pool and lane records: **DB only** (stored matches, like `storedPositionCounts`), no Riot calls. The likely-lane-opponent lookup (champion → most common `teamPosition`) is DB only too.
- Allies: `resolveAccount`, ranked entries via `saveRankedEntries` (they become tracked accounts, like the overlay's ten players), pool from their stored matches for that position, falling back to top mastery champions when they have fewer than 3 stored games there. At most 4 allies; same per-IP limit and 429 handling as the overlay endpoint; response cached a few minutes per own Riot ID plus allies.

## Testing

- Backend: Vitest unit tests for the card builder (today W/L and the match-detail cap, queue choice, account tracking, partial data on 429), in the style of the existing tests.
- Backend: champion select pool builder (role fallback, season and queue filter, lane records, hidden allies never sent, ally mastery fallback).
- Electron: unit tests for pure logic (phase → overlay state, retry/backoff, response parsing, champion select session parsing, composition meters, fit chips and fact lines). In-game behavior is checked by the owner in a real game; the builder gives them a short checklist.
- The web app's existing test suite stays green after the move.

## Left to the builder

- Endpoint name, file split, cache mechanism and TTL.
- Retry timings and how long to keep retrying Spectator.
- Electron project structure and build tooling, and how the renderer is bundled.
- How tags are computed from existing logic, and which ones ship first.
- How a friend installs the phase-1 build (follow Overwolf's ow-electron onboarding and testing docs).
