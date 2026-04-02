# Achievement System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an internal achievement/badge system that automatically awards players badges based on their match performance, displayed as a badge row on the summoner profile page.

**Architecture:** Achievements are defined in a static registry (code, not DB). A `PlayerAchievement` Prisma table stores which players have earned which achievements. Detection runs on-demand when a profile loads (checking match data already in memory). The UI renders a horizontal badge strip between the profile header and the 3-column content grid.

**Tech Stack:** Prisma (PostgreSQL), React Query, Framer Motion, shadcn Tooltip

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/lib/achievements/definitions.ts` | Static achievement registry — all badge definitions with IDs, names, icons, descriptions, and detector functions |
| Create | `src/lib/achievements/detect.ts` | Detection engine — takes matches + ranked + mastery data and returns which achievement IDs are earned |
| Create | `prisma/migrations/...` | New `PlayerAchievement` table |
| Modify | `prisma/schema.prisma` | Add `PlayerAchievement` model |
| Create | `src/app/api/achievements/route.ts` | API route — GET returns player achievements, POST triggers detection and upserts results |
| Create | `src/hooks/useAchievements.ts` | React Query hook for fetching + triggering achievement detection |
| Create | `src/components/summoner/achievement-bar.tsx` | Badge strip UI component |
| Modify | `src/app/summoner/[name]/page.tsx` | Insert `AchievementBar` between profile header and content grid |

---

### Task 1: Prisma Schema — PlayerAchievement Table

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add PlayerAchievement model to schema**

Add this to the end of `prisma/schema.prisma`:

```prisma
model PlayerAchievement {
  id            String   @id @default(cuid())
  puuid         String
  achievementId String
  earnedAt      DateTime @default(now())

  account Account @relation(fields: [puuid], references: [puuid])

  @@unique([puuid, achievementId])
  @@index([puuid])
}
```

Also add to the `Account` model's relations:

```prisma
achievements PlayerAchievement[]
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-player-achievements
```

Expected: Migration creates `PlayerAchievement` table with unique constraint on `[puuid, achievementId]`.

- [ ] **Step 3: Verify Prisma client generation**

```bash
npx prisma generate
```

Expected: No errors, `prisma.playerAchievement` is available.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add PlayerAchievement table for badge system"
```

---

### Task 2: Achievement Definitions Registry

**Files:**
- Create: `src/lib/achievements/definitions.ts`

- [ ] **Step 1: Create the achievement definitions file**

```typescript
import { type Participant } from "@/lib/validators/match";
import { type Match } from "@/lib/validators/match";
import { type RankedEntry } from "@/lib/validators/ranked";

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji for now, can swap to image URLs later
  category: "combat" | "mastery" | "rank" | "playstyle";
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Combat
  {
    id: "pentakill",
    name: "Pentakill",
    description: "Got a pentakill in a match",
    icon: "5",
    category: "combat",
  },
  {
    id: "perfect-kda",
    name: "Untouchable",
    description: "Finished a match with 0 deaths",
    icon: "0",
    category: "combat",
  },
  {
    id: "kda-god",
    name: "KDA God",
    description: "Average KDA of 5+ over last 20 matches",
    icon: "K",
    category: "combat",
  },
  {
    id: "first-blood-hunter",
    name: "First Blood Hunter",
    description: "Got first blood in 5+ matches",
    icon: "1",
    category: "combat",
  },
  // Mastery
  {
    id: "cs-machine",
    name: "CS Machine",
    description: "Averaged 8+ CS/min in a match",
    icon: "M",
    category: "mastery",
  },
  {
    id: "vision-pro",
    name: "Vision Pro",
    description: "Vision score of 40+ in a match",
    icon: "V",
    category: "mastery",
  },
  {
    id: "damage-dealer",
    name: "Damage Dealer",
    description: "Dealt 40k+ damage to champions in a match",
    icon: "D",
    category: "mastery",
  },
  // Playstyle
  {
    id: "one-trick",
    name: "One Trick",
    description: "70%+ of recent matches on one champion",
    icon: "1T",
    category: "playstyle",
  },
  {
    id: "diverse-player",
    name: "Diverse Player",
    description: "Played 10+ different champions in recent matches",
    icon: "10",
    category: "playstyle",
  },
  {
    id: "win-streak",
    name: "On Fire",
    description: "Won 5+ matches in a row",
    icon: "W",
    category: "playstyle",
  },
  // Rank
  {
    id: "diamond-plus",
    name: "Diamond+",
    description: "Reached Diamond rank or above",
    icon: "D+",
    category: "rank",
  },
  {
    id: "master-plus",
    name: "Master+",
    description: "Reached Master rank or above",
    icon: "M+",
    category: "rank",
  },
  {
    id: "challenger",
    name: "Challenger",
    description: "Reached Challenger rank",
    icon: "C",
    category: "rank",
  },
];

export function getAchievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/achievements/
git commit -m "feat: add achievement definitions registry"
```

---

### Task 3: Detection Engine

**Files:**
- Create: `src/lib/achievements/detect.ts`

- [ ] **Step 1: Create the detection engine**

```typescript
import { type Match, type Participant } from "@/lib/validators/match";
import { type RankedEntry } from "@/lib/validators/ranked";

interface DetectionInput {
  matches: Match[];
  puuid: string;
  ranked?: RankedEntry[];
}

/** Returns an array of achievement IDs the player has earned. */
export function detectAchievements(input: DetectionInput): string[] {
  const { matches, puuid, ranked } = input;
  const earned: string[] = [];

  // Extract this player's participants from all matches
  const players: Participant[] = [];
  for (const match of matches) {
    const p = match.info.participants.find((p) => p.puuid === puuid);
    if (p) players.push(p);
  }

  if (players.length === 0) return earned;

  // --- Combat ---

  // Pentakill
  if (players.some((p) => p.pentaKills > 0)) {
    earned.push("pentakill");
  }

  // Perfect KDA (0 deaths)
  if (players.some((p) => p.deaths === 0 && p.kills + p.assists >= 3)) {
    earned.push("perfect-kda");
  }

  // KDA God (avg 5+ over last 20)
  const recent20 = players.slice(0, 20);
  if (recent20.length >= 5) {
    const totalKills = recent20.reduce((s, p) => s + p.kills, 0);
    const totalDeaths = recent20.reduce((s, p) => s + p.deaths, 0);
    const totalAssists = recent20.reduce((s, p) => s + p.assists, 0);
    const avgKDA = totalDeaths === 0 ? totalKills + totalAssists : (totalKills + totalAssists) / totalDeaths;
    if (avgKDA >= 5) earned.push("kda-god");
  }

  // First Blood Hunter (5+ first bloods)
  const firstBloods = players.filter((p) => p.firstBloodKill).length;
  if (firstBloods >= 5) earned.push("first-blood-hunter");

  // --- Mastery ---

  // CS Machine (8+ CS/min in any match)
  for (const p of players) {
    const match = matches.find((m) =>
      m.info.participants.some((pp) => pp.puuid === puuid && pp.championName === p.championName && pp.kills === p.kills),
    );
    if (match) {
      const minutes = match.info.gameDuration / 60;
      const csPerMin = (p.totalMinionsKilled + p.neutralMinionsKilled) / minutes;
      if (csPerMin >= 8 && minutes >= 15) {
        earned.push("cs-machine");
        break;
      }
    }
  }

  // Vision Pro (40+ vision score in a match)
  if (players.some((p) => p.visionScore >= 40)) {
    earned.push("vision-pro");
  }

  // Damage Dealer (40k+ damage in a match)
  if (players.some((p) => p.totalDamageDealtToChampions >= 40000)) {
    earned.push("damage-dealer");
  }

  // --- Playstyle ---

  // One Trick (70%+ on one champ)
  const champCounts = new Map<string, number>();
  for (const p of players) {
    champCounts.set(p.championName, (champCounts.get(p.championName) || 0) + 1);
  }
  const maxChampGames = Math.max(...champCounts.values());
  if (players.length >= 10 && maxChampGames / players.length >= 0.7) {
    earned.push("one-trick");
  }

  // Diverse Player (10+ different champs)
  if (champCounts.size >= 10) {
    earned.push("diverse-player");
  }

  // Win Streak (5+ consecutive wins)
  let streak = 0;
  let maxStreak = 0;
  for (const p of players) {
    if (p.win) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 0;
    }
  }
  if (maxStreak >= 5) earned.push("win-streak");

  // --- Rank ---
  if (ranked) {
    const tiers = ranked.map((e) => e.tier);
    const APEX = ["MASTER", "GRANDMASTER", "CHALLENGER"];
    const DIAMOND_PLUS = ["DIAMOND", ...APEX];

    if (tiers.some((t) => t === "CHALLENGER")) earned.push("challenger");
    else if (tiers.some((t) => APEX.includes(t))) earned.push("master-plus");
    else if (tiers.some((t) => DIAMOND_PLUS.includes(t))) earned.push("diamond-plus");
  }

  return earned;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/achievements/detect.ts
git commit -m "feat: add achievement detection engine"
```

---

### Task 4: API Route

**Files:**
- Create: `src/app/api/achievements/route.ts`

- [ ] **Step 1: Create the achievements API route**

This route does two things:
- **GET** `?puuid=xxx` — returns saved achievements from DB
- **POST** `{ puuid, matches, ranked }` — runs detection and upserts results, returns earned IDs

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectAchievements } from "@/lib/achievements/detect";

export async function GET(req: NextRequest) {
  const puuid = req.nextUrl.searchParams.get("puuid");
  if (!puuid)
    return NextResponse.json({ error: "puuid required" }, { status: 400 });

  const achievements = await prisma.playerAchievement.findMany({
    where: { puuid },
    select: { achievementId: true, earnedAt: true },
  });

  return NextResponse.json(achievements);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { puuid, matches, ranked } = body;

  if (!puuid || !matches)
    return NextResponse.json({ error: "puuid and matches required" }, { status: 400 });

  const earnedIds = detectAchievements({ matches, puuid, ranked });

  // Upsert each earned achievement (ignore duplicates)
  for (const achievementId of earnedIds) {
    await prisma.playerAchievement.upsert({
      where: { puuid_achievementId: { puuid, achievementId } },
      update: {}, // already earned, no change
      create: { puuid, achievementId },
    });
  }

  // Return all achievements for this player (including previously earned)
  const all = await prisma.playerAchievement.findMany({
    where: { puuid },
    select: { achievementId: true, earnedAt: true },
  });

  return NextResponse.json(all);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/achievements/
git commit -m "feat: add achievements API route (GET + POST)"
```

---

### Task 5: React Query Hook

**Files:**
- Create: `src/hooks/useAchievements.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Match } from "@/lib/validators/match";
import { type RankedEntry } from "@/lib/validators/ranked";

interface SavedAchievement {
  achievementId: string;
  earnedAt: string;
}

async function fetchAchievements(puuid: string): Promise<SavedAchievement[]> {
  const res = await fetch(`/api/achievements?puuid=${puuid}`);
  if (!res.ok) throw new Error("Failed to fetch achievements");
  return res.json();
}

async function detectAndSave(puuid: string, matches: Match[], ranked?: RankedEntry[]): Promise<SavedAchievement[]> {
  const res = await fetch("/api/achievements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ puuid, matches, ranked }),
  });
  if (!res.ok) throw new Error("Failed to detect achievements");
  return res.json();
}

export function useAchievements(puuid: string | undefined) {
  return useQuery<SavedAchievement[]>({
    queryKey: ["achievements", puuid],
    queryFn: () => fetchAchievements(puuid!),
    staleTime: 1000 * 60 * 5,
    enabled: !!puuid,
  });
}

export function useDetectAchievements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ puuid, matches, ranked }: { puuid: string; matches: Match[]; ranked?: RankedEntry[] }) =>
      detectAndSave(puuid, matches, ranked),
    onSuccess: (data, { puuid }) => {
      queryClient.setQueryData(["achievements", puuid], data);
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAchievements.ts
git commit -m "feat: add useAchievements hook with detection mutation"
```

---

### Task 6: Achievement Bar UI Component

**Files:**
- Create: `src/components/summoner/achievement-bar.tsx`

- [ ] **Step 1: Create the achievement bar component**

```typescript
"use client";

import { useEffect } from "react";
import { useAchievements, useDetectAchievements } from "@/hooks/useAchievements";
import { ACHIEVEMENTS, getAchievementById } from "@/lib/achievements/definitions";
import { type Match } from "@/lib/validators/match";
import { type RankedEntry } from "@/lib/validators/ranked";
import { motion } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AchievementBarProps {
  puuid: string;
  matches?: Match[];
  ranked?: RankedEntry[];
}

export default function AchievementBar({ puuid, matches, ranked }: AchievementBarProps) {
  const { data: savedAchievements } = useAchievements(puuid);
  const detect = useDetectAchievements();

  // Trigger detection when matches load
  useEffect(() => {
    if (matches && matches.length > 0 && puuid) {
      detect.mutate({ puuid, matches, ranked });
    }
  }, [puuid, matches?.length]);

  const earnedIds = new Set(savedAchievements?.map((a) => a.achievementId) ?? []);

  // Only show earned achievements
  const earned = ACHIEVEMENTS.filter((a) => earnedIds.has(a.id));

  if (earned.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="mb-4"
      >
        <div className="flex flex-wrap gap-2">
          {earned.map((achievement, i) => (
            <Tooltip key={achievement.id}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary cursor-default hover:bg-primary/10 transition-colors"
                >
                  <span className="text-sm">{achievement.icon}</span>
                  <span>{achievement.name}</span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{achievement.description}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/summoner/achievement-bar.tsx
git commit -m "feat: add achievement bar UI component with tooltips"
```

---

### Task 7: Integrate into Summoner Page

**Files:**
- Modify: `src/app/summoner/[name]/page.tsx`

- [ ] **Step 1: Add import**

Add at the top with other imports:

```typescript
import AchievementBar from "@/components/summoner/achievement-bar";
```

- [ ] **Step 2: Insert AchievementBar between profile header and content grid**

After the `</motion.div>` that wraps `ProfileHeader` (around line 102) and before the `{/* Content grid */}` comment, insert:

```tsx
			<AchievementBar
				puuid={account.puuid}
				matches={matches}
				ranked={ranked}
			/>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/summoner/[name]/page.tsx
git commit -m "feat: integrate achievement bar into summoner profile page"
```

---

### Task 8: Changelog Entry

**Files:**
- Create: `src/components/changelog/changes/2026-04-02/metadata.ts` (update existing)
- Modify: `src/components/changelog/registry.ts` (already has 04-02 entry)

- [ ] **Step 1: Add achievement entry to existing 2026-04-02 changelog**

Add this to the `changes` array in the existing `2026-04-02/metadata.ts`:

```typescript
{
  category: "feature",
  title: "Achievement Badges",
  description:
    "Players now earn badges based on their match performance — Pentakill, KDA God, CS Machine, Vision Pro, and more. Badges appear as a strip on the profile page and are automatically detected from match data.",
},
```

- [ ] **Step 2: Commit**

```bash
git add src/components/changelog/
git commit -m "docs: add achievement badges to changelog"
```
