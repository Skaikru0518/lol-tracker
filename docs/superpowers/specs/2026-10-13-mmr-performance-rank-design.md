# MMR estimate and per-game performance rank — design

Phase 3 of the performance feature. Lobby rank fetching is out of scope: no new Riot API calls.

## Goals

1. **MMR estimate** per ranked queue on the profile's ranked cards ("Est. MMR: Diamond I ↑").
2. **Performance rank** per scored ranked game in the Recent games rows ("Diamond III"), between the LP stat and the items.

Riot does not publish MMR or a formula. Its support article ("MMR, Rank, and LP") states only the direction: bigger gains than losses mean MMR above rank, the reverse means below, equal means MMR ≈ rank; each queue has its own MMR. Riot staff have said personal performance does not affect MMR, so performance scores are **not** an MMR input.

## Shared rank scale

`toAbsoluteLp(tier, rank, lp)` in `src/lib/summoner/profile/lp-change.ts` already maps a rank to one number (Iron IV 0 LP = 0, 100 per division, Diamond I 100 LP = 2800, Master+ = 2800 + LP). Add the inverse next to it:

- `fromAbsoluteLp(points): { tier: string; rank: string }`
  - Below 2800: tier and division from the 400/100 steps, clamped at Iron IV.
  - 2800 and above: one apex step, `{ tier: "MASTER", rank: "" }`, shown as **Master+**. Grandmaster and Challenger are LP cut-offs that change by region and day, so estimates never name them.

## MMR estimate

### Inputs (per queue: RANKED_SOLO_5x5, RANKED_FLEX_SR, RANKED_PREMADE_5x5)

All from the database, no Riot calls:

- LP history snapshots of the player for the queue.
- The player's last 20 eligible ranked games of the queue (`isAchievementEligible`), projected to match id, end time, win, and participant puuids.
- Stored `RankedEntry` rows of those participants for the same queue type (current ranks — the only stored rank data for other players).

### LP signal

- Per-game LP from **single-game snapshot gaps only** (W/L counters agree, exactly one stored game in the gap). New export `exactLpChanges(snapshots, games)` in `src/lib/summoner/profile/lp-estimate.ts`, reusing its gap builder.
- Drop changes of 0 (demotion shield, consolation LP) and with absolute value above 40 (Aegis of Valor double gains).
- W = mean gain of the remaining wins, L = mean absolute loss of the remaining losses. Both must exist.
- Offset in divisions = (W − L) / 5, clamped to ±4. LP estimate = current absolute LP + offset × 100.
- Weight = number of LP-signal games used.

### Lobby signal

- For each of the 20 games with at least 3 participants (other than the player) that have a stored entry for the queue: mean absolute LP of those participants.
- Lobby estimate = mean of those per-game means.
- Weight = total known participants across those games / 3.

### Blend

- Estimate = weighted mean of the available signals.
- No estimate when the LP signal has fewer than 5 games **and** there is no lobby signal; then the card shows nothing.
- Output (`mmrEstimateSchema`, Zod): `{ queueType, tier, rank, absolute, direction: "above" | "below" | "equal", lpGames, winGain, lossLoss, lobbyPlayers }`.
  - `direction` compares the estimate's division (`fromAbsoluteLp`) with the current rank's division: equal division → `"equal"`.
  - `winGain` / `lossLoss` are rounded means, null when the LP signal is absent.

### Delivery

- Logic: `src/lib/summoner/profile/mmr-estimate.ts` (pure: signals and blend) and `src/lib/summoner/profile/mmr.ts` (DB queries, calls the pure part).
- Route: `GET /api/mmr/[puuid]` → `{ estimates: MmrEstimate[] }`, validated with Zod. Three queries: LP history, recent games (SQL projection, GIN `@>` on participants), `RankedEntry` by puuid list.
- Hook: `useMmrEstimates(puuid)` (TanStack Query, `staleTime` 5 min).
- UI: in `ranked-panel.tsx` under the rank line: `Est. MMR: <Tier Division>` (or `Master+`) plus `↑` (win color) / `↓` (loss color) / no arrow. Tooltip: `20 games · +25 / −15 LP · 14 known lobby players`, parts omitted when missing.

## Performance rank

### Base rank

For a game ending at time `end` in queue `q`, from the player's LP snapshots of `q`:

1. the latest snapshot at or before `end`;
2. otherwise the earliest snapshot after `end`;
3. otherwise the current ranked entry for `q`;
4. otherwise none → no performance rank.

### Mapping

- Offset in divisions = round((score − 65) / 8), clamped to ±4.
- Rank = `fromAbsoluteLp(base division start + offset × 100)`, where the base division start drops the LP (the game is judged against the division, not the LP inside it). Master, Grandmaster and Challenger bases all start at 2800 (Master+).
- Examples from Emerald II: 90 → +3 → Diamond III; 65 → Emerald II; 40 → −3 → Platinum I. From Diamond II: 90 → Master+. From Grandmaster: 40 → −3 → Diamond III.

### Delivery

- Logic: `src/lib/performance/performance-rank.ts`: `baseRankAt(snapshots, end, current)` and `performanceRank(base, score)`.
- Computed client-side in `match-list.tsx` alongside `lpChanges`, from the already loaded LP histories, ranked entries and score summaries; passed to `match-row.tsx`.
- UI in `match-row.tsx`, between the LP stat and the items, ranked games only: small `RankEmblem` (size 20) + `Diamond III` / `Master+` (`text-2xs`). Fixed-width empty slot when a ranked game has no performance rank, so rows stay aligned. Hidden below `md`, like the other stats.

## Testing (TDD, Vitest)

- `fromAbsoluteLp`: division boundaries, Iron IV clamp, everything from 2800 up is Master+, round trip with `toAbsoluteLp` below 2800.
- `exactLpChanges`: only single-game gaps, counter-mismatch gaps skipped.
- MMR signals: 0 and >40 changes dropped, ±4 clamp, missing wins or losses, lobby games with fewer than 3 known players skipped, blend weights, "no estimate" threshold, direction.
- Performance rank: base rank fallbacks in order, offset rounding and clamp, GM/Challenger bases treated as Master+, example values above.

## Out of scope

- Fetching ranks of lobby players from Riot.
- Using performance scores as an MMR input.
- Rank-specific scoring baselines.
