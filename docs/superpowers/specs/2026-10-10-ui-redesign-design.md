# Full UI Redesign — Design Spec

## Goal

Replace the current dense, glow-heavy UI with a calmer, structured layout modelled on League of Graphs: hero banners with champion splash art, tabbed summoner profiles, header-titled panels, and clear visual hierarchy. Every page is redesigned. The Summon.gg logo and Geist typography stay; the palette is refined.

At the same time, move the summoner profile to a server-rendered shell so every profile and tab has its own URL and metadata.

## Motivation

All three apply with roughly equal weight:

- **Visual** — the aurora/neon look reads as generic and noisy.
- **UX** — the 3-column profile and single-line match cards are too cramped; too many elements compete for attention.
- **Technical** — every page is `"use client"`, so crawlers see empty HTML and there is no per-page metadata; several components are 400–640 lines.

## Decisions (from brainstorming, 2026-10-10)

| Topic | Decision |
|---|---|
| Fidelity | LoG-like **structure**; own logo + typography; refined colors |
| Navigation | Top navbar only — no sidebar |
| Profile layout | **B** — left stat column + match list on the right |
| Profile tabs | Overview / Champions / LP History / Achievements |
| Hero banner | Champion splash art on profile, champion page, match detail, live, home |
| Match row (collapsed) | **C** — minimal, no team list |
| Match row (expanded) | **A** — mirrored LoG scoreboard + bans + "Full match →" |
| Match detail | **A** — LoG-faithful single page |
| Palette | **A** — Summon purple, refined, no aurora/glow |
| Home | **B** — hero search + live panels |
| Live game | Banner on profile + separate page, **A** mirrored 5v5 |
| Champion page | Becomes a sub-page of the Champions tab |
| Achievements | Placeholder tab now; the achievement **system** rework is a separate sub-project |
| Other pages | Changelog, policy, 404, error, maintenance restyled per mockup |
| Approach | Hybrid — server shell + client islands |
| Work split | One spec, one implementation plan per phase |

Mockups live in `.superpowers/brainstorm/214-1791637784/content/` (git-ignored): `profile-layout.html`, `match-row.html`, `match-expanded.html`, `match-detail.html`, `palette.html`, `home.html`, `tabs.html`, `live.html`, `misc-pages.html`.

## Non-goals

- Changing the achievement definitions or detection logic.
- Changing maintenance-mode behaviour (`AppSettings.MAINTENANCE_MODE` check in the root layout stays as is).
- New env variables (deploy is K8s/ArgoCD; use constants).
- Fixing the open backend items from the 2026-09-04 session (batch endpoint limits, cron loop) unless a phase touches them.

## 1. Architecture and routes

```
/                                    Home
/summoner/[name]/layout.tsx          SERVER — hero + tab nav + generateMetadata
  page.tsx                           Overview tab
  champions/page.tsx                 Champions tab
  champions/[champion]/page.tsx      Champion sub-page (moved from /summoner/[name]/[champion])
  lp/page.tsx                        LP History tab
  achievements/page.tsx              Achievements tab (placeholder)
  live/page.tsx                      Live game page
  [champion]/page.tsx                Redirect only: old URL → champions/[champion]
/match/[id]?puuid=                   Match detail
/changelog, /changelog/[slug]        Changelog
/policy                              Privacy policy
not-found.tsx, error.tsx             404 / error
```

Static segments (`champions`, `lp`, `achievements`, `live`) win over `[champion]`, so the redirect route only catches legacy champion URLs.

### Server shell

- New `src/lib/summoner/get-profile.ts`: one loader, wrapped in `React.cache`, that resolves `name` → account (DB, else Riot) → summoner → ranked entries → top-mastery champion. It returns a typed `SummonerProfile`.
- The account/summoner fetch-and-upsert logic currently inline in `api/account/route.ts` and `api/summoner/route.ts` moves into `lib/` functions. The routes and the loader both call those functions, so the logic is not duplicated. The stale-while-revalidate behaviour is unchanged.
- `layout.tsx` awaits `params` (a Promise in Next 16) and calls the loader. It renders the hero and tab nav. An unknown summoner triggers `notFound()`.
- `generateMetadata` calls the same loader (deduped by `React.cache`). It returns the title `Skaikru#HEAVN — Emerald I`, a description, and the canonical URL.
- `SummonerProvider` is a client context that receives `{ puuid, gameName, tagLine, slug }` from the layout. Tab pages read it, so they never refetch the account.

### Client islands

Match lists, charts, filters, the live banner and the refresh button stay client components on React Query, using the existing hooks. The Update button invalidates the queries and calls `router.refresh()` to re-run the server shell.

### Hero splash source

- **Profile:** splash of the top-mastery champion, cheap to get on the server.
- **Champion sub-page:** that champion.
- **Match detail:** the `?puuid` player's champion.
- **Live:** the searched player's champion.
- **Home / 404 / maintenance:** fixed champions (Ahri, Teemo, Heimerdinger).

Splash URL: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{Key}_0.jpg`, rendered with a plain `<img>` under a dark gradient.

## 2. Design system

### Tokens (palette A)

Defined in `globals.css` as CSS variables, with both dark and light variants. The light mode is derived from the same hues.

| Token | Dark | Use |
|---|---|---|
| `--background` | `#0d0f1a` | page |
| `--nav` | `#0a0c15` | navbar |
| `--card` | `#151827` | panels |
| `--border` | `#252a40` | panel borders, dividers |
| `--foreground` | `#d4d7e6` | body text |
| `--muted-foreground` | `#7d829c` | secondary text |
| `--primary` | `#b05ad6` | brand accent, active tab, primary button |
| `--win` | `#34c38f` | victory, positive LP |
| `--loss` | `#ef5350` | defeat, negative LP |
| `--gold` | `#e9b949` | highlighted player, KDA assists |
| `--team-blue` / `--team-red` | `#4f8fe6` / `#ef5350` | scoreboard sides |

Rules:

- No aurora, glow or neon shadows.
- Result color on match rows is a win/loss gradient that fades out from left to right (user decision, 2026-10-10; replaces the earlier 3px accent bar).
- Badges keep the existing style: colored text, `${color}44` border, `${color}20` background.

### Primitives — `src/components/ui/`

New primitives, small and single-purpose:

- `panel.tsx` — `Panel`, `PanelHeader` (title + optional actions slot), `PanelBody`
- `tabs-nav.tsx` — link-based tab bar for route tabs, with the active state taken from `useSelectedLayoutSegment`
- `chip.tsx` — badge/pill built from a hex color
- `stat-ring.tsx` — circular percentage ring
- `hero-banner.tsx` — splash background + gradient + content slot
- `rank-emblem.tsx` — local `/icons/rank/*.png`
- `champion-icon.tsx`, `item-slots.tsx`, `spell-rune-stack.tsx`
- `empty-state.tsx` — empty and error states for a single panel

Existing shadcn primitives (`select`, `tooltip`, `separator`, `table`, `skeleton`, `button`) are reused and restyled through tokens.

### Component layout — per page, modular

```
src/components/
  ui/            primitives (above) + shadcn
  layout/        navbar, footer, maintenance-screen
  shared/
    scoreboard/  mirrored-scoreboard, scoreboard-row, team-header, bans-row
  home/          hero-search, recently-searched, free-rotation, whats-new
  summoner/
    shell/       summoner-hero, summoner-tabs, live-banner, refresh-button, summoner-provider
    overview/    ranked-panel, roles-performance-panel, most-played-panel,
                 recently-played-panel, lp-sparkline, achievement-preview
    matches/     match-list, match-filters, match-row, match-row-expanded
    champions/   champion-stats-table, champion-summary
    lp-history/  lp-chart, lp-summary, lp-changes-table
    achievements/achievement-grid
  match/         match-hero, team-charts, player-selector,
                 player-tabs/{overview,fighting,farming,objectives,vision}
  live/          live-hero, live-scoreboard
  changelog/     timeline, entry-card, entry-detail (restyle of existing)
  policy/        policy-toc, policy-section
  errors/        error-screen
```

Rules: components stay small; a file around 200 lines is a signal to split it. Comments are JSDoc only. Use `<img>` for external images and shadcn where it exists. No emoji.

### Cleanup (Phase 0)

- **Delete:** `Aurora.jsx/.css`, `SoftAurora.jsx/.css`, `ui/aurora-background.tsx`, `ui/aurora-backgorund-2.tsx`, `providers/lenis-provider.tsx`, `ui/loader-mini.tsx`, `summoner/sidebar-skeleton.tsx`. `CountUp` stays only if the new stat panels use it.
- **Remove deps:** `motion`, `lenis`. Move `shadcn` to `devDependencies`.
- **Split while redesigning:** `summoner/match-card.tsx` (640 lines), `match/objectives-timeline.tsx` (546), `summoner/[name]/live/page.tsx` (463), `match/team-table.tsx` (409).
- **Fix the existing eslint errors** in every file the redesign touches; the goal is 0 errors by the end.

## 3. Pages

### Navbar and footer

- **Navbar:** logo on the left; a centered summoner search with the existing history dropdown; a theme toggle on the right.
- **Footer:** a slim row with the patch, changelog and policy links.

### Home (option B)

- **Hero:** Ahri splash, large logo, the search box with a Search button, and recent searches as chips. Recent searches come from local search history, as today.
- **Panels below the hero:**
  - *Recently searched* — server-wide, from `/api/recent-searches`, shown with solo rank.
  - *Free rotation* — from `/api/rotation`.
  - *What's new* — the latest changelog entry, read from the registry.

### Summoner shell (all tabs)

- **Hero:** splash, profile icon with a level badge, `gameName #tag`, region and "updated X ago", rank pills (Solo, Flex), and the Update button.
- **Live banner:** a live-game banner sits under the hero while the player is in game. It shows a LIVE timer and a link to `/live`.
- **Tab nav:** Overview · Champions · LP History · Achievements.

### Overview tab (layout B)

- **Left column (~330px):**
  1. Ranked Solo + Ranked Flex panels (emblem, LP, W/L, WR, mini LP sparkline)
  2. Roles + Performance (role donut; average KDA, CS, gold, damage, vision)
  3. Most played (top 5, WR bar; "See more" → Champions)
  4. Recently played with
- **Achievement preview:** a strip of 3–4 earned achievement chips at the top of the Overview tab, above both columns (`overview/achievement-preview`; other tabs do not show it), with "See all" → Achievements.
- **Right column:** Recent games.
  - Queue filter chips: All / Solo / Flex / ARAM / Normal. A champion filter goes to the Champions sub-page.
  - Rows use match-row C. The existing two-step loading (20 matches, then 30 more by offset) stays.

### Match row C (collapsed)

The row shows, in order:

1. a win/loss color fading out from the left edge
2. result, queue, duration and time ago
3. champion icon with level
4. spells and runes (2×2)
5. KDA, large, with the ratio
6. CS, KP and LP change as separate small stats
7. items (7 slots), with up to 2 badges and a `+X` overflow under them
8. the expand chevron

Arena rows keep the placement colors from the Arena spec.

### Match row expanded (A)

The expanded row uses the shared `mirrored-scoreboard`:

- A summary bar: team K/D/A and objectives on each side.
- Five mirrored rows. Each shows champion, name, rank, K/D/A, CS, gold and items. The searched player is highlighted in gold, and player names link to their profiles.
- A bans row with a "Full match →" link to `/match/[id]?puuid=`.
- Arena matches use the existing `arena-leaderboard`, restyled.

### Champions tab

- A champion stats table: rank, champion, games, winrate bar, KDA with the averages, CS/min, dmg/min, and a mastery chip.
- Queue filter. Data comes from `/api/champion-stats`.
- Champions that have mastery but no stored matches are listed below the table, with mastery only.
- Clicking a row opens `champions/[champion]`.

### Champion sub-page

- A champion splash hero with the mastery level and points.
- A summary strip: games, WR, KDA, CS/min, KP.
- Matches on that champion, using match-row C and the A expansion. This is today's `championId` filter logic.

### LP History tab

- Solo/Flex toggle and a 7D / 30D / Season range.
- Summary: current rank, peak rank, LP change over the range.
- A full-width area chart and a "Changes" table with date, rank, LP, change (including promotions and demotions) and W/L.

### Achievements tab

A placeholder grid of earned and locked achievements built from the current 26 definitions. The final design comes with the achievement-system sub-project.

### Match detail (A, single page)

The page reads top to bottom:

1. Hero: the `?puuid` player's champion splash, queue name, result, duration and date.
2. The mirrored scoreboard, with bans.
3. Team gold advantage and damage dealt charts, side by side.
4. A player selector row: 5 vs 5 champion icons, defaulting to `?puuid`.
5. Player tabs:
   - **Overview** — badges, stat rings (damage share, gold share, KP, CS/min, vision), item purchase timeline, skill order, runes
   - **Fighting** — damage chart, kill timeline, kill map
   - **Farming** — CS/gold chart
   - **Objectives** — objectives timeline
   - **Vision** — vision chart

All of these reuse the existing chart and timeline components, restyled and split.

Arena matches keep the Arena layout from the 2026-04-07 spec, restyled.

### Live game (A)

- **Hero:** the player's champion splash, a pulsing LIVE timer, queue and map.
- **Mirrored 5v5:** each row shows champion, spells, rune trees, name, rank emblem with tier, WR and games. A team average rank sits in the header and the bans are at the bottom.
- No champion mastery (it would add 10 Riot calls).

### Changelog, policy, errors, maintenance

- **Changelog list:** vertical timeline. Each entry is a card with its title, summary and category count chips.
- **Changelog detail:** a back link, title and date, then one panel per category. The achievement/badge requirement tables keep their content in the new table style.
- **Policy:** sticky table of contents on the left, with readable-width text panels.
- **404:** Teemo splash, with "Go home" and "Search summoner".
- **Summoner not found:** a dedicated `not-found.tsx` under `/summoner/[name]` with the search box.
- **Error:** "Something went wrong", with "Try again" (`reset`) and "Go home".
- **Maintenance:** Heimerdinger splash, logo, an "Under maintenance" pill and the feature cards. The logic is unchanged.

## 4. Data and API

Every new response gets a Zod schema and an exported type in `src/lib/validators/`, plus a typed `useQuery<T>` hook. API work in a phase is done before that phase's UI.

| Endpoint | Purpose | Source |
|---|---|---|
| `GET /api/champion-stats?puuid&queue` | Per-champion games, wins, K/D/A, CS, damage, duration | SQL aggregation over stored `Match` rows via the existing GIN index on `metadata.participants` |
| `GET /api/recent-searches` | Last 8 accounts by `updatedAt` + solo rank | `Account` + `RankedEntry` |
| `GET /api/rotation` | Free champion rotation | Riot champion-v3, cached in `AppSettings` (`FREE_ROTATION` JSON + timestamp), refreshed if older than 6h — no migration |
| `GET /api/lp-history?…&range=7d\|30d\|season` | Range filter (today: last 100) | `LPHistory` |

`champion-stats` limits `count` and `queue` to known values, so a single request cannot trigger an unbounded scan.

## 5. Error handling

- **Unknown summoner:** the layout calls `notFound()`, which renders the summoner not-found page.
- **Riot unreachable:** the existing DB fallbacks stay. If the profile is in neither the DB nor Riot, the route `error.tsx` renders.
- **Client panels:** each panel has its own skeleton and its own `EmptyState` error. One failed panel does not blank the page.
- **Live page:** a player who is not in game gets an empty state with a link back to the profile.

## 6. Testing and verification

- Each phase: `npm run typecheck` and `npm run lint` pass with 0 errors in the touched files.
- Each phase: a manual check in the Browser pane of every changed page, in **dark and light** mode and at **mobile width (375px)**.
- Add **Vitest** (dev dependency) for the new pure functions: champion-stats aggregation mapping, LP range and change calculation, rank average for the live header.

## 7. Phases

Everything happens on a single `feat/ui-redesign` branch. Each phase gets its own implementation plan. The redesign ships when Phase 6 is done.

| Phase | Scope |
|---|---|
| 0 — Foundation | Tokens (dark + light), UI primitives, navbar, footer, maintenance screen, cleanup of dead files/deps |
| 1 — API | `get-profile` loader + lib extraction, `champion-stats`, `recent-searches`, `rotation`, LP `range`; Zod schemas + hooks; Vitest setup |
| 2 — Profile shell + Overview | Server layout, metadata, provider, hero, tabs, live banner, left column panels, match list, match-row C, shared mirrored scoreboard (expanded A) |
| 3 — Tabs | Champions tab, champion sub-page + legacy redirect, LP History tab, Achievements placeholder |
| 4 — Match detail | Hero, charts, player selector, player tabs, Arena variant |
| 5 — Home | Hero search, recently searched, free rotation, what's new |
| 6 — Remaining pages | Live page, changelog list/detail, policy, 404, error, summoner not-found |

## Open follow-ups (out of scope)

- Achievement system rework (separate sub-project; the Achievements tab is a placeholder until then).
- Batch endpoint limits on `/api/ranked/batch` and `/api/match-badges/batch`.
