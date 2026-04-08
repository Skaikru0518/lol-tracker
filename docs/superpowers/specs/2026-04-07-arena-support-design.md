# Arena Match Support — Design Spec

## Goal

Add full Arena (Cherry mode) match support — collapsed match cards with placement, expanded dropdown with 8-team leaderboard, and a dedicated Arena layout on the match detail page.

## Context

Arena matches differ from standard 5v5:
- **16 participants** (8 teams of 2)
- **Placement 1-8** instead of win/loss
- `queueId: 1700 or 1710`, `gameMode: "CHERRY"`
- Participant has `placement`, `playerSubteamId`, `subteamPlacement` fields
- `teams` array only has 2 entries (100/200), but actual teams are identified by `playerSubteamId`
- Top 4 = win, Bottom 4 = loss (per Riot API `win` field)

## Design

### 1. Arena Detection

A match is Arena when `queueId === 1700 || queueId === 1710` or `gameMode === "CHERRY"`.

Helper function: `isArenaMatch(queueId: number): boolean`

### 2. Collapsed Match Card

Same sectioned layout as standard cards, with these differences:

- **Result block**: Shows placement (`1st`, `2nd`, ..., `8th`) instead of Victory/Defeat
  - 1st: gold `#f1c40f`
  - 2nd: silver `#bdc3c7`  
  - 3rd: bronze `#e67e22`
  - 4th: green `#2ecc71` (top 4 = win)
  - 5th-8th: red `#e74c3c` (bottom 4 = loss)
- **No LP change** (Arena is not ranked)
- **No CS section** (CS not relevant in Arena)
- **Damage stat** stays
- **Queue label**: "Arena"
- **Border color**: green (top 4) or red (bottom 4) based on `win` field
- **Badges**: same match badge system applies

### 3. Expanded Dropdown (Match Card)

When clicked, shows placement leaderboard:

- 8 team pairs, ordered by placement (1st → 8th)
- Each pair shows:
  - Placement number (colored)
  - 2 players: champion icon + name (clickable) + KDA + damage
  - Items per player
- **Top 4 / Bottom 4 separator**: thick border between 4th and 5th
- **Bottom 4 dimmed**: `opacity: 0.6`
- **Current player's team highlighted**: cyan background + ring (like current `player-self`)
- **"View Full Details →"** link at bottom

### 4. Match Detail Page (`/match/[id]`)

Same route, detects Arena and renders different components:

**Header** (`MatchInfo` component):
- Left: "Arena" + date
- Center: "1st Place" (or player's placement) with colored text
- Right: Duration

**Body**: `ArenaLeaderboard` component instead of `TeamTable`:
- Table with columns: #, Team (2 players), KDA, Damage, Items
- 8 rows, one per team pair
- Top 4 / Bottom 4 separator
- Bottom 4 dimmed
- Current player's row highlighted
- Player names clickable (link to summoner page)

**No charts/timeline**: Arena doesn't have meaningful gold diff, kill timeline, or objectives. Just the leaderboard.

### 5. Zod Schema Update

Add optional Arena-specific fields to `participantSchema`:

```typescript
placement: z.number().optional(),
playerSubteamId: z.number().optional(),
subteamPlacement: z.number().optional(),
```

### 6. Queue Names Update

Already has `1700: "Arena"` and `1710: "Arena"`. No change needed.

### 7. Match Badges

Arena matches use the same badge detection. The `gameDuration >= 300` check still applies. Some badges may not make sense (CS King) but they naturally won't trigger since Arena has low CS.

### 8. Stats Filtering

Arena matches are already excluded from the StatsCard calculation (`queueId 1700/1710` filtered out in `match-stats.ts`).

## Files to Create/Modify

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `src/lib/validators/match.ts` | Add optional Arena fields to participant schema |
| Create | `src/components/summoner/arena-match-card.tsx` | Arena-specific collapsed card (or handle in existing match-card.tsx) |
| Create | `src/components/match/arena-leaderboard.tsx` | Arena leaderboard for match detail page |
| Modify | `src/components/summoner/match-card.tsx` | Detect Arena, render placement instead of Victory/Defeat, Arena expand |
| Modify | `src/app/match/[id]/page.tsx` | Detect Arena, render ArenaLeaderboard instead of TeamTable |
| Modify | `src/components/match/match-info.tsx` | Arena header (placement instead of avg rank) |

## Scope

This is a single implementation cycle. No new API routes needed — Arena data comes from the same Match-v5 API. The main work is UI components.
