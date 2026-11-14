# Shareable Link Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Branded 1200×630 link-preview images for a match, a promotion and an achievement, wired into the pages those links open, plus Share buttons.

**Architecture:** Three route handlers under `src/app/og/…` (outside the `(site)` group) return `ImageResponse` built from database data only. Pure view-model builders in `src/lib/og/` turn stored rows into card fields and are unit-tested. The match, LP and achievements pages get `generateMetadata` that points `og:image` at those routes when their share query parameter is present.

**Tech Stack:** Next 16 app router, `next/og` `ImageResponse`, Prisma, Vitest, react-hot-toast.

**Spec:** `docs/superpowers/specs/2026-11-14-share-images-design.md` (read it; card content and the builder's calls live there). Approved mockup: `.superpowers/brainstorm/1318-1794599618/content/features-v1.html`, section 1.

## Global Constraints

- pnpm only. Never run Prisma migrations. Never print the Riot key or DB credentials.
- Commit straight to `main`, no new branches. Do not push.
- Minimal comments: only the non-obvious why.
- Logic in `src/lib/…` with Vitest tests written first.
- **No Riot calls** from any new code (image routes, view models, loaders, `generateMetadata`). Missing data → 404 / no custom metadata.
- Read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md` and `…/generate-metadata.md` before writing routes/metadata. `ImageResponse`: flexbox only, `ttf`/`otf` fonts, 500 KB bundle.
- Cache headers: complete images `public, max-age=31536000, immutable`; incomplete (no score because no baseline, or no rarity) `public, max-age=3600`; 404 `public, max-age=300`.
- Day grouping for the promotion card uses `Europe/Budapest`.
- Wordmark text: `summon.gg`.
- No Est. MMR or performance rank on any card.

## Review Focus

1. A puuid that did not play in the match, or a snapshot id of another player's demotion → 404, never a half-filled card. (Task 2 / Task 3 tests.)
2. A game at 23:30 UTC belongs to the next day in Budapest; the promotion card's day W/L must follow Budapest. (Task 3 `dayKeyIn` test.)
3. A match with no LP snapshot within 24 h after it, or played before tracking began → no rank in the footer, not the current rank. (Task 2 `pickRankAtMatch` test.)
4. Riot IDs with spaces, accents or `#`-like characters produce valid share URLs. (Task 1 URL builder test.)
5. Seasonal achievement shared for a closed season: same id, other scope → card for that season, no rarity line. (Task 4 test.)

---

### Task 1: Fonts, OG response helper, share URLs and Share button

**Files:**
- Create: `assets/fonts/Geist-Bold.ttf`, `assets/fonts/Geist-ExtraBold.ttf` (download; owner approved)
- Create: `src/lib/og/response.ts`, `src/lib/og/share-urls.ts`, `src/lib/og/share-urls.test.ts`, `src/lib/og/response.test.ts`
- Create: `src/components/ui/share-button.tsx`

**Interfaces:**
- Produces:
  - `OG_SIZE = { width: 1200, height: 630 }`
  - `ogCacheControl(kind: "complete" | "incomplete" | "missing"): string`
  - `ogImage(element: React.ReactElement, complete: boolean): Promise<ImageResponse>` (loads fonts once at module scope: Geist Regular from `next/og` default, Bold 700, ExtraBold 800 from `assets/fonts`; sets `Cache-Control` via `ogCacheControl`)
  - `ogNotFound(): Response` (404, `ogCacheControl("missing")`)
  - `matchShareUrl(matchId: string, puuid: string): string` → `/match/{matchId}?puuid={puuid}`
  - `promoShareUrl(gameName: string, tagLine: string, snapshotId: string): string` → `/summoner/{slug}/lp?promo={id}`
  - `achievementShareUrl(gameName: string, tagLine: string, achievementId: string, scope: string): string` → `/summoner/{slug}/achievements?a={id}&s={scope}`
  - `<ShareButton path={string} title={string} className?={string} />` client component: icon button (lucide `Share2`), `aria-label="Share"`; uses `navigator.share({ url, title })` when present, else `navigator.clipboard.writeText(url)` + `toast.success("Link copied")`; `url = window.location.origin + path`; stops click propagation (it sits inside clickable rows).

- [ ] **Step 1: Download fonts**
Geist Bold and ExtraBold `.ttf` from the official Geist release (github.com/vercel/geist-font releases) or Google Fonts static files. Save to `assets/fonts/`. Check each is a TTF (`file` shows "TrueType") and under 200 KB.

- [ ] **Step 2: Write failing tests**
```ts
// share-urls.test.ts
expect(matchShareUrl("EUN1_1", "p/1")).toBe("/match/EUN1_1?puuid=p%2F1");
expect(promoShareUrl("Cool Guy", "EUNE", "s1")).toBe("/summoner/Cool%20Guy-EUNE/lp?promo=s1");
expect(achievementShareUrl("Árvíz", "HUN", "season-penta", "2026")).toBe("/summoner/%C3%81rv%C3%ADz-HUN/achievements?a=season-penta&s=2026");
// response.test.ts
expect(ogCacheControl("complete")).toBe("public, max-age=31536000, immutable");
expect(ogCacheControl("incomplete")).toBe("public, max-age=3600");
expect(ogCacheControl("missing")).toBe("public, max-age=300");
```

- [ ] **Step 3: Run** `pnpm vitest run src/lib/og` — Expected: FAIL (modules missing).

- [ ] **Step 4: Implement** `response.ts`, `share-urls.ts` (use `toSummonerSlug` from `@/lib/game/riot-id`; `URLSearchParams` for queries), `share-button.tsx`.

- [ ] **Step 5: Run** `pnpm vitest run src/lib/og && pnpm typecheck` — Expected: PASS.

- [ ] **Step 6: Commit** `feat(og): fonts, image response helper, share urls and share button`

---

### Task 2: Match card

**Files:**
- Create: `src/lib/og/match-card.ts`, `src/lib/og/match-card.test.ts`, `src/lib/og/match-card-data.ts`
- Create: `src/lib/achievements/badges/store.ts` (badge detect-and-store moved out of the route)
- Modify: `src/app/api/match-badges/batch/route.ts` (use `store.ts`)
- Create: `src/app/og/match/[matchId]/[puuid]/route.tsx`
- Modify: `src/app/(site)/match/[id]/page.tsx` (add `generateMetadata`)
- Modify: `src/components/summoner/matches/match-row.tsx`, `src/components/match/match-hero.tsx` (ShareButton)

**Interfaces:**
- Consumes: Task 1 (`ogImage`, `ogNotFound`, `matchShareUrl`, `ShareButton`).
- Produces:
  - `interface MatchCard { result: "win" | "loss" | "remake"; queue: string; duration: string; role: string | null; championName: string; kills: number; deaths: number; assists: number; kda: string; csPerMin: string; killShare: number; score: { value: number; grade: Grade; categories: { id: CategoryId; score: number; grade: Grade }[] } | null; badgeIds: string[]; riotId: string; rank: { tier: string; division: string; lp: number } | null }`
  - `buildMatchCard(match: Match, puuid: string, score: PerformanceScore | null, badgeIds: string[], rank: MatchCard["rank"]): MatchCard | null` (null when puuid not in match)
  - `pickRankAtMatch(snapshots: { tier: string; rank: string; lp: number; createdAt: Date }[], gameEndMs: number): MatchCard["rank"]` — first snapshot with `createdAt >= gameEnd` and `< gameEnd + 24h`
  - `matchMetadata(card: MatchCard): { title: string; description: string }`
  - `loadMatchCard(matchId: string, puuid: string): Promise<{ card: MatchCard; complete: boolean } | null>` (DB match row; `performanceForMatch`; `badgesForMatch`; LPHistory of the match queue's `queueType` for 420/440 only; `complete = card.score !== null || !scoreable` where scoreable = ranked queue, not remake)
  - `badgesForMatch(matchId: string): Promise<{ puuid: string; badgeId: string }[]>` in `badges/store.ts` (read stored rows, else detect from the stored match and `createMany` with `skipDuplicates`, same eligibility as today)

- [ ] **Step 1: Failing tests** (`match-card.test.ts`, fixture match with 10 participants, team kills 37):
  - win, 14/2/9, 31:42, CS 289 → `kda "11.5"`, `csPerMin "9.1"`, `killShare 0.62` (rounded to 2 dp), `duration "31:42"`
  - remake (`gameDuration 240`) → `result "remake"`, `score null` even when a score is passed
  - unknown puuid → `null`
  - `pickRankAtMatch`: snapshot 3 h after → returned; only snapshots before the game → `null`; first one 25 h after → `null`; two after → earliest
  - `matchMetadata` → `{ title: "Velmora#MOON · Ahri 14/2/9 · S+ 94", description: "Victory in Ranked Solo · Grandmaster 412 LP" }`; unscored and unranked → `"Velmora#MOON · Ahri 14/2/9"` / `"Victory in ARAM"`

- [ ] **Step 2: Run** `pnpm vitest run src/lib/og/match-card.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** `match-card.ts` (queue label via `getQueueName`; remake via `isRemake`; role from `teamPosition` mapped to Top/Jungle/Mid/Bot/Support, empty → null), `badges/store.ts` + route refactor (behaviour of `/api/match-badges/batch` unchanged), `match-card-data.ts`.

- [ ] **Step 4: Run** `pnpm vitest run` — Expected: all PASS (existing badge tests included).

- [ ] **Step 5: Route** `src/app/og/match/[matchId]/[puuid]/route.tsx`: `loadMatchCard` → `ogNotFound()` when null; else `ogImage(<MatchCardImage …/>, complete)`. JSX follows the mockup: splash background (`getChampionSplash`) dimmed + gradient, champion icon (`getChampionIcon` with `getDDragonVersion`), K/D/A, score ring in `GRADE_COLORS`, 3×2 category grid with `CATEGORY_LABELS`, badge chips coloured from `getMatchBadgeById`, footer emblem from `public/icons/rank/{tier}.png` read as a data URL, wordmark.

- [ ] **Step 6: Metadata** in `match/[id]/page.tsx`: `generateMetadata({ params, searchParams })` → when `puuid` present and `loadMatchCard` returns a card: `title`, `description`, `openGraph.images = [{ url: "/og/match/{id}/{puuid}", width: 1200, height: 630 }]`, `twitter: { card: "summary_large_image" }`; otherwise `{}`.

- [ ] **Step 7: Share buttons**: match row (next to the score circle, `matchShareUrl(match.metadata.matchId, player.puuid)`), match hero (when `player`).

- [ ] **Step 8: Verify** `pnpm typecheck && pnpm vitest run && pnpm lint` (only the 3 known `as any` errors allowed). Then `pnpm dev` and open `/og/match/{a stored match id}/{a player's puuid}` in the browser pane — Expected: PNG matching the mockup; unknown puuid → 404.

- [ ] **Step 9: Commit** `feat(og): match share card`

---

### Task 3: Promotion card

**Files:**
- Create: `src/lib/og/promo-card.ts`, `src/lib/og/promo-card.test.ts`, `src/lib/og/promo-card-data.ts`
- Create: `src/app/og/promo/[snapshotId]/route.tsx`
- Modify: `src/app/(site)/summoner/[name]/lp/page.tsx` (`generateMetadata`)
- Modify: `src/components/summoner/lp-history/lp-changes-table.tsx` (ShareButton on `kind === "promotion"` rows; needs the account's gameName/tagLine from the summoner context)

**Interfaces:**
- Consumes: Task 1; `lpChangeRows` from `@/lib/lp-history/summary`.
- Produces:
  - `dayKeyIn(iso: string, timeZone: string): string` → `YYYY-MM-DD` via `Intl.DateTimeFormat("en-CA", { timeZone })`
  - `interface PromoCard { tier: string; division: string; label: string; from: string; queue: "Ranked Solo" | "Ranked Flex"; day: string; wins: number; losses: number; netLp: number; avgScore: number | null; riotId: string }`
  - `buildPromoCard(snapshots: LPSnapshot[], snapshotId: string, riotId: string, queueType: string, avgScore: number | null, timeZone?: string): PromoCard | null` (null unless `lpChangeRows` marks that snapshot `promotion`; day stats from the queue's rows whose `dayKeyIn(createdAt, tz)` equals the promotion's day; default tz `Europe/Budapest`)
  - `promoMetadata(card: PromoCard): { title: string; description: string }` → `"Velmora#MOON promoted to Master"` / `"Diamond I → Master · Ranked Solo"`
  - `loadPromoCard(snapshotId: string): Promise<{ card: PromoCard; complete: true } | null>` (snapshot → its puuid + queue → all snapshots of that queue → account; `avgScore` = mean of stored `MatchPerformance.summary[puuid].score` for that day's games of the queue only when every one has a score, else null)

- [ ] **Step 1: Failing tests**: `dayKeyIn("2026-11-13T23:30:00Z", "Europe/Budapest") === "2026-11-14"`; promotion D1 → Master returns `{ label: "Master", from: "Diamond I" }` with the day's W/L and net LP; a `gain` or `demotion` snapshot → `null`; unknown id → `null`; apex label has no division; `promoMetadata` strings above.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/og/promo-card.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `promo-card.ts`, `promo-card-data.ts`.
- [ ] **Step 4: Run** `pnpm vitest run` — Expected: PASS.
- [ ] **Step 5: Route** `/og/promo/[snapshotId]`: null → `ogNotFound()`; else `ogImage(<PromoCardImage/>, true)` — emblem with glow in `RANK_COLORS[tier]`, texts per spec, `avgScore` block only when not null.
- [ ] **Step 6: Metadata** on the LP page when `promo` is set and the card exists (same shape as Task 2 Step 6, image `/og/promo/{id}`).
- [ ] **Step 7: Share button** on promotion rows (`promoShareUrl`).
- [ ] **Step 8: Verify** like Task 2 Step 8 with a real promotion snapshot id from the LP table.
- [ ] **Step 9: Commit** `feat(og): promotion share card`

---

### Task 4: Achievement card

**Files:**
- Create: `src/lib/og/achievement-card.ts`, `src/lib/og/achievement-card.test.ts`, `src/lib/og/achievement-card-data.ts`
- Create: `src/app/og/achievement/[puuid]/[achievementId]/[scope]/[tier]/route.tsx`
- Modify: `src/app/(site)/summoner/[name]/achievements/page.tsx` (`generateMetadata`)
- Modify: `src/components/summoner/achievements/progress-card.tsx` (ShareButton when `view.tier > 0`; needs gameName/tagLine from the summoner context)

**Interfaces:**
- Consumes: Task 1; `getMilestone`, `getSeasonal`, `rarityText`, `tierColor` (from `progress-card`'s `tier-frame.tsx`), `TIER_NAMES`.
- Produces:
  - `interface AchievementCard { id: string; name: string; description: string; icon: string; tier: number; maxTier: number; tierName: string | null; color: string; scope: string; rarity: string | null; riotId: string }`
  - `buildAchievementCard(achievementId: string, scope: string, tier: number, row: { tier: number } | undefined, rarity: Rarity | null, riotId: string): AchievementCard | null` (null when the definition is unknown — milestone for scope `all`, seasonal otherwise — or `row.tier < tier` or `tier < 1`)
  - `achievementMetadata(card): { title: string; description: string }` → `"Velmora#MOON unlocked Pentakill Hunter III"` (tier as roman numeral; no numeral when `maxTier === 1`) / the definition's description
  - `loadAchievementCard(puuid, achievementId, scope, tier): Promise<{ card: AchievementCard; complete: boolean } | null>` (`complete = card.rarity !== null`)

- [ ] **Step 1: Failing tests**: reached tier 3 of 4 → card with `tierName` and `rarity` text from `rarityText`; asking tier 4 while row tier 3 → null; unknown id → null; seasonal id with scope `"2025"` and rarity only for `"2026"` → `rarity null`; binary achievement (`maxTier 1`) → title without numeral.
- [ ] **Step 2: Run** `pnpm vitest run src/lib/og/achievement-card.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** builder and loader (`AchievementProgress` row by `puuid_achievementId_scope`, `loadRarity`, account).
- [ ] **Step 4: Run** `pnpm vitest run` — Expected: PASS.
- [ ] **Step 5: Route**: icon `public/achi/{icon}.svg` as data URL in a frame coloured `card.color`, pips, rarity line only when present, footer Riot ID + wordmark (no rank).
- [ ] **Step 6: Metadata** on the achievements page when `a` (and `s`, default `all`) is set; image URL uses the player's current reached tier.
- [ ] **Step 7: Share button** on reached cards (`achievementShareUrl(…, def.id, scope)`).
- [ ] **Step 8: Verify** like Task 2 Step 8.
- [ ] **Step 9: Commit** `feat(og): achievement share card`
