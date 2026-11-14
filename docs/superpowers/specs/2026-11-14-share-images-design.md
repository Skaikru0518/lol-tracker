# Shareable link previews (OG images) — design

Approved mockup (local, git-ignored): `.superpowers/brainstorm/1318-1794599618/content/features-v1.html`, section 1.

## Intent

When a Summon.gg link is pasted into Discord, Twitter/X or any chat, the preview should be a branded picture of the moment: a match, a promotion or an achievement. Every share then advertises the site. Today every link shows the site icon only (`src/app/layout.tsx` sets `/icon.ico` as the OG image).

This is the first of three features (order: share images → duo & friends → session strip); each ships and is reviewed by the owner before the next starts.

## Goals

- Three 1200×630 images, matching the approved mockup:
  - **Match card** for one player in one match.
  - **Promotion card** for one LP snapshot where the player moved up a division or tier.
  - **Achievement card** for one achievement at the tier the player has reached.
- The pages these links open set `og:image`, `og:title`, `og:description` and `twitter:card = summary_large_image`.
- A "Share" button next to each shareable thing copies the link (native share sheet on mobile).

## Non-goals

- Downloadable images or "save as PNG".
- Share images for profiles, LP graphs, sessions or comparisons (may come later).
- Posting to Discord/Twitter for the user, bots, webhooks.
- Changing the match, LP or achievements pages beyond metadata and the Share button.

## Anti-goals

- **No Riot calls from image routes.** Crawlers (Discord, Twitter, Slack, link unfurlers) hit these URLs unpredictably; images are built from the database only. Missing data → no custom image (fall back to the site default), never a fetch.
- No unofficial skill rating (no Est. MMR, no performance rank) on any card.
- No new page routes or redirects; existing links keep working.

## Constraints (project-wide)

- pnpm only. Never run Prisma migrations (the owner does). Never print the Riot key or DB credentials.
- Commit straight to `main`, no new branches. Push only when the owner asks.
- Minimal comments: only the non-obvious why.
- Logic in `src/lib/…` with Vitest tests (TDD); Zod at trust boundaries.
- Next 16: read `node_modules/next/dist/docs/` before Next.js work (`AGENTS.md`). `ImageResponse` (`next/og`): flexbox only, `ttf`/`otf`/`woff` fonts, 500 KB bundle limit.

## Approaches (owner picked A)

- **A — Image route handlers + `generateMetadata` (chosen).** Three route handlers render the images; the existing pages' `generateMetadata` points `og:image` at them. Works with the query parameters the site already uses (`/match/[id]?puuid=`), needs no new page routes, images can be cached hard, and the routes sit outside the `(site)` group so maintenance mode does not replace them.
- **B — `opengraph-image.tsx` file convention.** Next's built-in path, but it cannot see query parameters, so the player would have to move into the path (`/match/[id]/[player]`) and promotions/achievements would need new segments. More routing churn for the same result.

## Design (decided)

### Links that get a preview

| Card | Link the user shares (existing page) | Image URL |
|---|---|---|
| Match | `/match/{matchId}?puuid={puuid}` | `/og/match/{matchId}/{puuid}` |
| Promotion | `/summoner/{slug}/lp?promo={snapshotId}` | `/og/promo/{snapshotId}` |
| Achievement | `/summoner/{slug}/achievements?a={achievementId}&s={scope}` | `/og/achievement/{puuid}/{achievementId}/{scope}/{tier}` |

- The tier is in the achievement image URL so each image is immutable: reaching the next tier gives a new URL, and old shares keep showing the tier they were shared at.
- *(builder's call)* The scope is in both achievement URLs: `all` for milestones, the season id for seasonal achievements, which reuse the same id every season (`AchievementProgress` is keyed by puuid, id and scope). Closed seasons are shareable too; they simply have no rarity line.
- Without the query parameter the pages keep today's metadata.

### Card content (from the mockup)

- **Match card:**
  - result tag (VICTORY / DEFEAT / REMAKE), queue name, duration, role;
  - champion icon, K/D/A big, under it KDA ratio, CS/min, kill share;
  - performance score ring with grade, coloured with `GRADE_COLORS`;
  - the six category scores;
  - the player's match badges as coloured chips with names (same colours as `MATCH_BADGES`; no emoji);
  - footer: rank emblem, Riot ID, the player's rank **at the time of the match**, `summon.gg` wordmark.
  - *(builder's call)* The image is cached for a year, so "current rank" would freeze at whatever it was when a crawler first loaded it. Rank at match time = the first `LPHistory` snapshot of that queue created after the game ended, within 24 hours. No such snapshot, or a non-ranked queue (normals, ARAM, Arena) → no rank and no emblem in the footer.
  - Background: the champion's DDragon splash, dimmed, with a left-to-right dark gradient.
  - Games with no score (non-ranked queues, remakes, unscored yet): no score ring and no category grid; everything else stays.
- **Promotion card:**
  - big emblem of the new tier with a glow in the tier colour (`RANK_COLORS`);
  - "PROMOTED", the new rank (e.g. "Master" or "Diamond I"), "from → to" line and queue;
  - that day's W/L and net LP for the queue (from `groupChangesByDay` over the player's snapshots);
  - *(builder's call)* "That day" is the calendar day in `Europe/Budapest`. The image is the same for every viewer, and the audience is EUNE/EUW. The server runs in UTC, so the day grouping must be given the zone explicitly instead of relying on the runtime's local time.
  - footer: Riot ID, date, wordmark.
  - The mockup's "avg score" is shown only when that day's ranked games in the queue all have stored scores; otherwise it is left out.
- **Achievement card:**
  - the achievement's icon (`/achi/{icon}.svg`) framed in its tier colour (`tierColor`);
  - "ACHIEVEMENT UNLOCKED", name, tier and description line;
  - tier pips (reached / max);
  - rarity line "Only X% of Summon.gg players have it" from the stored rarity (`loadRarity`); left out when rarity is missing;
  - footer: Riot ID and wordmark. *(builder's call)* No rank: it would freeze at share time and has nothing to do with the achievement.

### Metadata

- Titles and descriptions, e.g. match: `Velmora#MOON · Ahri 14/2/9 · S+ 94` / `Victory in Ranked Solo · Grandmaster 412 LP`; promotion: `Velmora#MOON promoted to Master`; achievement: `Velmora#MOON unlocked Pentakill Hunter III`.
- Absolute image URLs come from the existing `metadataBase` (`SITE_URL`).
- `twitter.card = "summary_large_image"` on these pages only.

### Share buttons

- Match: a share icon button on the match row (`src/components/summoner/matches/match-row.tsx`) and in the match page hero.
- Promotion: on promotion rows of the LP changes table (`lp-changes-table.tsx`, rows with `kind === "promotion"`).
- Achievement: on achievement cards with tier > 0 (`progress-card.tsx`).
- Behaviour: `navigator.share` when available (mobile), otherwise copy to clipboard and show the existing toast ("Link copied").

### Validation and failure

- *(builder's call)* Scores and badges: the image routes and `generateMetadata` may compute and store them from the database exactly like the existing APIs do (`performanceForMatch` in `src/lib/performance/batch.ts`; the badge detection used by `api/match-badges/batch`, moved into `src/lib` so both can call it). Database only, never Riot. So a link shared right after the game still gets its score ring and badges. If a score still cannot be made (no baseline yet), the card is drawn without it and gets the short cache below instead of the immutable one.
- Route params are validated (Zod or the existing parsers). An unknown match, player not in the match, unknown snapshot, a snapshot that is not a promotion, or an achievement tier the player has not reached → 404. Crawlers then show the plain link; the page metadata still points at the image, so it must also only be set when the data exists.
- `generateMetadata` reads the same data; it must not call Riot either (DB-first reads only).
- *(builder's call)* The "no Riot" rule covers the new code only. The existing summoner layout and its `generateMetadata` stay as they are (DB-first, with background refreshes when stale); a crawler opening a profile link costs the same as a visitor.

### Caching

- Match and promotion images never change: `Cache-Control: public, max-age=31536000, immutable`.
- Achievement images are immutable per tier (tier in the URL): same header. The rarity number is the one at share time.
- Incomplete cards (no score because no baseline yet, or no rarity yet): `public, max-age=3600`, so they fill in later.
- 404s are not cached long (`max-age=300`).

### Wordmark

- *(builder's call)* Cards show the brand `summon.gg`, as the stream widget watermark already does, not the deployment host (`SITE_URL`). Chat apps show the real link above the preview anyway.

### Fonts and assets

- `next/og` ships Geist Regular (already in `node_modules/next/dist/compiled/@vercel/og/`). The cards need a bold weight: add Geist Bold (and ExtraBold if the numbers need it) as `.ttf` under `assets/fonts/`, loaded once at module scope.
  - **Needs the owner's OK to download** the font files (Google Fonts / Vercel's Geist release, OFL licence).
- Rank emblems and achievement icons are read from `public/` at module scope or per request; champion icon and splash load from DDragon by URL inside the image.

## Testing

- Unit tests (Vitest) for the pure parts: building each card's view model from stored data (match → card fields, including unscored and remake; snapshot list → promotion details and day W/L/LP; achievement progress + rarity → card fields), the title/description strings, and the "is this snapshot a promotion" check.
- The images themselves and the Discord/Twitter previews are checked by the owner (e.g. by pasting a link in Discord after deploy; Discord caches previews per URL).

## Left to the builder

- File split, view-model shapes, exact pixel styling within the mockup's look.
- Where the image routes live in `src/app` (outside `(site)`), and whether a shared card frame component is worth it.
- Icon for the Share button (from the existing icon sets).
- Exact error-handling shape inside the routes, as long as the rules above hold.
