# Summon.gg Duo tab — design

A new profile tab, **Duo**, placed before Achievements. It lists the people a player keeps queueing with, and opens a side-by-side comparison with one of them, including the games they played together and who carried each.

Approved mockup (local, git-ignored): `.superpowers/brainstorm/993-1794616973/content/selected.html`, section "3 · Duo és barátok". The mockup put the list on Overview and the comparison on a separate `/compare/...` page; the owner moved both under the new tab.

## Why

Friend groups come back to compare themselves with each other ("who carried?"). Big stat sites do not serve this. It builds on data the site already stores: matches and per-match performance scores.

## Goals

- A **Duo** tab at `/summoner/[name]/duo`, between LP History and Achievements in the tab bar.
- **Played with** list: players who were on the same team in at least 3 of the profile's last 50 stored Summoner's Rift games. Each row: Riot ID, games together, their most common role in those games, win rate together, and the difference from the profile's win rate without them in the same window.
- **Comparison** for one of them at `/summoner/[name]/duo?with=<puuid>`: both players side by side with average performance score, the six category scores, rank where stored, then a "Together" line (W–L, how many shared games each one carried) and the list of shared games.
- **Shared games** list: result, both players' champion, K/D/A and score, a crown on the higher score, time ago, link to the match page.
- The Overview's **Recently played with** panel (`src/components/summoner/overview/recently-played-panel.tsx`) switches to the Duo data and rule, so the two lists never disagree: top 5 rows of `/api/duo`, each row linking to `duo?with=<puuid>`, and a "See all" link to the Duo tab. Its old rule (`src/lib/summoner/matches/teammates.ts`, 2+ games among the loaded matches) and its test are deleted.
- Works on phones (the site is being made mobile-friendly now).

## Non-goals

- The session strip (feature 2A) — dropped by the owner.
- A separate `/compare` route, comparing two arbitrary players who never played together, or comparing more than two.
- Duo synergy ratings, recommendations, or "best duo" leaderboards.
- Live updates; the tab reads what is stored when it loads.

## Anti-goals

- **No Riot API calls** from this feature. Dev and prod share one personal key (95 calls / 2 min); a feature that costs calls per click repeats the "Load more" budget problem.
- No misleading numbers: when the friend has few stored games, say so instead of presenting a thin sample as their real form.

## Constraints

- Next 16 App Router; tab pages live in `src/app/(site)/summoner/[name]/<segment>/page.tsx` and render a client component that reads `useSummonerContext()` (see `achievements/page.tsx`). Tabs are listed in `SUMMONER_TABS` (`src/components/summoner/shell/summoner-tabs.tsx`).
- Data from Postgres via Prisma; matches are JSON documents in `Match.data`, filtered by the GIN index pattern `data->'metadata'->'participants' @> '"<puuid>"'` and projected in SQL (see `src/lib/performance/recent.ts`, `src/lib/match/projection.ts`). Never pull whole match documents for a list.
- Performance scores: `MatchPerformance` (per match, all players), filled lazily by `scoreAndCache` (`src/lib/performance/batch.ts`). Scores exist only for ranked queues (420, 440, 710) of eligible length.
- Remakes are excluded everywhere (`isRemake` / eligibility helpers).
- Zod schemas for API responses in `src/lib/validators/`, types inferred from them. Logic in `src/lib`, small components in separate files, very few comments (only the non-obvious why), rem sizing, pnpm only, no migrations.
- API routes get the existing per-IP limit (`rateLimited(req, "<scope>")`) like the other DB-heavy routes.

## Approaches

- **A — stored data only (chosen).** Everything comes from stored matches and stored/lazily computed scores. Zero Riot calls, fast. The friend's own form is only as complete as what is stored for them; the UI shows the stored count and links to their profile, whose first visit fills it in.
- **B — fetch the friend's recent matches from Riot on open.** Always complete, but up to ~31 Riot calls per comparison; a few clicks exhaust the shared budget.
- **C — A plus a "Load their recent games" button that does B on demand.** More UI and state for something opening the friend's profile already does.

The owner picked **A** because the shared key makes per-click Riot calls the main risk, and the friend's profile is one click away.

## Design

### Data rules

- **Window:** the profile's last 50 stored Summoner's Rift games (`RIFT_QUEUE_IDS`), newest first, remakes excluded.
- **Duo partner:** a participant with the same `teamId` as the profile in ≥ 3 games of the window. Sorted by games together (desc), then win rate (desc). At most 10 rows.
- **Role** on a row: the partner's most frequent `teamPosition` in the shared games (empty position ignored; none → no role shown).
- **Win rate together** = wins / shared games, rounded. **Difference** = that minus the profile's win rate over the window's games without this partner on the team; omitted when there are no such games.
- **Riot ID** for a partner: from the participant fields of their most recent shared game (`riotIdGameName`, `riotIdTagline`), so no account lookup is needed.

### Comparison

- `with` is the friend's puuid. A puuid that never shared a team with the profile in stored games still renders the two summaries, with an empty shared list. The friend's name and icon come from their latest shared game; without one, from the `Account` row, then any stored match (builder's call).
- The win-rate difference is computed from unrounded rates and rounded once (builder's call).
- Each side: `recentPerformance(puuid)` (`src/lib/performance/recent.ts`) — last 30 stored ranked games — gives games, win rate, average score and grade, and the six categories. Rank: the stored solo `RankedEntry` if any, else nothing.
- When a side has fewer than 30 stored ranked games, show "N stored games" under its name; the friend's name links to their profile (`toSummonerSlug`).
- **Shared games:** the games of the same 50-game window as the Played with list where both were on the same team (builder's call, so the comparison's W–L always matches the row the user clicked). For each: result, both champions, K/D/A, both scores when the match has scores (ranked), crown on the strictly higher score, `gameCreation` for time ago, link `/match/<matchId>?puuid=<profile puuid>`.
- **Together line:** W–L over shared games; "carried" counts per side over shared games where both scores exist.

### API

- `GET /api/duo?puuid=<p>` → `DuoPartner[]` (validator `duoPartnersSchema`).
- `GET /api/duo/compare?puuid=<p>&with=<q>` → `{ player: DuoSide, friend: DuoSide, shared: SharedGame[], together: { wins, losses, playerCarried, friendCarried } }`.
- Both: 400 without required params, per-IP limit, 500 with a logged error on failure. Both read only from Postgres (scoring a missing ranked match through `scoreAndCache` is allowed; it is DB work).

### UI

- `SUMMONER_TABS` gains `{ label: "Duo", segment: "duo" }` before Achievements; page `src/app/(site)/summoner/[name]/duo/page.tsx`.
- Without `with`: the Played with panel (rows are links to `?with=<puuid>`). With `with`: a "← All duo partners" link, the comparison header, category rows (two bars or numbers facing each other, as in the mockup), the Together line, then the shared games list.
- Empty states: "No one played 3+ games with you in your last 50 stored games." / "No shared games stored yet."
- Mobile: comparison stacks into one column of facing numbers; shared game rows keep result, both scores and crown, and drop K/D/A below `sm`.
- Data hooks with TanStack Query (`["duo", puuid]`, `["duo-compare", puuid, with]`), following the existing hook files in `src/hooks/`.

## Left to the builder

- Exact file split inside `src/lib/duo/` (pure aggregation functions with unit tests; SQL loading separate) and component names.
- Visual details within the site's existing panel, chip and score-circle components.
