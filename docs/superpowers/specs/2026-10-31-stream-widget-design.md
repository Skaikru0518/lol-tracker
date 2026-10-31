# Summon.gg stream widget — design

A small embeddable widget for streamers: a standalone page per summoner that OBS / Streamlabs loads as a Browser Source. It shows rank, LP and how today's session is going, in the Summon.gg look. Streamers make the URL with a generator on their summoner page.

Approved mockup (local, git-ignored): `.superpowers/brainstorm/stream-widget/index.html`.

## Why

Streamers show their rank and session on stream; today they use other sites' widgets. A Summon.gg widget puts the brand on screen in front of viewers and gives streamers a reason to use the site. First users: the owner and their friends who stream.

## Goals

- A widget page per summoner, transparent background, usable as an OBS Browser Source and inside an iframe.
- Four styles, each with two themes: **card** (dark Summon.gg panel) and **clear** (no panel, text shadow so it reads over the game).
- A "Stream widget" generator on `/summoner/[name]`: pick style and options, live preview, copy the URL. No account and no saved settings: the URL carries everything.
- The widget refreshes itself; the streamer never touches it after adding it.

## Non-goals

- Accounts, saved widget configs, a widget dashboard.
- Custom colors, fonts or sizes beyond the four styles and two themes.
- Achievement badges, MMR, performance score in the widget.
- Twitch extension or chat bot.
- The Electron / Overwolf app (`summon-electron`): the widget lives only in `summon`.

## Anti-goals

- Hammering the shared Riot key: one widget must cost a bounded, small number of calls per minute, no matter how many browsers open the URL.
- Site chrome on the widget page (navbar, footer, cookie or maintenance banners, toasts): anything besides the widget would show up on stream.
- Est. MMR or any unofficial skill rating (Riot policy, same as the overlay).

## Constraints (project-wide)

- pnpm only. Never run Prisma migrations (the owner does). Never print the Riot key or DB credentials. Don't search new Riot IDs in loops against the shared key.
- Commit straight to `main`, no new branches.
- Minimal comments: only the non-obvious why.
- Zod schemas and inferred types for every API payload; logic in `src/lib/…` with Vitest tests (TDD).
- Next 16: read `node_modules/next/dist/docs/` before Next.js work (`AGENTS.md`).

## The widget page (decided)

- URL: `/widget/{Name-TAG}` (same slug as `/summoner/{Name-TAG}`, `toSummonerSlug`) plus query options:
  - `style`: `bar` | `square` | `strip` | `pill` (default `bar`)
  - `theme`: `card` | `clear` (default `card`)
  - `queue`: `solo` | `flex` (default `solo`)
  - `session`: `auto` | `today` | `load` | `season` (default `auto`; `season` is labelled "Overall" in the generator)
  - `anim`: `on` | `off` (default `on`): event animations below.
  - `fx`: optional extras, comma list of `rotate`, `smoke` (default none).
  - `show`: which optional parts appear: Riot ID, server, LP change, win rate %. Defaults: all on (win rate on by the owner's request). *(Exact encoding is the builder's call.)*
- Transparent page background, no site chrome, no scrollbars. The widget sits at the top left of the page at its natural size, so the OBS source size equals the widget size.
- Not indexed (`noindex`), no analytics events beyond a page view.
- Refreshes its data every 60 seconds without reloading the page. On a failed refresh it keeps showing the last data.

### Motion and watermark (owner-approved with the animation mockup `.superpowers/brainstorm/stream-widget/anim.html`)

- Every effect stays inside the widget's box (the box clips), because OBS crops the source to it.
- **Watermark:** a faint `summon.gg` in the bottom-right corner (bottom-left on the bar, inline at the end of the pill). Always on.
- **Events** (`anim=on`), found by comparing two refreshes: a finished game flashes the border green/red from inside, the LP change floats up inside the box, numbers roll to their new values, the new champion icon slides in on the left of the strip and the new dot pops in on the square. A promotion covers the whole widget for 3 s with "PROMOTED · <rank>" in the tier color and a light sweep, the emblem flashes and two rings burst; a demotion shows a plain grey "DEMOTED · <rank>" cover.
- **Win streak:** from 3 wins in a row (newest games) a "🔥 N" chip appears (next to "Session" on the bar) and card widgets get a gold border.
- **Live:** the strip's live icon gets a running dashed gold border and a game clock (Spectator `gameStartTime`); the other styles show a pulsing red dot next to the record caption. With animations on, every style asks for the live game (same 2-minute budget).
- **Entrance:** the widget wipes in and numbers count up from zero when OBS shows it.
- **Long names** scroll back and forth when they don't fit.
- **`fx=rotate`:** the bar alternates Session and Season every 8 s, the pill alternates rank and record.
- **`fx=smoke`:** the emblem gives off a faint vapor (a blurred, wavering copy of its own shape drifting up).
- `anim=off` freezes all motion; numbers and chips still show.
- Numbers settle on their final value even when the page is hidden and frames don't run.

### Styles (from the mockup)

1. **Bar (460 × 88):** rank emblem; Riot ID with tag and a server chip; tier, division and LP; then a "Session" block: W/L and LP change.
2. **Square (240 × 310):** Riot ID and server; big emblem; tier, division and LP on one line (no LP progress bar, owner's decision); "Session" W/L and "LP today" side by side; one green/red dot per session game.
3. **Session strip (520 wide):** header with emblem, Riot ID, server, tier and LP, and session W/L, win rate and LP change on the right; below it one champion icon per session game (newest on the left, at most 8, the oldest drop off) with green/red border and KDA; when the summoner is in a game, a dashed gold icon of the current champion labelled "Live" comes first (owner's request).
4. **Pill:** one line: small emblem, short rank (`E2`), LP, W/L, LP change.

### Content rules

- **Rank:** the chosen queue's tier, division and LP, with the emblem from `/icons/rank/{tier}.png`. Apex tiers show no division. Unranked: unranked emblem and "Unranked", session still shown.
- **Session games** are the summoner's games in the chosen ranked queue (420 solo or 440 flex) inside the session window. Remakes don't count.
- **Session window:**
  - `auto`: walk back from the newest game; the session is the run of games with less than 3 hours between one game's end and the next game's start. If the newest game ended more than 3 hours ago, the session is empty (0W 0L) until the next game starts. *(Gap length is the builder's call; 3 hours is the default.)*
  - `today`: since the viewer's local midnight (the widget runs in the streamer's OBS, so the browser's timezone is the streamer's).
  - `load`: since the widget page was loaded. Reloading the OBS source resets it.
  - `season` ("Overall", owner's request): W/L is the queue's season record from the ranked entry (all ranked games this season, no extra Riot call); the strip shows the latest 8 games and the square the latest 10 dots (one Match-v5 ids call for the last 10, same budget rules); the caption reads "Season"; no LP change (we have no season-start LP).
- **LP change** = absolute LP now − absolute LP at session start (`toAbsoluteLp`, so promotions and demotions count across tiers). LP at session start = the newest `LPHistory` row of that queue created before the session's first game started. No such row (new account, or the session has no games yet): show no LP change rather than a guess.
  - **Stale baseline** *(builder's call recorded here)*: snapshots are only written when someone loads the profile, a widget polls, or the cron reaches the account, so the newest row before the session can predate games outside the session. Check it: the row's wins + losses plus the session's games must equal the current wins + losses. If they don't match, or the row has no wins/losses, show no LP change. Same choice `calculateLPChange` already makes per match. In practice the number appears once the widget has been running since before the session's first game.
- **Win rate %** (when enabled) = session wins / session games, shown after the W/L as `5W 2L (71%)` in every style, hidden at 0 games.
- **Which toggles apply where** *(builder's call recorded here)*: a toggle only affects styles that have a place for it. Riot ID and server: bar, square, strip (the pill never shows them). LP change and win rate %: all four. The generator hides toggles that don't apply to the chosen style.
- **Sizes:** each style has a fixed height; hiding a part may shrink the width. The square shows at most 10 dots (newest kept). The page background is transparent, so the OBS hint gives each style's maximum width and height and a larger source costs nothing.
- **Server chip:** `EUNE` / `EUW` from the account's platform.
- Summoner not found: the widget renders a small "Summoner not found" in its own style instead of failing silently.
- Maintenance mode: the widget page renders nothing (it disappears from the stream) instead of the site's maintenance screen.

## Data (decided)

A new route, e.g. `GET /api/widget/{slug}?queue=…&since=…` *(name is the builder's call)*, returns one Zod-validated payload: Riot ID, platform, rank of the queue, session games (champion, win, kills/deaths/assists, start and end time), LP change or null, and live game champion or null. For `auto` the client sends no `since` and the server computes the window; for `today` and `load` it sends `since` as epoch ms.

Riot call budget per summoner, shared by every browser showing that summoner (cache keyed by puuid and queue):

- Ranked entries: refreshed at most once a minute through `saveRankedEntries`, which also writes the `LPHistory` snapshot whenever LP, tier or division changes. That snapshot is what makes the LP change exact.
- Match-v5 ids (queue + `startTime`): only when the ranked wins + losses changed since the last check, or at least every 5 minutes. Details only for matches not stored yet (`fetchAndStoreMatch`); stored matches are never fetched again.
- Spectator (for "Live" in the strip): at most once every 2 minutes, only for `style=strip`.
- On 429 return what is stored, never retry in a loop. Per-IP rate limit on the route, like the overlay endpoint.
- The account becomes / stays a tracked account (DB-first `resolveAccount`), so it joins the ranked cron.

## Generator on `/summoner/[name]` (decided)

- A "Stream widget" button in the summoner page opens a dialog (as in the mockup): options on the left (style, theme, queue, session start, show), a live preview on a checkerboard on the right, the URL with "Copy URL" and "Open", and a one-line OBS hint with the width and height for the chosen style.
- The preview renders the real widget component, not an iframe. *(Builder's call recorded here:)* when the dialog opens it fetches the widget endpoint once for that summoner and queue (cached, so it costs at most the normal budget). When the real session is empty (always for `load`), the preview fills the session part with sample games, labelled "Sample session", so the streamer can judge the strip icons and square dots; rank and Riot ID stay real.
- The button sits next to Update in the hero, tinted in the primary color so streamers notice it (owner's request).
- The home page has a "Stream widget" panel right under the search hero, with two sample widgets of a made-up Grandmaster player and a line on where to make one (owner's request).
- The generator also offers Animations on/off, the effects that apply to the chosen style, and "Play win" / "Play promotion" buttons on the preview.

## Testing

- Unit tests (Vitest) for: the session window (`auto` gaps, `today`, `load`, empty session, remakes excluded), LP change across a promotion and a demotion and with no snapshot, the call-budget rules (when match ids are refetched, when spectator is called), URL option parsing with defaults and bad values.
- The widget and generator UI are checked by the owner in OBS; the builder gives a short checklist (add as Browser Source, transparent background, refresh after a game).

## Left to the builder

- Route names, file split, cache mechanism.
- How the widget route escapes the root layout's navbar, footer, maintenance screen and toaster (e.g. route groups with their own root layouts).
- How `show` is encoded in the URL.
- Exact pixel styling within the mockup's look; the auto-session gap length.
