# Achievement Milestones and Seasons — Design Spec

## Goal

Give summoner profiles achievements that last. Today every account achievement is a rolling "current form" check that can disappear the next day. This adds two layers next to it:

- **Milestones** — all-time, tiered (Bronze, Silver, Gold, Platinum), never lost.
- **Seasonal** — a separate list per ranked season; earned ones stay for that season, closed seasons are archived.

Every milestone and seasonal achievement shows progress, rarity and when it was reached, and the profile Overview highlights the top three milestones.

## Decisions (from brainstorming, 2026-10-11)

| Topic | Decision |
|---|---|
| Layers | Match badges (unchanged) · account **Current form** (existing, rolling) · account **Milestones** (new, permanent) · account **Seasonal** (new, per season) |
| Milestone time span | All stored ranked games ("since Summon.gg tracks you"); never reset |
| Tiers | 4: Bronze, Silver, Gold, Platinum |
| Existing 26 achievements | Stay as Current form, except **Pentakill** (→ Pentakiller milestone) and the three **rank** achievements (→ Peak Rank milestone) |
| Season boundary | Riot ranked-reset dates as a constant list in code |
| Seasonal content | Its own list, not the milestones filtered by season |
| Extras | Progress bar, rarity, reached date, Overview highlight — all of them |
| Approach | Aggregate SQL on recompute, results stored per achievement and scope (approach 1) |
| Icons | Own SVGs in the `/public/achi` style for every new achievement |

## Non-goals

- Match badges do not change.
- No badge-count milestones yet (e.g. "MVP Collector"); the design leaves room to add them as one definition each.
- Reached dates are the first time Summon.gg **detected** a tier, not the historical match where it happened.
- No Riot `challenges` data (stripped on store) and no timeline-based achievements.
- No keyboard navigation work.

## Eligible games

Same rule as Current form and match badges (`src/lib/achievements/eligibility.ts`): queues 420, 440 and 710, games of at least 300 seconds. Every count below is over eligible games only.

## Seasons

`src/lib/achievements/seasons.ts` holds the ranked years:

```ts
export const SEASONS = [
	{ id: "2025", label: "Season 2025", start: "2025-01-09T11:00:00Z" },
	{ id: "2026", label: "Season 2026", start: "2026-01-08T11:00:00Z" },
];
```

- Riot resets ranks once a year at noon local server time (2025: January 9; 2026: January 8; EUNE noon in winter is 11:00 UTC). Mid-year "seasons" and acts are not resets and are ignored.
- A season runs from its `start` to the next season's `start`; the last one is current.
- Adding a season is one line.

## Milestones

`value` is the all-time count; a tier is reached when `value >= threshold`.

| id | Name | Counts | Bronze / Silver / Gold / Platinum |
|---|---|---|---|
| `veteran` | Veteran | eligible games | 50 / 200 / 500 / 1000 |
| `winner` | Winner | wins | 25 / 100 / 250 / 500 |
| `pentakiller` | Pentakiller | pentakills | 1 / 5 / 15 / 30 |
| `multikiller` | Multikiller | quadrakills | 5 / 25 / 75 / 150 |
| `slayer` | Slayer | kills | 500 / 2000 / 5000 / 10000 |
| `wingman` | Wingman | assists | 1000 / 4000 / 10000 / 20000 |
| `visionary` | Visionary | vision score | 5000 / 20000 / 50000 / 100000 |
| `demolisher` | Demolisher | turret kills | 25 / 100 / 250 / 500 |
| `epic-hunter` | Epic Hunter | dragon + baron kills | 25 / 100 / 250 / 500 |
| `champion-pool` | Champion Pool | distinct champions with a win | 10 / 25 / 50 / 80 |
| `one-champ-army` | One Champ Army | most wins on one champion | 25 / 75 / 150 / 300 |
| `mastery-collector` | Mastery Collector | champions at mastery level 10+ | 1 / 5 / 10 / 20 |
| `devotion` | Devotion | most mastery points on one champion | 100k / 500k / 1M / 2M |
| `peak-rank` | Peak Rank | highest tier ever seen, any ranked queue | Emerald / Diamond / Master / Grandmaster+ |

- Mastery milestones read `ChampionMastery`. Until an account's full mastery list is synced (`masteriesSyncedAt`), only the top masteries are stored; the max-merge keeps the result from going down once the sync completes.
- Peak Rank reads every `LPHistory` snapshot and the current `RankedEntry` rows. Its `value` is the tier ordinal (Iron 0 … Challenger 9); Grandmaster and Challenger both count as Platinum.

## Seasonal

Evaluated for the current season on every recompute. Binary (`tier` 0 or 1) with a progress `value`, except Season Peak, which is tiered like Peak Rank.

| id | Name | Earned when | `value` (progress) |
|---|---|---|---|
| `season-grinder` | Season Grinder | 100 eligible games in the season | games |
| `season-winner` | Season Winner | 50 wins in the season | wins |
| `iron-will` | Iron Will | 55%+ win rate over 50+ games in the season | games (target 50; UI notes the win rate once 50 is reached) |
| `hot-streak` | Hot Streak | 7 wins in a row in the season (by `gameCreation`) | longest win streak |
| `main-character` | Main Character | 30 games on one champion in the season | most games on one champion |
| `promoted` | Promoted | in any ranked queue, the current tier is above the tier of the season's first snapshot in that queue | 0 or 1 |
| `triple-threat` | Triple Threat | ranked in Solo, Flex and 5s (a `RankedEntry` for each) | queues ranked in (target 3) |
| `season-peak` | Season Peak | highest tier in the season's snapshots (plus current ranks for the current season): Emerald / Diamond / Master / Grandmaster+ | tier ordinal |

Closed seasons are frozen: they are computed once, the first time no row exists for that season, from the stored games and snapshots, and never rewritten. Triple Threat cannot be rebuilt for a closed season and is skipped there.

## Data model

New table (migration `prisma/migrations/20261011120000_add_achievement_progress`, applied by the user):

```prisma
model AchievementProgress {
  puuid         String
  achievementId String
  scope         String     // "all" for milestones, a season id for seasonal
  value         Int
  tier          Int        // 0 none, 1–4 Bronze..Platinum; seasonal binary 0/1
  reachedAt     DateTime[] // index i = when tier i+1 was first detected
  updatedAt     DateTime   @updatedAt

  account Account @relation(fields: [puuid], references: [puuid])

  @@id([puuid, achievementId, scope])
  @@index([achievementId, scope, tier])
}
```

**Merge rule** (pure function, unit-tested): `tier = max(stored.tier, computed.tier)`; `value` is the newly computed value. Each newly reached tier appends `now` to `reachedAt`; existing dates are kept. Milestones and earned seasonal achievements therefore never go down. This holds for Current form only as it does today: it is still recomputed and can be lost.

Rarity is stored as JSON in `AppSettings` under `achievement-rarity`:

```ts
{ computedAt: string; players: number; shares: Record<string /* `${id}:${scope}` */, number[] /* share per tier, 0..1 */> }
```

## Computation

Runs where Current form runs today: POST `/api/achievements` (profile visit) and the achievements cron.

1. **Game totals** — one aggregate SQL over the player's eligible games, grouped by champion, with `FILTER (WHERE "gameCreation" >= <season start>)` columns for the current season: games, wins, pentas, quadras, kills, assists, vision, turrets, dragons + barons. TypeScript sums the champion rows for totals and reads distinct winning champions, most wins on one champion and most season games on one champion from them.
2. **Season win sequence** — the season's `win` booleans ordered by `gameCreation`, for Hot Streak.
3. **Ranks** — `LPHistory` (all, and the season's) and `RankedEntry`.
4. **Mastery** — `ChampionMastery` for the player.
5. Pure evaluators turn these inputs into `{ achievementId, scope, value, tier }`, one per definition; then merge and upsert.
6. **Cron only:** after all accounts, compute rarity per achievement, scope (`all` and current season) and tier: accounts with `tier >= t` divided by accounts with any `all` row. Save it to `AppSettings`.

Backfill: the first recompute for an account also fills every closed season that has no rows yet.

## API

GET and POST `/api/achievements` return one typed payload (Zod schema in `src/lib/validators/achievements.ts`):

```ts
{
	form: { achievementId: string; earnedAt: string }[];
	progress: { achievementId: string; scope: string; value: number; tier: number; reachedAt: string[] }[];
	rarity: { players: number; shares: Record<string, number[]> } | null;
}
```

`useAchievements` and `useDetectAchievements` switch to this shape.

## UI

**Achievements tab**, three sections:

1. **Milestones** — one card per milestone:
   - icon framed in the tier color (Bronze `#cd7f32`, Silver `#aab2bd`, Gold `#f1c40f`, Platinum `#4fd1c5`; locked is grey);
   - name, tier label, progress bar to the next tier ("312 / 500");
   - rarity of the current tier ("Gold · 4% of players");
   - a tooltip with each reached tier's date;
   - at Platinum the bar is full and shows the value.
2. **Season** — a season selector (current plus archived seasons that have rows), then the seasonal cards with progress; earned ones in color, others greyed.
3. **Current form** — the existing grid, minus Pentakill and the rank achievements; the "temporary view" note is removed.

**Overview** — the achievement preview shows the three best milestones first (highest tier, then rarest) as tier-colored chips, then the earned Current form chips, within the existing preview budget.

**Icons** — one SVG per new achievement (14 milestones + 8 seasonal) in `/public/achi`, same style as the existing ones (24×24 viewBox, tinted circle background, single stroke color). The tier is shown by the frame, not by the SVG. SVGs of removed Current form achievements (`pentakill`, `diamond-plus`, `master-plus`, `challenger`) are deleted.

## File layout

```
src/lib/achievements/
  eligibility.ts            (exists)
  seasons.ts                season list, seasonFor(date), currentSeason()
  tiers.ts                  tier names and colors, tierFor(value, thresholds)
  milestones/definitions.ts
  milestones/evaluate.ts    inputs → milestone results
  seasonal/definitions.ts
  seasonal/evaluate.ts      inputs → seasonal results
  progress/query.ts         the aggregate SQL and the other reads
  progress/merge.ts         merge rule
  progress/save.ts          load, merge, upsert for one account
  progress/rarity.ts        rarity computation and AppSettings read/write
  profile/                  (exists: Current form)
  badges/                   (exists: match badges)
src/components/summoner/achievements/
  achievements-tab.tsx, milestone-section.tsx, milestone-card.tsx,
  season-section.tsx, seasonal-card.tsx, form-section.tsx, tier-frame.tsx
```

## Testing

Unit tests (Vitest) for every pure piece:

- `tierFor` and its boundaries;
- the merge rule, including no downgrade and keeping existing dates;
- `seasonFor` and the current season;
- each milestone evaluator, each seasonal evaluator (Hot Streak ordering, Promoted per queue, Iron Will below and above 50 games), Peak and Season Peak mapping;
- the rarity math.

The SQL is exercised through the existing route pattern; it is not executed in tests. The API payload is checked against the Zod schema in a test.

## Review focus

- An account with no eligible games still gets Peak Rank and the mastery milestones, and every other row at 0.
- A deranked player keeps Peak Rank and Season Peak.
- The first recompute after this ships backfills closed seasons once; later recomputes never rewrite them.
- The tier never drops when stored matches are pruned or the mastery list is partial.
- Rarity before the first cron run is `null`, and the UI hides it.
