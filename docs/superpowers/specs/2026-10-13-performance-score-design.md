# Performance Score (phase 1 of 3) — Design Spec

## Goal

Give every ranked game a 0–100 performance score for each player, with a letter grade and a breakdown into six categories plus a "vs opponent" view. A score of 50 means average for that role. Players should see more than raw stats: they get a judgement such as "this game was 78 (A), laning B, vision D".

This is phase 1 of three, built in order, each with its own spec:

1. **Performance score** (this spec): the scoring engine plus the match row and the match detail display.
2. **Last 30 games panel**: a profile summary built on this engine.
3. **Lobby ranks**: MMR estimate and a per-game "performance rank" (e.g. Diamond I).

## Decisions (from brainstorming, 2026-10-13)

| Topic | Decision |
|---|---|
| Reference point | Role baselines from stored ranked games, plus diffs against the lane opponent |
| Queues | Ranked only: 420, 440, 710; remakes (< 300 s) excluded, same as achievements |
| Approach | Pure scoring functions; scores are **not** stored, they are computed where match data already is |
| Baseline storage | Its own table, distribution data as JSON, one row per computation |
| Display (phase 1) | Match row score circle; a new "Performance" tab on the match detail page |
| Code location | Logic in `src/lib/performance/` |

## Non-goals

- The profile panel with category averages and the Last 30 summary belong to phase 2.
- MMR, lobby ranks and the performance rank belong to phase 3.
- No timeline-based laning (gold/XP at 10–14 min) and no Riot `challenges` data, which is stripped on store. Laning uses end-of-game diffs against the lane opponent.
- No win bonus: the score measures play, not the result.
- Normal games, ARAM and Arena get no score.
- No keyboard navigation work.

## Data

`participantSchema` (`src/lib/validators/match.ts`) gains three **optional** fields, so the match projection starts sending them. They are optional because older stored rows may lack them.

- `champExperience`
- `damageDealtToObjectives`
- `objectivesStolen`

The fields already present cover everything else: kills, deaths, assists, CS, gold, damage to champions, damage taken, vision score, wards placed and killed, control wards bought (`visionWardsBoughtInGame`), turret and inhibitor kills, dragon and baron kills, `teamPosition` and `teamId`.

**Lane opponent:** the player on the other team with the same non-empty `teamPosition`. When there is none (empty position, or two players in one role), the Laning category is left out and the other weights are renormalised.

## Metrics

`m` is the game length in minutes (`gameDuration / 60`). "Team" means the player's own team.

| Category | Metric id | Value | Better when |
|---|---|---|---|
| Laning | `goldDiffPerMin` | (gold − opponent gold) / m | higher |
| Laning | `xpDiffPerMin` | (champExperience − opponent's) / m | higher |
| Laning | `csDiffPerMin` | (CS − opponent CS) / m | higher |
| Laning | `damageDiffPerMin` | (damage to champions − opponent's) / m | higher |
| Farming | `csPerMin` | (totalMinionsKilled + neutralMinionsKilled) / m | higher |
| Farming | `goldPerMin` | goldEarned / m | higher |
| Combat | `kda` | (kills + assists) / max(deaths, 1) | higher |
| Combat | `deathsPerMin` | deaths / m | **lower** |
| Combat | `killParticipation` | (kills + assists) / team kills (0 when the team has no kills) | higher |
| Teamfight | `damageShare` | damage to champions / team's damage to champions | higher |
| Teamfight | `damageTakenShare` | totalDamageTaken / team's totalDamageTaken | higher |
| Teamfight | `killParticipation` | same as above | higher |
| Objectives | `objectiveDamagePerMin` | damageDealtToObjectives / m | higher |
| Objectives | `epicKills` | dragonKills + baronKills | higher |
| Objectives | `structureKills` | turretKills + inhibitorKills | higher |
| Objectives | `steals` | objectivesStolen | higher |
| Vision | `visionPerMin` | visionScore / m | higher |
| Vision | `wardsPlacedPerMin` | wardsPlaced / m | higher |
| Vision | `wardsKilledPerMin` | wardsKilled / m | higher |
| Vision | `controlWards` | visionWardsBoughtInGame | higher |

A missing optional field (older rows) leaves that metric out of its category.

## Baselines

```prisma
model PerformanceBaseline {
  id         String   @id @default(cuid())
  computedAt DateTime @default(now())
  sampleSize Int
  data       Json
  @@index([computedAt])
}
```

`data` holds 21 quantiles per role and metric, from 0% to 100% in 5% steps:

```ts
{ roles: Record<"TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY", { games: number; metrics: Record<MetricId, number[]> }> }
```

- **Computation:** a new cron route, `GET /api/cron/performance-baselines`, authorised like the other crons with `CRON_SECRET`.
  - It runs one SQL query over every participant of eligible games from the last **60 days**. A CTE builds the per-participant metrics, joining each participant to its lane opponent.
  - It then groups by `teamPosition` with `percentile_cont(ARRAY[0, 0.05, …, 1]) WITHIN GROUP (ORDER BY metric)`.
  - It inserts one row and deletes all but the newest 30.
- **Schedule:** daily. The user adds the Kubernetes CronJob, like the existing ones. The endpoint can also be triggered by hand.
- **Usage:** the newest row is always used. With no rows, no score is shown anywhere.
- **Migration:** `prisma/migrations/20261013120000_add_performance_baseline`. The user applies it.

## Scoring

All pure and unit-tested, in `src/lib/performance/`.

1. **Percentile** (`percentile.ts`): the value's position in the 21 quantiles by linear interpolation, 0–100. A value inside a flat run of equal quantiles gets the middle of that run, so zero-inflated metrics such as `steals` do not punish the common case. Below the minimum gives 0, above the maximum gives 100. For "lower is better" metrics the result is `100 − percentile`.
2. **Category score:** the mean of the category's available metric percentiles; null when none is available.
3. **Overall score:** the weighted mean of the available categories, weights renormalised over those present, rounded to a whole number.

**Weights per role** (percent):

| Role | Laning | Farming | Combat | Teamfight | Objectives | Vision |
|---|---|---|---|---|---|---|
| TOP | 25 | 15 | 20 | 20 | 15 | 5 |
| JUNGLE | 10 | 15 | 20 | 20 | 25 | 10 |
| MIDDLE | 25 | 15 | 25 | 20 | 10 | 5 |
| BOTTOM | 20 | 25 | 20 | 20 | 10 | 5 |
| UTILITY | 15 | 5 | 15 | 30 | 10 | 25 |

**Grades:** S+ ≥ 90, S ≥ 80, A ≥ 70, B ≥ 55, C ≥ 40, D < 40, applied to both the overall score and the category scores.

**Not scored:** a player without a `teamPosition`, games outside the eligible queues, and remakes. The function returns null for these.

**Result shape:**

```ts
interface PerformanceScore {
	role: Role;
	score: number;
	grade: Grade;
	categories: { id: CategoryId; score: number; grade: Grade; metrics: { id: MetricId; value: number; percentile: number }[] }[];
	opponent: { championName: string; goldDiff: number; xpDiff: number | null; csDiff: number; damageDiff: number } | null;
}
```

The `opponent` diffs are whole-game totals, not per minute, so they read naturally ("+1 240 gold").

## API

`GET /api/performance/baselines` returns the newest row as `{ computedAt, sampleSize, roles }`, or `null` when there is none. It has a Zod schema in `src/lib/validators/performance.ts`. The hook `usePerformanceBaselines()` caches it for one hour. Scoring runs on the client from the match data already loaded.

## UI

**Match row** (profile match list):
- A small score circle (number in the grade color) next to the result block. Tooltip: "Performance 78 · A".
- Shown only for eligible games. A skeleton shows while the baselines load; with no baselines the circle is not shown.

**Match detail page**, new **"Performance"** player tab after Overview, for the selected player:
- **Header:** the big score with its grade and the role name.
- **Six category cards** (three columns on desktop, two on mobile): name, grade and a bar. Clicking a card expands its metric table, one row per metric with label, value and "better than N% of {role} players".
- **vs Opponent block:** the opponent's champion icon, with gold, XP, CS and damage diffs colored by sign.
- **Footnote:** "Compared with {games} {role} players from ranked games in the last 60 days."
- An unscored game (not ranked, or no position) shows an empty state that says why.

**Grade colors:** S+ gold, S purple, A green, B blue, C orange, D red, readable in light and dark mode.

## File layout

```
src/lib/performance/
  roles.ts             Role type, role labels
  metrics.ts           participant + match → metric values (lane opponent, team totals)
  percentile.ts        quantiles → percentile
  weights.ts           category membership and role weights
  grades.ts            score → grade, grade colors
  score.ts             scorePerformance(match, puuid, baselines) → PerformanceScore | null
  baselines.ts         latest baseline read/write, pruning (server)
  baselines-query.ts   the quantile SQL (server)
src/lib/validators/performance.ts
src/app/api/performance/baselines/route.ts
src/app/api/cron/performance-baselines/route.ts
src/hooks/usePerformanceBaselines.ts
src/components/match/player-tabs/performance-tab.tsx
src/components/match/performance/{score-circle,category-card,metric-table,opponent-diff}.tsx
```

The score circle lives with the performance components and is reused by the match row.

## Testing

Unit tests for every pure piece:
- percentile interpolation: flat runs, the extremes, inverted metrics;
- metric extraction: opponent lookup, team totals, zero team kills, missing optional fields;
- category and overall scoring, including renormalised weights when Laning is missing;
- grades and their boundaries;
- `scorePerformance` returning null for ineligible games and players without a position.

The SQL is not run in tests, and the API payload is checked against its Zod schema.

## Review focus

- A game without baselines for the player's role (a new role row with few games): no score, never a crash.
- Older stored matches without `champExperience` / `damageDealtToObjectives` / `objectivesStolen`: the score is still computed from the remaining metrics.
- Both teams with an empty `teamPosition` (rare ranked edge cases): no Laning category and no opponent block.
- Remakes and short games are never scored.
- Very small samples right after deployment: until the first cron run there are no baselines and the UI hides scores.

## Revision (2026-10-13, during implementation)

At the user's request, scores are now cached and every query is kept lean towards both the database and Riot. This section supersedes the earlier "scores are not stored", "API", "File layout" and migration lines.

- **`MatchPerformance` table:**
  - Fields: `matchId` (primary key), `baselineId`, `data` (every participant's `PerformanceScore` keyed by puuid, values rounded), `summary` (`{ score, grade }` per puuid), `createdAt`.
  - A game is cached only when every role in it has at least **100** baseline games. Below that it is scored on the fly and not stored.
- **Endpoints** (they replace `/api/performance/baselines`):
  - `GET /api/performance/summary?matchIds=…&puuid=…`: at most 100 ids, returns `{ score, grade } | null` per match. Cached games are read from the small `summary` column; missing ones are scored and cached.
  - `GET /api/performance/{matchId}`: the full breakdown for the Performance tab.
- **Scoring on the server:**
  - Missing games are loaded with a SQL projection of only the scoring fields, never the full match document.
  - The newest baseline is kept in memory for 10 minutes; "no baseline yet" is kept for only 60 s.
  - New scores are stored with one `createMany`.
  - Scoring makes no Riot calls.
- **Client:**
  - `usePerformanceSummaries` keeps the previous data while the list grows from 20 to 50 games, and `useMatchPerformance` serves the tab.
  - Scored games never go stale. Unscored ones are asked again after 10 minutes.
- **Data fields:** `champExperience`, `damageDealtToObjectives` and `objectivesStolen` live only on `ScoringParticipant`, not on `participantSchema`, so `/api/matches` does not grow.
- **Migrations:**
  - `20261013120000_add_performance_baseline` (`PerformanceBaseline`), already applied.
  - `20261013130000_add_match_performance` (`MatchPerformance`).
- **Changing the formula** later means clearing the cache with `DELETE FROM "MatchPerformance"`, as was done with match badges.
