# Arena Match Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full Arena (Cherry mode) match support with placement-based cards, expanded leaderboard dropdown, and dedicated Arena layout on the match detail page.

**Architecture:** Detect Arena via `queueId` (1700/1710), branch UI rendering in existing components. New `ArenaLeaderboard` component for match detail. Arena-specific fields added to Zod schema. Helper utilities for placement formatting and team grouping.

**Tech Stack:** Next.js, React, Tailwind CSS, Zod, Framer Motion, Radix UI

---

### Task 1: Zod Schema + Arena Helpers

**Files:**
- Modify: `src/lib/validators/match.ts`
- Create: `src/lib/arena-helpers.ts`

- [ ] **Step 1: Add optional Arena fields to participant schema**

In `src/lib/validators/match.ts`, add these 3 fields after `teamId: z.number()` (line 83):

```typescript
teamId: z.number(),
// Arena
placement: z.number().optional(),
playerSubteamId: z.number().optional(),
subteamPlacement: z.number().optional(),
```

- [ ] **Step 2: Create arena helpers**

Create `src/lib/arena-helpers.ts`:

```typescript
import { type Participant } from "@/lib/validators/match";

export function isArenaMatch(queueId: number): boolean {
	return queueId === 1700 || queueId === 1710;
}

export interface ArenaTeam {
	placement: number;
	players: Participant[];
}

export function getArenaTeams(participants: Participant[]): ArenaTeam[] {
	const teamMap = new Map<number, Participant[]>();

	for (const p of participants) {
		const teamId = p.playerSubteamId ?? p.teamId;
		const existing = teamMap.get(teamId) ?? [];
		existing.push(p);
		teamMap.set(teamId, existing);
	}

	const teams: ArenaTeam[] = [];
	for (const [, players] of teamMap) {
		const placement = players[0]?.subteamPlacement ?? players[0]?.placement ?? 8;
		teams.push({ placement, players });
	}

	return teams.sort((a, b) => a.placement - b.placement);
}

export function getPlacementColor(placement: number): string {
	switch (placement) {
		case 1: return "#f1c40f";
		case 2: return "#bdc3c7";
		case 3: return "#e67e22";
		case 4: return "#2ecc71";
		default: return "#e74c3c";
	}
}

export function getPlacementSuffix(placement: number): string {
	switch (placement) {
		case 1: return "st";
		case 2: return "nd";
		case 3: return "rd";
		default: return "th";
	}
}

export function isArenaWin(placement: number): boolean {
	return placement <= 4;
}
```

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/validators/match.ts src/lib/arena-helpers.ts
git commit -m "feat: add Arena schema fields and helper utilities"
```

---

### Task 2: Match Card — Arena Collapsed

**Files:**
- Modify: `src/components/summoner/match-card.tsx`

- [ ] **Step 1: Import arena helpers**

Add import at the top of `match-card.tsx`:

```typescript
import { isArenaMatch, getPlacementColor, getPlacementSuffix, isArenaWin } from "@/lib/arena-helpers";
```

- [ ] **Step 2: Add Arena detection in the component**

After `const ranked = isRankedQueue(queueId);` add:

```typescript
const arena = isArenaMatch(queueId);
const placement = player.placement ?? (player.win ? 1 : 5);
```

- [ ] **Step 3: Modify desktop Result block for Arena**

Replace the Result block (the `<div className="text-center min-w-[62px] px-1">` section) to handle Arena:

```tsx
{/* Result block */}
<div className="text-center min-w-[62px] px-1">
	{arena ? (
		<>
			<p className="text-lg font-extrabold" style={{ color: getPlacementColor(placement) }}>
				{placement}<span className="text-xs align-super">{getPlacementSuffix(placement)}</span>
			</p>
			<p className="text-sm text-muted-foreground">{formatDuration(gameDuration)}</p>
		</>
	) : (
		<>
			<p className={`text-sm font-bold ${player.win ? "text-win" : "text-loss"}`}>
				{player.win ? "Victory" : "Defeat"}
			</p>
			<p className="text-sm text-muted-foreground">{formatDuration(gameDuration)}</p>
			{ranked && (
				<p className={`text-sm font-bold ${lpChange != null ? (lpChange >= 0 ? "text-win" : "text-loss") : "text-muted-foreground"}`}>
					{lpChange != null ? `${lpChange >= 0 ? "+" : ""}${lpChange}` : "—"}
				</p>
			)}
		</>
	)}
</div>
```

- [ ] **Step 4: Hide CS section for Arena**

Wrap the CS/damage section to conditionally hide CS for Arena. Replace the CS+damage block:

```tsx
<div className="flex gap-3 px-2.5">
	{!arena && (
		<div className="text-center">
			<p className="text-sm font-medium">{player.totalMinionsKilled + player.neutralMinionsKilled}</p>
			<p className="text-xs text-muted-foreground">{((player.totalMinionsKilled + player.neutralMinionsKilled) / (gameDuration / 60)).toFixed(1)}/m</p>
		</div>
	)}
	<div className="text-center">
		<p className="text-sm font-medium">{formatGold(player.totalDamageDealtToChampions)}</p>
		<p className="text-xs text-muted-foreground">dmg</p>
	</div>
</div>
```

- [ ] **Step 5: Update border color for Arena**

Change the card border to use placement for Arena:

```tsx
className={`rounded-xl border overflow-hidden transition-colors ${
	arena
		? isArenaWin(placement) ? "border-win/25 bg-win/10" : "border-loss/25 bg-loss/10"
		: player.win ? "border-win/25 bg-win/10" : "border-loss/25 bg-loss/10"
}`}
```

This simplifies to the same logic since `player.win` matches `isArenaWin(placement)`, but keeping it explicit for clarity.

- [ ] **Step 6: Run typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/components/summoner/match-card.tsx
git commit -m "feat: Arena collapsed match card with placement display"
```

---

### Task 3: Match Card — Arena Expanded Dropdown

**Files:**
- Modify: `src/components/summoner/match-card.tsx`

- [ ] **Step 1: Import getArenaTeams**

Add to existing arena imports:

```typescript
import { isArenaMatch, getArenaTeams, getPlacementColor, getPlacementSuffix, isArenaWin } from "@/lib/arena-helpers";
```

- [ ] **Step 2: Add Arena expanded section**

In the `AnimatePresence` section, before the existing expanded content, add an Arena branch. Wrap the existing expanded content in `{!arena && (...)}` and add the Arena version:

```tsx
{/* Expanded scoreboard */}
<AnimatePresence>
	{expanded && (
		<motion.div
			initial={{ height: 0, opacity: 0 }}
			animate={{ height: "auto", opacity: 1 }}
			exit={{ height: 0, opacity: 0 }}
			transition={{ duration: 0.2 }}
			className="overflow-hidden"
		>
			{arena ? (
				<div className="border-t border-white/5 px-3 py-3 space-y-1">
					{getArenaTeams(participants).map((team, i) => {
						const isPlayerTeam = team.players.some((p) => p.puuid === player.puuid);
						const isTopHalf = team.placement <= 4;
						return (
							<div key={team.placement}>
								<div
									className={`flex gap-2 px-2 py-2 rounded-lg ${
										isPlayerTeam ? "bg-primary/10 ring-1 ring-primary/30" : ""
									} ${!isTopHalf ? "opacity-60" : ""}`}
								>
									<div className="min-w-[28px] flex items-center justify-center">
										<span className="text-sm font-bold" style={{ color: getPlacementColor(team.placement) }}>
											{team.placement}<span className="text-[9px] align-super">{getPlacementSuffix(team.placement)}</span>
										</span>
									</div>
									<div className="flex-1 space-y-1">
										{team.players.map((p) => (
											<div key={p.puuid} className="flex items-center gap-2 text-xs">
												{version && (
													<Image
														src={getChampionIcon(version, p.championName)}
														alt={p.championName}
														width={24}
														height={24}
														className="rounded shrink-0"
													/>
												)}
												<Link
													href={`/summoner/${p.riotIdGameName}-${p.riotIdTagline}`}
													onClick={(e) => e.stopPropagation()}
													className={`font-medium hover:text-primary transition-colors truncate min-w-0 ${
														p.puuid === player.puuid ? "text-primary" : ""
													}`}
												>
													{p.riotIdGameName}
												</Link>
												<span className="text-muted-foreground">{getChampionDisplayName(p.championName)}</span>
												<span className="flex-1" />
												{version && (
													<div className="hidden lg:flex gap-0.5">
														{[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map((itemId, idx) => {
															const icon = getItemIcon(version, itemId);
															return icon ? (
																<Image key={idx} src={icon} alt="" width={20} height={20} className="rounded-sm" />
															) : (
																<div key={idx} className="size-5 rounded-sm bg-muted/60 border border-border/30" />
															);
														})}
													</div>
												)}
												<span className="font-mono w-16 text-right">{p.kills}/{p.deaths}/{p.assists}</span>
												<span className="text-muted-foreground w-12 text-right">{formatGold(p.totalDamageDealtToChampions)}</span>
											</div>
										))}
									</div>
								</div>
								{team.placement === 4 && (
									<Separator className="my-2 mx-2 bg-black dark:bg-white/50" />
								)}
							</div>
						);
					})}
					<Link
						href={`/match/${matchId}`}
						onClick={(e) => e.stopPropagation()}
						className="block text-center text-xs text-primary hover:text-primary/80 font-medium py-1 transition-colors"
					>
						View Full Details →
					</Link>
				</div>
			) : (
				<div className="border-t border-white/5 px-3 py-3 space-y-3">
					{/* ... existing 5v5 expanded content stays here unchanged ... */}
				</div>
			)}
		</motion.div>
	)}
</AnimatePresence>
```

Note: The existing 5v5 expanded content (column headers, blue team, separator, red team, view details link) stays as-is inside the `else` branch.

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/summoner/match-card.tsx
git commit -m "feat: Arena expanded dropdown with placement leaderboard"
```

---

### Task 4: Arena Leaderboard Component

**Files:**
- Create: `src/components/match/arena-leaderboard.tsx`

- [ ] **Step 1: Create the ArenaLeaderboard component**

```typescript
"use client";

import { type Participant } from "@/lib/validators/match";
import { getArenaTeams, getPlacementColor, getPlacementSuffix } from "@/lib/arena-helpers";
import { getChampionIcon, getChampionDisplayName, getItemIcon } from "@/lib/icon-helpers";
import { getMatchBadgeById } from "@/lib/match-badges/definitions";
import Image from "next/image";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

interface ArenaLeaderboardProps {
	participants: Participant[];
	version?: string;
	currentPuuid?: string;
	matchBadges?: { puuid: string; badgeId: string }[];
}

function formatGold(gold: number): string {
	return gold >= 1000 ? `${(gold / 1000).toFixed(1)}k` : gold.toString();
}

export default function ArenaLeaderboard({
	participants,
	version,
	currentPuuid,
	matchBadges,
}: ArenaLeaderboardProps) {
	const teams = getArenaTeams(participants);

	return (
		<TooltipProvider delayDuration={200}>
			<div className="rounded-xl border bg-card overflow-hidden">
				{/* Header */}
				<div className="flex items-center gap-4 px-4 py-3 border-b border-border/30 text-xs uppercase tracking-wider text-muted-foreground">
					<span className="w-8">#</span>
					<span className="flex-1">Team</span>
					<span className="w-20 text-center">KDA</span>
					<span className="w-16 text-center hidden md:block">Damage</span>
					<span className="hidden lg:block" style={{ width: "170px" }}>Items</span>
				</div>

				{teams.map((team) => {
					const isPlayerTeam = team.players.some((p) => p.puuid === currentPuuid);
					const isTopHalf = team.placement <= 4;
					const teamBadges = matchBadges?.filter((b) =>
						team.players.some((p) => p.puuid === b.puuid),
					) ?? [];

					return (
						<div key={team.placement}>
							<div
								className={`px-4 py-3 border-b border-border/10 ${
									isPlayerTeam ? "bg-primary/5" : ""
								} ${!isTopHalf ? "opacity-55" : ""}`}
							>
								<div className="flex items-start gap-4">
									<div className="w-8 flex items-center justify-center pt-2">
										<span
											className="text-lg font-extrabold"
											style={{ color: getPlacementColor(team.placement) }}
										>
											{team.placement}
											<span className="text-[10px] align-super">
												{getPlacementSuffix(team.placement)}
											</span>
										</span>
									</div>
									<div className="flex-1 space-y-2">
										{team.players.map((p) => {
											const isSelf = p.puuid === currentPuuid;
											const playerBadges = matchBadges?.filter((b) => b.puuid === p.puuid) ?? [];

											return (
												<div key={p.puuid} className="flex items-center gap-3">
													{version && (
														<Image
															src={getChampionIcon(version, p.championName)}
															alt={getChampionDisplayName(p.championName)}
															width={40}
															height={40}
															className="rounded-xl shrink-0"
														/>
													)}
													<div className="flex-1 min-w-0">
														<Link
															href={`/summoner/${p.riotIdGameName}-${p.riotIdTagline}`}
															className={`text-sm font-semibold hover:text-primary transition-colors ${
																isSelf ? "text-primary" : ""
															}`}
														>
															{p.riotIdGameName}
														</Link>
														<p className="text-xs text-muted-foreground">
															{getChampionDisplayName(p.championName)} · Lvl {p.champLevel}
														</p>
														{playerBadges.length > 0 && (
															<div className="flex gap-1 flex-wrap mt-0.5">
																{playerBadges.map((b) => {
																	const def = getMatchBadgeById(b.badgeId);
																	if (!def) return null;
																	return (
																		<Tooltip key={b.badgeId}>
																			<TooltipTrigger asChild>
																				<span
																					className="rounded-full px-2 py-0.5 text-[10px] font-semibold border cursor-pointer"
																					style={{ color: def.color, borderColor: `${def.color}33`, backgroundColor: `${def.color}10` }}
																				>
																					{def.name}
																				</span>
																			</TooltipTrigger>
																			<TooltipContent><p>{def.description}</p></TooltipContent>
																		</Tooltip>
																	);
																})}
															</div>
														)}
													</div>
													<div className="w-20 text-center">
														<p className="text-sm font-mono font-bold">
															{p.kills}<span className="text-muted-foreground">/</span>
															{p.deaths}<span className="text-muted-foreground">/</span>
															{p.assists}
														</p>
													</div>
													<div className="w-16 text-center hidden md:block">
														<p className="text-sm">{formatGold(p.totalDamageDealtToChampions)}</p>
													</div>
													{version && (
														<div className="hidden lg:flex gap-1">
															{[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map((itemId, idx) => {
																const icon = getItemIcon(version, itemId);
																return icon ? (
																	<Image key={idx} src={icon} alt="" width={24} height={24} className="rounded" />
																) : (
																	<div key={idx} className="size-6 rounded bg-muted/50" />
																);
															})}
														</div>
													)}
												</div>
											);
										})}
									</div>
								</div>
							</div>
							{team.placement === 4 && (
								<Separator className="bg-black dark:bg-white/50" />
							)}
						</div>
					);
				})}
			</div>
		</TooltipProvider>
	);
}
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/match/arena-leaderboard.tsx
git commit -m "feat: add ArenaLeaderboard component for match detail page"
```

---

### Task 5: Match Detail Page — Arena Branch

**Files:**
- Modify: `src/app/match/[id]/page.tsx`
- Modify: `src/components/match/match-info.tsx`

- [ ] **Step 1: Update MatchInfo for Arena**

In `src/components/match/match-info.tsx`, add Arena detection. Import helper and add `placement` prop:

```typescript
import { isArenaMatch, getPlacementColor, getPlacementSuffix } from "@/lib/arena-helpers";
```

Add to interface:

```typescript
interface MatchInfoProps {
	queueId: number;
	gameMode: string;
	gameDuration: number;
	gameCreation: number;
	playerRanks?: Record<string, RankedEntry[]>;
	arenaPlacement?: number;
}
```

Replace the center section (Avg Rank) to handle Arena:

```tsx
{/* Center */}
<div className="flex items-center gap-2">
	{isArenaMatch(queueId) && arenaPlacement ? (
		<div className="text-center">
			<p
				className="text-xl sm:text-2xl font-extrabold"
				style={{ color: getPlacementColor(arenaPlacement) }}
			>
				{arenaPlacement}<span className="text-sm align-super">{getPlacementSuffix(arenaPlacement)}</span> Place
			</p>
			<p className="text-xs text-muted-foreground">Your Placement</p>
		</div>
	) : avgRank ? (
		// ... existing avg rank code stays unchanged
	) : (
		// ... existing unranked placeholder stays unchanged
	)}
</div>
```

- [ ] **Step 2: Update match detail page for Arena**

In `src/app/match/[id]/page.tsx`, import Arena components:

```typescript
import { isArenaMatch } from "@/lib/arena-helpers";
import ArenaLeaderboard from "@/components/match/arena-leaderboard";
```

After `const blueWon = ...`, add Arena detection:

```typescript
const arena = isArenaMatch(match.info.queueId);
const currentPlayer = match.info.participants.find(p => p.puuid === /* need puuid from URL or search */);
```

Note: The match detail page doesn't know which player is "current". We can use a query param or simply not highlight. For now, pass `undefined` as `currentPuuid`.

Replace the Teams section with Arena branch:

```tsx
{/* Teams */}
<div className="mt-6 space-y-6">
	{arena ? (
		<motion.div
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay: 0.1 }}
		>
			<ArenaLeaderboard
				participants={match.info.participants}
				version={version}
				matchBadges={matchBadges}
			/>
		</motion.div>
	) : (
		<>
			{/* existing blue team + red team TeamTable code */}
		</>
	)}
</div>
```

Hide the Details section (charts) for Arena:

```tsx
{!arena && (
	<motion.div ...>
		{/* existing details/charts section */}
	</motion.div>
)}
```

Pass `arenaPlacement` to MatchInfo:

```tsx
<MatchInfo
	queueId={match.info.queueId}
	gameMode={match.info.gameMode}
	gameDuration={match.info.gameDuration}
	gameCreation={match.info.gameCreation}
	playerRanks={playerRanks}
	arenaPlacement={arena ? match.info.participants[0]?.placement : undefined}
/>
```

Note: `participants[0]?.placement` won't be the current user since we don't track who's viewing. This is fine for now — the placement shown can be the first player's. Later when we have user context, we can improve this.

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/match/match-info.tsx src/app/match/[id]/page.tsx
git commit -m "feat: Arena match detail page with leaderboard layout"
```

---

### Task 6: Mobile Layout for Arena Card

**Files:**
- Modify: `src/components/summoner/match-card.tsx`

- [ ] **Step 1: Update mobile layout for Arena**

In the mobile layout section (`<div className="flex lg:hidden ..."`), update to handle Arena placement:

Replace the win/loss bar and queue info for Arena:

```tsx
{/* Mobile layout */}
<div className="flex lg:hidden flex-col gap-2 p-3">
	<div className="flex items-center gap-3">
		{arena ? (
			<div className="min-w-[28px] text-center">
				<span className="text-base font-extrabold" style={{ color: getPlacementColor(placement) }}>
					{placement}<span className="text-[9px] align-super">{getPlacementSuffix(placement)}</span>
				</span>
			</div>
		) : (
			<div className={`w-1 self-stretch rounded-full shrink-0 ${player.win ? "bg-win" : "bg-loss"}`} />
		)}
		{/* rest of mobile layout stays the same */}
	</div>
	{/* items + badges rows stay the same */}
</div>
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/summoner/match-card.tsx
git commit -m "feat: Arena mobile match card layout with placement"
```

---

### Task 7: Changelog + Final Typecheck

**Files:**
- Modify: `src/components/changelog/changes/2026-04-07/metadata.ts`

- [ ] **Step 1: Add Arena entry to changelog**

Add to the changes array in `2026-04-07/metadata.ts`:

```typescript
{
	category: "feature",
	title: "Arena Match Support",
	description:
		"Full Arena (2v2v2v2v2v2v2v2) match support. Match cards show placement (1st-8th) with color coding — gold, silver, bronze for top 3, green for 4th, red for 5th-8th. Expanded dropdown shows all 8 teams in a placement leaderboard. Match detail page renders a dedicated Arena leaderboard instead of the standard team tables.",
},
```

- [ ] **Step 2: Final typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/changelog/
git commit -m "docs: add Arena support to changelog"
```
