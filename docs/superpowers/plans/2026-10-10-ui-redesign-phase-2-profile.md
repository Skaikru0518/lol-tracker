# UI Redesign — Phase 2: Profile Shell, Overview and Match Rows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the summoner profile with the new design:
- a server-rendered shell with a splash hero, rank pills, refresh, a live banner, tab navigation and per-profile metadata
- the Overview tab in layout B: a left stat column and the match list on the right
- the minimal match row C, which expands into the shared mirrored scoreboard (A)

**Architecture:**
- `app/summoner/[name]/layout.tsx` is a server component. It loads the profile with `getSummonerProfile` (Phase 1), renders the hero and tabs, and hands identity to client tabs through `SummonerProvider`.
- The Overview tab is a client component on the existing React Query hooks plus the Phase 1 `useChampionStats` and `useLPHistory(range)`.
- Every derived number (KDA, KP, LP change, role shares, sparkline points, scoreboard pairing) lives in pure helpers under `src/lib/` with Vitest tests. Components only lay out.

**Tech Stack:** Next.js 16.2.1 App Router (server layout, `generateMetadata`, `notFound`, `loading.tsx`), React 19, Tailwind 4 tokens from Phase 0, shadcn `select` and `tooltip`, framer-motion (row expand only), TanStack Query 5, Vitest 5, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-10-ui-redesign-design.md` — §1 (routes, server shell, hero splash), §2, and §3 "Summoner shell", "Overview tab", "Match row C", "Match row expanded".

## Global Constraints

- Package manager is **pnpm**.
- **Comments:** keep them minimal. Only JSDoc (prefer one line) and single-line inline `//` comments.
- Use plain `<img>` for every external image, never `next/image`. This phase removes `next/image` from every file it touches.
- Use Phase 0 primitives and tokens: `Panel`/`PanelHeader`/`PanelBody`, `Chip`, `EmptyState`, `StatRing`, `TabsNav`, `HeroBanner`, `RankEmblem`, `ChampionIcon`, `ItemSlots`, `SpellRuneStack`, plus the colors `text-win`, `text-loss`, `text-gold`, `text-team-blue`, `text-team-red`, `bg-nav`. No hard-coded hex colors except data colors (rank colors, badge colors).
- No aurora, glow or neon. The match result is a win/loss gradient fading out left to right (user decision during Phase 2; replaced the 3px accent bar).
- Badge chips keep the `${color}44` border and `${color}20` fill (the `Chip` component does this). Show at most 2 badges plus `+X` on a collapsed row.
- No emoji. UI copy in English.
- Small files: around 200 lines is the signal to split.
- `params` is a Promise in Next 16; `await` it in server files.
- Use the shadcn component where one exists (`Select`, `Tooltip`, `Button`).
- `src/components/summoner/match-history.tsx` and `match-card.tsx` stay untouched. The `[champion]` page still imports them until Phase 3 rewrites it.
- **Commits:** none per task. One commit at the end of the phase (Task 6), after a pre-commit review of the staged diff.

## Review Focus

1. **Summoner URLs that do not resolve on EUNE:** a non-existent Riot ID (`/summoner/NoSuchPlayerXyz-0000`), a Riot ID that exists only on another platform, a slug without a tag (`/summoner/Skaikru`). The user should get the "Summoner not found" page with a search box and HTTP 404, never the error page or a blank screen. Pinned by the curl checks in Task 1, Step 13.
2. **Uneven or position-less teams** in the scoreboard: ARAM (empty `teamPosition`), a remake with missing players, Arena (16 players). Rows must pair stably, a missing opponent leaves an empty cell instead of crashing, and Arena uses its own leaderboard. Pinned by the `buildScoreboard` tests in Task 3.
3. **Zero denominators on a match row:** 0 team kills (kill participation), 0 deaths (perfect KDA), 0 duration (CS/min). The row must never show `NaN`, `Infinity` or `null`. Pinned by the `killParticipation`, `kdaRatio` and `csPerMinute` tests in Task 4.
4. **Thin LP data:** 0 or 1 snapshots, a flat line, a promotion or demotion inside the window. The sparkline must render a sensible line or nothing, never a broken `NaN` path. The LP change must be `null` when it cannot be known. Pinned by the `sparklinePoints` and `calculateLPChange` tests in Task 2.
5. **375px phone width:** the hero, tabs, left column and match rows fit without horizontal page scroll. The tab bar scrolls inside itself. Pinned by the mobile check in Task 6, Step 3 (`scrollWidth === clientWidth`).

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/test/factories.ts` | create | `makeParticipant`, `makeMatch` for tests |
| `src/lib/format.ts` (+ `.test.ts`) | create | `formatDuration`, `timeAgo`, `formatThousands`, `kdaRatio`, `csPerMinute` |
| `src/lib/summoner/metadata.ts` (+ `.test.ts`) | create | `buildProfileMetadata` |
| `src/lib/summoner/rank-pills.ts` (+ `.test.ts`) | create | `rankPills` |
| `src/lib/summoner/live-elapsed.ts` (+ `.test.ts`) | create | `liveElapsedSeconds` |
| `src/hooks/useNow.ts` | create | ticking clock without effect-setState |
| `src/app/summoner/[name]/layout.tsx` | create | server shell |
| `src/app/summoner/loading.tsx` | create | hero skeleton while the shell loads |
| `src/app/summoner/not-found.tsx` | create | summoner not-found page |
| `src/components/summoner/shell/summoner-provider.tsx` | create | client identity context |
| `src/components/summoner/shell/summoner-hero.tsx` | create | splash hero |
| `src/components/summoner/shell/copy-riot-id.tsx` | create | copy button |
| `src/components/summoner/shell/refresh-button.tsx` | create | refresh + countdown (replaces `refresh-timer.tsx`) |
| `src/components/summoner/shell/summoner-tabs.tsx` | create | tab bar |
| `src/components/summoner/shell/live-banner.tsx` | create | one-line LIVE banner |
| `src/lib/summoner/lp-change.ts` (+ `.test.ts`) | create | `toAbsoluteLp`, `calculateLPChange` (moved from match-history logic) |
| `src/lib/summoner/sparkline.ts` (+ `.test.ts`) | create | `sparklinePoints` |
| `src/lib/summoner/roles.ts` (+ `.test.ts`) | create | `roleShares`, `donutGradient` |
| `src/lib/summoner/teammates.ts` (+ `.test.ts`) | create | `getRecentTeammates` |
| `src/components/summoner/overview/*.tsx` | create | overview tab and left-column panels |
| `src/lib/validators/match.ts` | modify | optional `teams[].objectives` |
| `src/lib/summoner/scoreboard.ts` (+ `.test.ts`) | create | `buildScoreboard` |
| `src/components/shared/scoreboard/*.tsx` | create | mirrored scoreboard |
| `src/lib/summoner/match-row.ts` (+ `.test.ts`) | create | `shortQueueName`, `killParticipation`, `participantItems`, `runeIcons` |
| `src/lib/summoner/match-filter.ts` (+ `.test.ts`) | create | `filterMatches` |
| `src/components/summoner/matches/*.tsx` | create | match list, filters, row, expanded, arena |
| `src/app/summoner/[name]/page.tsx` | rewrite | renders `<OverviewTab />` |
| old summoner components (Task 5) | delete | replaced pieces |

---

### Task 1: Server shell — layout, hero, tabs, refresh, live banner, not-found

**Files:**
- Create: `src/lib/summoner/metadata.ts`, `src/lib/summoner/metadata.test.ts`
- Create: `src/lib/summoner/rank-pills.ts`, `src/lib/summoner/rank-pills.test.ts`
- Create: `src/lib/summoner/live-elapsed.ts`, `src/lib/summoner/live-elapsed.test.ts`
- Create: `src/hooks/useNow.ts`
- Create: `src/components/summoner/shell/summoner-provider.tsx`, `summoner-hero.tsx`, `copy-riot-id.tsx`, `refresh-button.tsx`, `summoner-tabs.tsx`, `live-banner.tsx`
- Create: `src/app/summoner/[name]/layout.tsx`, `src/app/summoner/loading.tsx`, `src/app/summoner/not-found.tsx`
- Modify: `src/app/summoner/[name]/page.tsx` (temporary trim, see Step 12)

**Interfaces:**
- Consumes:
  - Phase 1: `getSummonerProfile(slug): Promise<SummonerProfile | null>`, where `SummonerProfile = { account, summoner, ranked: RankedEntry[], topMasteryChampionId: number | null }`
  - existing: `getDDragonVersion()`, `getChampionMap(version): Promise<Record<number, Champion>>`, `getSummonerIcon(version, iconId)`, `getChampionSplash(name)`, `RANK_COLORS`, `formatRankLabel(tier, rank)` (`lib/rank-calculator.ts`), `toSummonerSlug`, `useLiveGame(puuid)` (returns `{ inGame, gameStartTime?, gameLength?, gameQueueConfigId? }`), `getQueueName(id)`, `SummonerSearch`
  - Phase 0: `HeroBanner`, `Chip`, `TabsNav`, `Panel`, `EmptyState`
- Produces:
  - `buildProfileMetadata(profile: SummonerProfile): { title: string; description: string }`
  - `interface RankPill { queueType: string; label: string; color: string }`
  - `rankPills(entries: RankedEntry[]): RankPill[]`
  - `liveElapsedSeconds(gameStartTime: number | undefined, gameLength: number | undefined, now: number): number`
  - `useNow(intervalMs?: number): number`
  - `interface SummonerContextValue { puuid: string; gameName: string; tagLine: string; basePath: string }`
  - `SummonerProvider({ value, children })`
  - `useSummonerContext(): SummonerContextValue`
  - `SUMMONER_TABS: readonly TabItem[]`

- [ ] **Step 1: Write the failing helper tests**

`src/lib/summoner/metadata.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildProfileMetadata } from "./metadata";

const base = {
	account: { puuid: "p1", gameName: "Skaikru", tagLine: "HEAVN" },
	summoner: { puuid: "p1", profileIconId: 1, summonerLevel: 692, revisionDate: 1 },
	topMasteryChampionId: null,
};

const solo = {
	queueType: "RANKED_SOLO_5x5",
	tier: "EMERALD",
	rank: "I",
	leaguePoints: 8,
	wins: 150,
	losses: 129,
	hotStreak: false,
	veteran: false,
	freshBlood: false,
	inactive: false,
};

describe("buildProfileMetadata", () => {
	it("puts the Riot ID and solo rank in the title", () => {
		const meta = buildProfileMetadata({ ...base, ranked: [solo] });
		expect(meta.title).toBe("Skaikru#HEAVN — Emerald I");
		expect(meta.description).toContain("Emerald I 8 LP");
		expect(meta.description).toContain("150W 129L");
		expect(meta.description).toContain("Level 692");
	});

	it("drops the division for apex tiers", () => {
		const meta = buildProfileMetadata({ ...base, ranked: [{ ...solo, tier: "MASTER", rank: "I", leaguePoints: 212 }] });
		expect(meta.title).toBe("Skaikru#HEAVN — Master");
	});

	it("labels players without a solo entry as unranked", () => {
		const meta = buildProfileMetadata({
			...base,
			ranked: [{ ...solo, queueType: "RANKED_FLEX_SR" }],
		});
		expect(meta.title).toBe("Skaikru#HEAVN — Unranked");
		expect(meta.description).not.toContain("Ranked Solo:");
	});
});
```

`src/lib/summoner/rank-pills.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { rankPills } from "./rank-pills";

const entry = (queueType: string, tier: string, rank: string) => ({
	queueType,
	tier,
	rank,
	leaguePoints: 0,
	wins: 0,
	losses: 0,
	hotStreak: false,
	veteran: false,
	freshBlood: false,
	inactive: false,
});

describe("rankPills", () => {
	it("orders solo before flex and formats the label", () => {
		expect(
			rankPills([entry("RANKED_FLEX_SR", "PLATINUM", "I"), entry("RANKED_SOLO_5x5", "EMERALD", "I")]),
		).toEqual([
			{ queueType: "RANKED_SOLO_5x5", label: "EMERALD I · SOLO", color: "#2ecc71" },
			{ queueType: "RANKED_FLEX_SR", label: "PLATINUM I · FLEX", color: "#4dc8b4" },
		]);
	});

	it("ignores unknown queues such as Arena or TFT", () => {
		expect(rankPills([entry("CHERRY", "GOLD", "II")])).toEqual([]);
	});

	it("falls back to a neutral color for an unknown tier", () => {
		expect(rankPills([entry("RANKED_SOLO_5x5", "WOOD", "I")])[0].color).toBe("#7d829c");
	});
});
```

`src/lib/summoner/live-elapsed.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { liveElapsedSeconds } from "./live-elapsed";

const now = 1_000_000_000_000;

describe("liveElapsedSeconds", () => {
	it("counts from the game start time", () => {
		expect(liveElapsedSeconds(now - 90_500, 10, now)).toBe(90);
	});

	it("falls back to gameLength before the start time is known", () => {
		expect(liveElapsedSeconds(0, 42, now)).toBe(42);
		expect(liveElapsedSeconds(undefined, 42, now)).toBe(42);
	});

	it("never returns a negative value", () => {
		expect(liveElapsedSeconds(now + 5_000, undefined, now)).toBe(0);
		expect(liveElapsedSeconds(0, -30, now)).toBe(0);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `Cannot find module './metadata'`, `'./rank-pills'` and `'./live-elapsed'`.

- [ ] **Step 3: Implement the three helpers**

`src/lib/summoner/metadata.ts`:
```ts
import { formatRankLabel } from "@/lib/rank-calculator";
import { type SummonerProfile } from "@/lib/summoner/get-profile";

/** Page title and description for a summoner profile. */
export function buildProfileMetadata(profile: SummonerProfile): { title: string; description: string } {
	const riotId = `${profile.account.gameName}#${profile.account.tagLine}`;
	const solo = profile.ranked.find((entry) => entry.queueType === "RANKED_SOLO_5x5");
	const rankLabel = solo ? formatRankLabel(solo.tier, solo.rank) : "Unranked";
	const soloLine = solo
		? ` Ranked Solo: ${rankLabel} ${solo.leaguePoints} LP, ${solo.wins}W ${solo.losses}L.`
		: "";

	return {
		title: `${riotId} — ${rankLabel}`,
		description: `${riotId} (EUNE) — Level ${profile.summoner.summonerLevel}.${soloLine} Match history, LP history and champion stats on Summon.gg.`,
	};
}
```

`src/lib/summoner/rank-pills.ts`:
```ts
import { RANK_COLORS } from "@/lib/icon-helpers";
import { formatRankLabel } from "@/lib/rank-calculator";
import { type RankedEntry } from "@/lib/validators/ranked";

/** One rank chip in the profile hero. */
export interface RankPill {
	queueType: string;
	label: string;
	color: string;
}

const QUEUE_SHORT: Record<string, string> = {
	RANKED_SOLO_5x5: "SOLO",
	RANKED_FLEX_SR: "FLEX",
};

const QUEUE_ORDER = ["RANKED_SOLO_5x5", "RANKED_FLEX_SR"];

const FALLBACK_COLOR = "#7d829c";

/** Hero rank chips for solo and flex, solo first; other queues are ignored. */
export function rankPills(entries: RankedEntry[]): RankPill[] {
	return QUEUE_ORDER.flatMap((queueType) => {
		const entry = entries.find((e) => e.queueType === queueType);
		if (!entry) return [];
		return [
			{
				queueType,
				label: `${formatRankLabel(entry.tier, entry.rank).toUpperCase()} · ${QUEUE_SHORT[queueType]}`,
				color: RANK_COLORS[entry.tier] ?? FALLBACK_COLOR,
			},
		];
	});
}
```

`src/lib/summoner/live-elapsed.ts`:
```ts
/** Seconds since a live game started; uses Riot's `gameLength` until the start time is known. */
export function liveElapsedSeconds(
	gameStartTime: number | undefined,
	gameLength: number | undefined,
	now: number,
): number {
	if (gameStartTime && gameStartTime > 0) {
		return Math.max(0, Math.floor((now - gameStartTime) / 1000));
	}
	return Math.max(0, gameLength ?? 0);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS — 9 new tests, previous suites green.

- [ ] **Step 5: Create `src/hooks/useNow.ts`**

```ts
import { useEffect, useState } from "react";

/** Current timestamp, re-rendering every `intervalMs`. */
export function useNow(intervalMs = 1000): number {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), intervalMs);
		return () => clearInterval(id);
	}, [intervalMs]);

	return now;
}
```

- [ ] **Step 6: Create the provider `src/components/summoner/shell/summoner-provider.tsx`**

```tsx
"use client";

import { createContext, useContext } from "react";

/** Identity of the profile being viewed, shared by every tab. */
export interface SummonerContextValue {
	puuid: string;
	gameName: string;
	tagLine: string;
	basePath: string;
}

const SummonerContext = createContext<SummonerContextValue | null>(null);

export function SummonerProvider({
	value,
	children,
}: {
	value: SummonerContextValue;
	children: React.ReactNode;
}) {
	return <SummonerContext.Provider value={value}>{children}</SummonerContext.Provider>;
}

/** Profile identity for client tabs; throws outside the summoner layout. */
export function useSummonerContext(): SummonerContextValue {
	const value = useContext(SummonerContext);
	if (!value) throw new Error("useSummonerContext must be used inside SummonerProvider");
	return value;
}
```

- [ ] **Step 7: Create `copy-riot-id.tsx` and `refresh-button.tsx`**

`src/components/summoner/shell/copy-riot-id.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copies `GameName#TAG` to the clipboard. */
export function CopyRiotId({ riotId }: { riotId: string }) {
	const [copied, setCopied] = useState(false);

	async function copy() {
		await navigator.clipboard.writeText(riotId);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}

	return (
		<button
			type="button"
			onClick={copy}
			title="Copy Riot ID"
			className="text-muted-foreground transition-colors hover:text-foreground"
		>
			{copied ? <Check className="size-4 text-win" /> : <Copy className="size-4" />}
		</button>
	);
}
```

`src/components/summoner/shell/refresh-button.tsx`. The force-refresh calls and query keys are the same as the old `refresh-timer.tsx`, plus `router.refresh()` to re-run the server shell:
```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";

const REFRESH_INTERVAL = 300;
const COOLDOWN = 180;
const REFRESHED_KEYS = ["matches", "ranked", "summoner", "mastery", "lp-history", "champion-stats"];

async function forceRefreshData(puuid: string) {
	await fetch(`/api/ranked?puuid=${puuid}&force=true`);
	await fetch(`/api/matches?puuid=${puuid}&count=50`);
}

/** Update button with an auto-refresh countdown; refetches client data and the server shell. */
export function RefreshButton({ puuid }: { puuid: string }) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
	const [cooldown, setCooldown] = useState(0);
	const [refreshing, setRefreshing] = useState(false);

	const refreshAll = useCallback(async () => {
		await forceRefreshData(puuid);
		await queryClient.invalidateQueries({
			predicate: (query) => REFRESHED_KEYS.includes(query.queryKey[0] as string),
		});
		router.refresh();
	}, [puuid, queryClient, router]);

	useEffect(() => {
		const id = setInterval(() => {
			setCountdown((prev) => {
				if (prev > 1) return prev - 1;
				void refreshAll();
				return REFRESH_INTERVAL;
			});
			setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
		}, 1000);
		return () => clearInterval(id);
	}, [refreshAll]);

	async function handleClick() {
		setRefreshing(true);
		await refreshAll();
		toast.success("Data refreshed");
		setRefreshing(false);
		setCountdown(REFRESH_INTERVAL);
		setCooldown(COOLDOWN);
	}

	const minutes = Math.floor(countdown / 60);
	const seconds = countdown % 60;

	return (
		<div className="flex items-center gap-2">
			<span className="font-mono text-xs tabular-nums text-muted-foreground">
				{minutes}:{seconds.toString().padStart(2, "0")}
			</span>
			<Button
				size="sm"
				variant="outline"
				onClick={handleClick}
				disabled={refreshing || cooldown > 0}
				title={cooldown > 0 ? "Chill down..." : "Refresh data"}
			>
				<RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
				Update
			</Button>
		</div>
	);
}
```

- [ ] **Step 8: Create `summoner-hero.tsx` and `summoner-tabs.tsx`**

`src/components/summoner/shell/summoner-hero.tsx` (a server component; its client children are `CopyRiotId` and `RefreshButton`):
```tsx
import { HeroBanner } from "@/components/ui/hero-banner";
import { Chip } from "@/components/ui/chip";
import { getChampionSplash, getSummonerIcon } from "@/lib/icon-helpers";
import { rankPills } from "@/lib/summoner/rank-pills";
import { type SummonerProfile } from "@/lib/summoner/get-profile";
import { CopyRiotId } from "./copy-riot-id";
import { RefreshButton } from "./refresh-button";

/** Profile header: splash art, icon with level, Riot ID, rank chips and the update button. */
export function SummonerHero({
	profile,
	version,
	splashChampion,
}: {
	profile: SummonerProfile;
	version: string;
	splashChampion: string | null;
}) {
	const { account, summoner, ranked } = profile;
	const riotId = `${account.gameName}#${account.tagLine}`;

	return (
		<HeroBanner
			splashUrl={splashChampion ? getChampionSplash(splashChampion) : null}
			objectPosition="center 25%"
			className="border-b"
		>
			<div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pb-5 pt-14 sm:flex-row sm:items-end sm:px-6 sm:pt-20">
				<div className="relative shrink-0 self-start">
					<img
						src={getSummonerIcon(version, summoner.profileIconId)}
						alt={account.gameName}
						width={80}
						height={80}
						className="size-20 rounded-xl border-2 border-primary/70"
					/>
					<span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border bg-nav px-2 text-[11px] font-medium text-foreground">
						{summoner.summonerLevel}
					</span>
				</div>

				<div className="min-w-0 flex-1">
					<h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						<span className="truncate">{account.gameName}</span>
						<span className="text-base font-medium text-muted-foreground sm:text-lg">#{account.tagLine}</span>
						<CopyRiotId riotId={riotId} />
					</h1>
					<p className="text-sm text-muted-foreground">EUNE</p>
					<div className="mt-2 flex flex-wrap gap-1.5">
						{rankPills(ranked).map((pill) => (
							<Chip key={pill.queueType} color={pill.color}>
								{pill.label}
							</Chip>
						))}
					</div>
				</div>

				<RefreshButton puuid={account.puuid} />
			</div>
		</HeroBanner>
	);
}
```

`src/components/summoner/shell/summoner-tabs.tsx`:
```tsx
"use client";

import { TabsNav, type TabItem } from "@/components/ui/tabs-nav";

export const SUMMONER_TABS: readonly TabItem[] = [
	{ label: "Overview", segment: null },
	{ label: "Champions", segment: "champions" },
	{ label: "LP History", segment: "lp" },
	{ label: "Achievements", segment: "achievements" },
];

/** Profile tab bar; the active tab follows the route segment. */
export function SummonerTabs({ basePath }: { basePath: string }) {
	return <TabsNav basePath={basePath} tabs={SUMMONER_TABS} />;
}
```

- [ ] **Step 9: Create `live-banner.tsx`**

`src/components/summoner/shell/live-banner.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useLiveGame } from "@/hooks/useLiveGame";
import { useNow } from "@/hooks/useNow";
import { formatDuration } from "@/lib/format";
import { getQueueName } from "@/lib/queue-names";
import { liveElapsedSeconds } from "@/lib/summoner/live-elapsed";

/** One-line banner shown while the player is in a game; links to the live page. */
export function LiveBanner({ puuid, basePath }: { puuid: string; basePath: string }) {
	const { data } = useLiveGame(puuid);
	const now = useNow();

	if (!data?.inGame) return null;

	const champSelect = !data.gameStartTime;
	const elapsed = liveElapsedSeconds(data.gameStartTime, data.gameLength, now);

	return (
		<Link
			href={`${basePath}/live`}
			className="mt-4 flex items-center gap-3 rounded-lg border border-loss/30 bg-card px-4 py-2.5 text-sm transition-colors hover:border-loss/60"
		>
			<span className="relative flex size-2.5">
				<span className="absolute inline-flex size-full animate-ping rounded-full bg-loss opacity-60" />
				<span className="relative inline-flex size-2.5 rounded-full bg-loss" />
			</span>
			<span className="font-bold text-loss">{champSelect ? "CHAMP SELECT" : "LIVE"}</span>
			{!champSelect && <span className="font-mono tabular-nums text-foreground">{formatDuration(elapsed)}</span>}
			{data.gameQueueConfigId !== undefined && (
				<span className="text-muted-foreground">{getQueueName(data.gameQueueConfigId)}</span>
			)}
			<span className="ml-auto font-medium text-primary">Watch live &rarr;</span>
		</Link>
	);
}
```

This task uses `formatDuration` from `src/lib/format.ts`, which Task 4 owns. Create the file now with only `formatDuration`, and pin it with a test now. Task 4 extends the file.

`src/lib/format.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { formatDuration } from "./format";

describe("formatDuration", () => {
	it("formats minutes and padded seconds", () => {
		expect(formatDuration(1523)).toBe("25:23");
		expect(formatDuration(65)).toBe("1:05");
	});

	it("clamps negative values to zero", () => {
		expect(formatDuration(-12)).toBe("0:00");
	});
});
```
Run `pnpm test` and expect FAIL (`Cannot find module './format'`). Then create `src/lib/format.ts`:
```ts
/** `m:ss` from seconds; negative input becomes `0:00`. */
export function formatDuration(seconds: number): string {
	const total = Math.max(0, Math.floor(seconds));
	return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}
```
Run `pnpm test` and expect PASS.

- [ ] **Step 10: Create the layout `src/app/summoner/[name]/layout.tsx`**

Before writing, read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` (the `params` Promise and the `Metadata` type).
```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSummonerProfile } from "@/lib/summoner/get-profile";
import { buildProfileMetadata } from "@/lib/summoner/metadata";
import { getChampionMap, getDDragonVersion } from "@/lib/icon-helpers";
import { toSummonerSlug } from "@/lib/riot-id";
import { SummonerProvider } from "@/components/summoner/shell/summoner-provider";
import { SummonerHero } from "@/components/summoner/shell/summoner-hero";
import { SummonerTabs } from "@/components/summoner/shell/summoner-tabs";
import { LiveBanner } from "@/components/summoner/shell/live-banner";

type Params = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
	const profile = await getSummonerProfile((await params).name);
	if (!profile) return { title: "Summoner not found" };

	const { title, description } = buildProfileMetadata(profile);
	const slug = toSummonerSlug(profile.account.gameName, profile.account.tagLine);
	return { title, description, alternates: { canonical: `/summoner/${slug}` } };
}

/** DDragon id of the splash champion, or `null` when it cannot be resolved. */
async function resolveSplashChampion(version: string, championId: number | null): Promise<string | null> {
	if (!championId) return null;
	const champions = await getChampionMap(version).catch(() => null);
	return champions?.[championId]?.id ?? null;
}

export default async function SummonerLayout({ children, params }: Params & { children: React.ReactNode }) {
	const profile = await getSummonerProfile((await params).name);
	if (!profile) notFound();

	const version = await getDDragonVersion();
	const splashChampion = await resolveSplashChampion(version, profile.topMasteryChampionId);
	const { puuid, gameName, tagLine } = profile.account;
	const basePath = `/summoner/${toSummonerSlug(gameName, tagLine)}`;

	return (
		<SummonerProvider value={{ puuid, gameName, tagLine, basePath }}>
			<SummonerHero profile={profile} version={version} splashChampion={splashChampion} />
			<div className="mx-auto max-w-7xl px-4 sm:px-6">
				<LiveBanner puuid={puuid} basePath={basePath} />
				<SummonerTabs basePath={basePath} />
				<div className="py-4 lg:py-6">{children}</div>
			</div>
		</SummonerProvider>
	);
}
```

- [ ] **Step 11: Create `loading.tsx` and `not-found.tsx` under `src/app/summoner/`**

Both live in the parent segment, because `notFound()` thrown from the `[name]` layout is caught by the nearest boundary above that layout.

`src/app/summoner/loading.tsx`:
```tsx
import { Skeleton } from "@/components/ui/skeleton";

/** Shell placeholder while the server loads the profile. */
export default function SummonerLoading() {
	return (
		<div>
			<div className="border-b bg-card/40">
				<div className="mx-auto flex max-w-7xl items-end gap-4 px-4 pb-5 pt-20 sm:px-6">
					<Skeleton className="size-20 rounded-xl" />
					<div className="space-y-2">
						<Skeleton className="h-7 w-48" />
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-5 w-56" />
					</div>
				</div>
			</div>
			<div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
				<Skeleton className="h-10 w-full" />
				<div className="grid gap-4 lg:grid-cols-[330px_1fr]">
					<Skeleton className="h-96" />
					<Skeleton className="h-96" />
				</div>
			</div>
		</div>
	);
}
```

`src/app/summoner/not-found.tsx`:
```tsx
import SummonerSearch from "@/components/search/summoner-search";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";

/** Shown when a Riot ID does not exist or has no EUNE summoner. */
export default function SummonerNotFound() {
	return (
		<div className="mx-auto max-w-lg px-4 py-20">
			<Panel className="p-4">
				<EmptyState
					title="Summoner not found"
					description="Check the Riot ID (GameName#TAG). Summon.gg only tracks EUNE accounts."
				/>
				<SummonerSearch />
			</Panel>
		</div>
	);
}
```

- [ ] **Step 12: Trim the old profile page so it works inside the new shell**

In `src/app/summoner/[name]/page.tsx`, remove the parts the shell now owns:
- the `<BackButton />` element and its import
- the `<LiveGameBanner … />` element and its import
- the whole `<motion.div …>` header block containing `<ProfileHeader … />`, plus the `ProfileHeader` import

Replace `if (accountLoading || !coreLoaded) return <Loader fullScreen />;` with `if (accountLoading || !coreLoaded) return <Loader className="py-20" />;`. Also replace the outer wrapper `className="mx-auto max-w-425 px-4 py-6 sm:px-6 lg:px-12 lg:py-8"` with `className="w-full"`.

Leave everything else (the old three-column grid and `AchievementBar`) as it is. Task 2 replaces it.

- [ ] **Step 13: Verify in the Browser pane and with curl**

With `pnpm dev` running:
```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/summoner/Skaikru-HEAVN"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/summoner/NoSuchPlayerXyz-0000"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/summoner/Skaikru"
curl -s "http://localhost:3000/summoner/NoSuchPlayerXyz-0000" | grep -o "Summoner not found" | head -1
curl -s "http://localhost:3000/summoner/Skaikru-HEAVN" | grep -o "<title>[^<]*</title>"
```
Expected:
- `200`, `404`, `404`.
- The not-found body contains `Summoner not found`.
- The title reads `<title>Skaikru#HEAVN — … | Summon.gg</title>`, with the current solo rank in place of the dots.

Then open `/summoner/Skaikru-HEAVN` in the Browser pane and check:
- the hero shows the top-mastery splash, the icon with its level, the Riot ID, the rank chips and the Update button
- the tab bar sits under the hero, with Overview active
- the old body renders below the tabs without a duplicate header

The other tabs return 404 for now; Phase 3 creates them.

- [ ] **Step 14: Typecheck and lint**

Run: `pnpm run typecheck` → no errors.
Run: `npx eslint src/app/summoner src/components/summoner/shell src/lib/summoner src/lib/format.ts src/hooks/useNow.ts` → 0 errors.

---

### Task 2: Overview tab and the left column

**Files:**
- Create: `src/test/factories.ts`
- Create: `src/lib/summoner/lp-change.ts` (+ `.test.ts`), `src/lib/summoner/sparkline.ts` (+ `.test.ts`), `src/lib/summoner/roles.ts` (+ `.test.ts`), `src/lib/summoner/teammates.ts` (+ `.test.ts`)
- Create: `src/components/summoner/overview/overview-tab.tsx`, `ranked-panel.tsx`, `lp-sparkline.tsx`, `roles-performance-panel.tsx`, `most-played-panel.tsx`, `recently-played-panel.tsx`, `achievement-preview.tsx`
- Rewrite: `src/app/summoner/[name]/page.tsx`

**Interfaces:**
- Consumes:
  - Task 1: `useSummonerContext()`
  - Phase 1: `useChampionStats(puuid, queue)` → `ChampionStat[]`, `useLPHistory(puuid, queueType, range)`, `LPSnapshot`, `QueueFilter`
  - existing: `useMatches(puuid, count, championId?, start?)`, `useRanked(puuid)`, `useDDragonVersion()`, `useAchievements(puuid)`, `useDetectAchievements()`, `ACHIEVEMENTS`, `calculateStats(matches, puuid): SummonerStats`, `formatRankLabel`, `RANK_COLORS`, `getSummonerIcon`, `MatchList` from the old `components/summoner/match-history.tsx` (temporary, until Task 4)
- Produces:
  - `makeParticipant(overrides?: Partial<Participant>): Participant`
  - `makeMatch(overrides?: { queueId?: number; gameDuration?: number; gameCreation?: number; participants?: Participant[]; teams?: Match["info"]["teams"] }): Match`
  - `toAbsoluteLp(tier: string, rank: string, lp: number): number`
  - `calculateLPChange(snapshots: LPSnapshot[] | undefined, matchEndTime: number): number | null`
  - `sparklinePoints(values: number[], width: number, height: number): string`
  - `interface RoleShare { role: string; count: number; share: number }`
  - `roleShares(roles: Record<string, number>): RoleShare[]`
  - `donutGradient(shares: RoleShare[], colors: readonly string[]): string`
  - `interface RecentTeammate { puuid: string; gameName: string; tagLine: string; profileIcon: number; games: number; wins: number }`
  - `getRecentTeammates(matches: Match[], puuid: string, limit?: number): RecentTeammate[]`
  - `OverviewTab()`
  - `useOverviewMatches(puuid)` → `{ matches?: Match[]; isLoading: boolean }`, exported from `overview-tab.tsx` for Task 4

- [ ] **Step 1: Create the test factories `src/test/factories.ts`**

```ts
import { type Match, type Participant } from "@/lib/validators/match";

/** A complete participant with neutral defaults; override only what a test cares about. */
export function makeParticipant(overrides: Partial<Participant> = {}): Participant {
	return {
		puuid: "p1",
		summonerName: "",
		riotIdGameName: "Player",
		riotIdTagline: "EUNE",
		championName: "Nami",
		championId: 267,
		champLevel: 14,
		profileIcon: 1,
		kills: 0,
		deaths: 0,
		assists: 0,
		win: true,
		totalMinionsKilled: 0,
		neutralMinionsKilled: 0,
		item0: 0,
		item1: 0,
		item2: 0,
		item3: 0,
		item4: 0,
		item5: 0,
		item6: 0,
		totalDamageDealtToChampions: 0,
		physicalDamageDealtToChampions: 0,
		magicDamageDealtToChampions: 0,
		trueDamageDealtToChampions: 0,
		totalDamageTaken: 0,
		damageSelfMitigated: 0,
		totalDamageShieldedOnTeammates: 0,
		totalHeal: 0,
		totalHealsOnTeammates: 0,
		visionScore: 0,
		wardsPlaced: 0,
		wardsKilled: 0,
		visionWardsBoughtInGame: 0,
		goldEarned: 0,
		goldSpent: 0,
		doubleKills: 0,
		tripleKills: 0,
		quadraKills: 0,
		pentaKills: 0,
		killingSprees: 0,
		largestKillingSpree: 0,
		largestMultiKill: 0,
		turretKills: 0,
		inhibitorKills: 0,
		dragonKills: 0,
		baronKills: 0,
		firstBloodKill: false,
		firstTowerKill: false,
		totalTimeSpentDead: 0,
		longestTimeSpentLiving: 0,
		timeCCingOthers: 0,
		summoner1Id: 4,
		summoner2Id: 7,
		perks: { statPerks: { defense: 0, flex: 0, offense: 0 }, styles: [] },
		teamPosition: "",
		individualPosition: "",
		teamId: 100,
		...overrides,
	};
}

/** A match with two empty teams unless participants or teams are given. */
export function makeMatch(
	overrides: {
		matchId?: string;
		queueId?: number;
		gameDuration?: number;
		gameCreation?: number;
		participants?: Participant[];
		teams?: Match["info"]["teams"];
	} = {},
): Match {
	return {
		metadata: { matchId: overrides.matchId ?? "EUN1_1" },
		info: {
			gameCreation: overrides.gameCreation ?? 0,
			gameDuration: overrides.gameDuration ?? 1800,
			gameMode: "CLASSIC",
			queueId: overrides.queueId ?? 420,
			participants: overrides.participants ?? [],
			teams: overrides.teams ?? [
				{ teamId: 100, win: true, bans: [] },
				{ teamId: 200, win: false, bans: [] },
			],
		},
	};
}
```

- [ ] **Step 2: Write the failing helper tests**

`src/lib/summoner/lp-change.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { calculateLPChange, toAbsoluteLp } from "./lp-change";

const snap = (createdAt: string, tier: string, rank: string, lp: number) => ({
	id: createdAt,
	tier,
	rank,
	lp,
	wins: null,
	losses: null,
	createdAt,
});

describe("toAbsoluteLp", () => {
	it("counts 400 per tier and 100 per division", () => {
		expect(toAbsoluteLp("GOLD", "IV", 0)).toBe(1200);
		expect(toAbsoluteLp("GOLD", "I", 50)).toBe(1550);
	});

	it("ignores divisions for apex tiers", () => {
		expect(toAbsoluteLp("MASTER", "I", 120)).toBe(2920);
	});

	it("returns 0 for unknown tiers", () => {
		expect(toAbsoluteLp("WOOD", "I", 10)).toBe(0);
	});
});

describe("calculateLPChange", () => {
	const end = Date.parse("2026-10-02T21:00:00Z");

	it("is null with fewer than two snapshots", () => {
		expect(calculateLPChange(undefined, end)).toBeNull();
		expect(calculateLPChange([snap("2026-10-02T20:00:00Z", "EMERALD", "I", 8)], end)).toBeNull();
	});

	it("diffs the snapshots around the match end", () => {
		expect(
			calculateLPChange(
				[snap("2026-10-02T20:00:00Z", "EMERALD", "I", 8), snap("2026-10-02T21:05:00Z", "EMERALD", "I", 29)],
				end,
			),
		).toBe(21);
	});

	it("handles a promotion across divisions", () => {
		expect(
			calculateLPChange(
				[snap("2026-10-02T20:00:00Z", "EMERALD", "II", 90), snap("2026-10-02T21:05:00Z", "EMERALD", "I", 10)],
				end,
			),
		).toBe(20);
	});

	it("is null when no snapshot follows the match", () => {
		expect(
			calculateLPChange(
				[snap("2026-10-02T19:00:00Z", "EMERALD", "I", 8), snap("2026-10-02T20:00:00Z", "EMERALD", "I", 29)],
				end,
			),
		).toBeNull();
	});
});
```

`src/lib/summoner/sparkline.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { sparklinePoints } from "./sparkline";

describe("sparklinePoints", () => {
	it("is empty without values", () => {
		expect(sparklinePoints([], 100, 40)).toBe("");
	});

	it("draws a single value as a flat line across the width", () => {
		expect(sparklinePoints([5], 100, 40)).toBe("0,20 100,20");
	});

	it("centers a flat series vertically", () => {
		expect(sparklinePoints([3, 3, 3], 100, 40)).toBe("0,20 50,20 100,20");
	});

	it("maps min to the bottom and max to the top", () => {
		expect(sparklinePoints([0, 10], 100, 40)).toBe("0,40 100,0");
	});

	it("never emits NaN", () => {
		expect(sparklinePoints([1, Number.NaN, 3], 100, 40)).not.toContain("NaN");
	});
});
```

`src/lib/summoner/roles.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { donutGradient, roleShares } from "./roles";

describe("roleShares", () => {
	it("sorts by count and computes whole-percent shares", () => {
		expect(roleShares({ ADC: 11, Support: 38, Jungle: 1 })).toEqual([
			{ role: "Support", count: 38, share: 76 },
			{ role: "ADC", count: 11, share: 22 },
			{ role: "Jungle", count: 1, share: 2 },
		]);
	});

	it("is empty when there are no roles", () => {
		expect(roleShares({})).toEqual([]);
	});
});

describe("donutGradient", () => {
	it("builds cumulative conic stops", () => {
		expect(
			donutGradient(
				[
					{ role: "Support", count: 3, share: 75 },
					{ role: "ADC", count: 1, share: 25 },
				],
				["#a", "#b"],
			),
		).toBe("conic-gradient(#a 0% 75%, #b 75% 100%)");
	});

	it("falls back to the border color when empty", () => {
		expect(donutGradient([], ["#a"])).toBe("conic-gradient(var(--border) 0% 100%)");
	});
});
```

`src/lib/summoner/teammates.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { getRecentTeammates } from "./teammates";
import { makeMatch, makeParticipant } from "@/test/factories";

const me = makeParticipant({ puuid: "me", teamId: 100 });
const duo = (win: boolean) =>
	makeParticipant({ puuid: "duo", riotIdGameName: "Duo", riotIdTagline: "EUW", teamId: 100, win });
const enemy = makeParticipant({ puuid: "enemy", teamId: 200 });

describe("getRecentTeammates", () => {
	it("counts games and wins with players on the same team", () => {
		const matches = [
			makeMatch({ participants: [me, duo(true), enemy] }),
			makeMatch({ participants: [me, duo(false), enemy] }),
		];
		expect(getRecentTeammates(matches, "me")).toEqual([
			{ puuid: "duo", gameName: "Duo", tagLine: "EUW", profileIcon: 1, games: 2, wins: 1 },
		]);
	});

	it("leaves out one-off teammates and enemies", () => {
		const once = makeParticipant({ puuid: "once", teamId: 100 });
		expect(getRecentTeammates([makeMatch({ participants: [me, once, enemy] })], "me")).toEqual([]);
	});

	it("skips matches the player is not in", () => {
		expect(getRecentTeammates([makeMatch({ participants: [duo(true), enemy] })], "me")).toEqual([]);
	});
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — cannot find `./lp-change`, `./sparkline`, `./roles` and `./teammates`.

- [ ] **Step 4: Implement the four helpers**

`src/lib/summoner/lp-change.ts`:
```ts
import { type LPSnapshot } from "@/lib/validators/lp-history";

const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const DIVISIONS = ["IV", "III", "II", "I"];
const APEX_INDEX = 7;

/** Rank as one LP number: 400 per tier, 100 per division; apex tiers ignore the division. */
export function toAbsoluteLp(tier: string, rank: string, lp: number): number {
	const tierIndex = TIERS.indexOf(tier);
	if (tierIndex === -1) return 0;
	if (tierIndex >= APEX_INDEX) return tierIndex * 400 + lp;
	return tierIndex * 400 + Math.max(DIVISIONS.indexOf(rank), 0) * 100 + lp;
}

/** LP gained or lost in a match, from the snapshots just before and after it ended. */
export function calculateLPChange(snapshots: LPSnapshot[] | undefined, matchEndTime: number): number | null {
	if (!snapshots || snapshots.length < 2) return null;

	const sorted = [...snapshots].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
	let before: LPSnapshot | null = null;
	let after: LPSnapshot | null = null;

	for (const snap of sorted) {
		if (Date.parse(snap.createdAt) <= matchEndTime) before = snap;
		else if (!after) after = snap;
	}

	if (!before || !after) return null;
	return toAbsoluteLp(after.tier, after.rank, after.lp) - toAbsoluteLp(before.tier, before.rank, before.lp);
}
```

`src/lib/summoner/sparkline.ts`:
```ts
/** SVG `points` for a sparkline; min maps to the bottom, max to the top, non-finite values are dropped. */
export function sparklinePoints(values: number[], width: number, height: number): string {
	const finite = values.filter((v) => Number.isFinite(v));
	if (finite.length === 0) return "";
	if (finite.length === 1) return `0,${height / 2} ${width},${height / 2}`;

	const min = Math.min(...finite);
	const max = Math.max(...finite);
	const span = max - min;
	const step = width / (finite.length - 1);

	return finite
		.map((value, index) => {
			const y = span === 0 ? height / 2 : height - ((value - min) / span) * height;
			return `${Math.round(index * step * 100) / 100},${Math.round(y * 100) / 100}`;
		})
		.join(" ");
}
```

`src/lib/summoner/roles.ts`:
```ts
/** A role with its game count and whole-percent share. */
export interface RoleShare {
	role: string;
	count: number;
	share: number;
}

/** Role counts to shares, most played first. */
export function roleShares(roles: Record<string, number>): RoleShare[] {
	const total = Object.values(roles).reduce((sum, count) => sum + count, 0);
	if (total === 0) return [];
	return Object.entries(roles)
		.map(([role, count]) => ({ role, count, share: Math.round((count / total) * 100) }))
		.sort((a, b) => b.count - a.count);
}

/** CSS `conic-gradient` for a role donut; colors repeat if there are more roles than colors. */
export function donutGradient(shares: RoleShare[], colors: readonly string[]): string {
	if (shares.length === 0) return "conic-gradient(var(--border) 0% 100%)";

	let start = 0;
	const stops = shares.map((share, index) => {
		const end = index === shares.length - 1 ? 100 : start + share.share;
		const stop = `${colors[index % colors.length]} ${start}% ${end}%`;
		start = end;
		return stop;
	});
	return `conic-gradient(${stops.join(", ")})`;
}
```

`src/lib/summoner/teammates.ts`:
```ts
import { type Match } from "@/lib/validators/match";

/** A teammate seen in at least two recent games. */
export interface RecentTeammate {
	puuid: string;
	gameName: string;
	tagLine: string;
	profileIcon: number;
	games: number;
	wins: number;
}

const MIN_GAMES_TOGETHER = 2;

/** Players who were on the player's team at least twice, most games first. */
export function getRecentTeammates(matches: Match[], puuid: string, limit = 5): RecentTeammate[] {
	const byPuuid = new Map<string, RecentTeammate>();

	for (const match of matches) {
		const me = match.info.participants.find((p) => p.puuid === puuid);
		if (!me) continue;

		for (const p of match.info.participants) {
			if (p.teamId !== me.teamId || p.puuid === puuid) continue;
			const entry = byPuuid.get(p.puuid) ?? {
				puuid: p.puuid,
				gameName: p.riotIdGameName,
				tagLine: p.riotIdTagline,
				profileIcon: p.profileIcon,
				games: 0,
				wins: 0,
			};
			entry.games++;
			if (p.win) entry.wins++;
			byPuuid.set(p.puuid, entry);
		}
	}

	return [...byPuuid.values()]
		.filter((t) => t.games >= MIN_GAMES_TOGETHER)
		.sort((a, b) => b.games - a.games)
		.slice(0, limit);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Create `lp-sparkline.tsx` and `ranked-panel.tsx`**

`src/components/summoner/overview/lp-sparkline.tsx`:
```tsx
import { sparklinePoints } from "@/lib/summoner/sparkline";
import { toAbsoluteLp } from "@/lib/summoner/lp-change";
import { type LPSnapshot } from "@/lib/validators/lp-history";

const WIDTH = 240;
const HEIGHT = 36;

/** 30-day LP trend line; renders nothing with fewer than two snapshots. */
export function LpSparkline({ snapshots }: { snapshots?: LPSnapshot[] }) {
	if (!snapshots || snapshots.length < 2) return null;
	const points = sparklinePoints(snapshots.map((s) => toAbsoluteLp(s.tier, s.rank, s.lp)), WIDTH, HEIGHT);

	return (
		<svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="mt-3 h-9 w-full" aria-hidden>
			<polyline points={points} fill="none" stroke="var(--primary)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
		</svg>
	);
}
```

`src/components/summoner/overview/ranked-panel.tsx`:
```tsx
"use client";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { RankEmblem } from "@/components/ui/rank-emblem";
import { useLPHistory } from "@/hooks/useLPHistory";
import { RANK_COLORS } from "@/lib/icon-helpers";
import { formatRankLabel } from "@/lib/rank-calculator";
import { type RankedEntry } from "@/lib/validators/ranked";
import { LpSparkline } from "./lp-sparkline";

const TITLES: Record<string, string> = {
	RANKED_SOLO_5x5: "Ranked Solo",
	RANKED_FLEX_SR: "Ranked Flex",
};

/** Rank card for one queue with a 30-day LP sparkline; shows Unranked without an entry. */
export function RankedPanel({
	puuid,
	queueType,
	entry,
}: {
	puuid: string;
	queueType: "RANKED_SOLO_5x5" | "RANKED_FLEX_SR";
	entry?: RankedEntry;
}) {
	const { data: snapshots } = useLPHistory(entry ? puuid : undefined, queueType, "30d");

	return (
		<Panel>
			<PanelHeader title={TITLES[queueType]} />
			<PanelBody>
				{entry ? (
					<>
						<div className="flex items-center gap-4">
							<RankEmblem tier={entry.tier} size={64} />
							<div className="min-w-0">
								<p className="text-lg font-bold" style={{ color: RANK_COLORS[entry.tier] }}>
									{formatRankLabel(entry.tier, entry.rank)}
									<span className="ml-1.5 text-sm font-medium text-muted-foreground">{entry.leaguePoints} LP</span>
								</p>
								<p className="text-sm">
									<span className="text-win">{entry.wins}W</span>{" "}
									<span className="text-loss">{entry.losses}L</span>
									<span className="text-muted-foreground">
										{" "}· {Math.round((entry.wins / Math.max(entry.wins + entry.losses, 1)) * 100)}%
									</span>
								</p>
							</div>
						</div>
						<LpSparkline snapshots={snapshots} />
					</>
				) : (
					<div className="flex items-center gap-4">
						<RankEmblem tier={null} size={48} />
						<p className="text-sm text-muted-foreground">Unranked</p>
					</div>
				)}
			</PanelBody>
		</Panel>
	);
}
```

- [ ] **Step 7: Create `roles-performance-panel.tsx`**

```tsx
"use client";

import { useMemo } from "react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { calculateStats } from "@/lib/match-stats";
import { donutGradient, roleShares } from "@/lib/summoner/roles";
import { formatThousands } from "@/lib/format";
import { type Match } from "@/lib/validators/match";

const ROLE_COLORS = ["var(--primary)", "var(--team-blue)", "var(--win)", "var(--gold)", "var(--loss)"] as const;

/** Role donut plus average KDA, CS, gold, damage and vision over the loaded matches. */
export function RolesPerformancePanel({ matches, puuid }: { matches: Match[]; puuid: string }) {
	const stats = useMemo(() => calculateStats(matches, puuid), [matches, puuid]);
	const shares = useMemo(() => roleShares(stats.roles), [stats.roles]);

	return (
		<Panel>
			<PanelHeader
				title="Roles & Performance"
				actions={<span className="text-xs text-muted-foreground">Last {stats.totalGames}</span>}
			/>
			{stats.totalGames === 0 ? (
				<EmptyState title="No ranked or normal games yet" />
			) : (
				<PanelBody className="space-y-4">
					<div className="flex items-center gap-4">
						<div className="grid size-20 shrink-0 place-items-center rounded-full" style={{ background: donutGradient(shares, ROLE_COLORS) }}>
							<div className="grid size-14 place-items-center rounded-full bg-card text-[11px] font-semibold text-foreground">
								{shares[0]?.role ?? "-"}
							</div>
						</div>
						<ul className="min-w-0 flex-1 space-y-1 text-sm">
							{shares.slice(0, 4).map((share, index) => (
								<li key={share.role} className="flex items-center gap-2">
									<span className="size-2 rounded-sm" style={{ background: ROLE_COLORS[index % ROLE_COLORS.length] }} />
									<span className="flex-1 text-foreground">{share.role}</span>
									<span className="text-muted-foreground">{share.share}%</span>
								</li>
							))}
						</ul>
					</div>

					<div>
						<p className="text-xl font-bold">
							<span className="text-win">{stats.avgKills}</span> / <span className="text-loss">{stats.avgDeaths}</span> /{" "}
							<span className="text-gold">{stats.avgAssists}</span>
							<span className="ml-2 text-sm font-medium text-muted-foreground">{stats.avgKDA} KDA</span>
						</p>
						<p className="text-sm text-muted-foreground">
							<span className={stats.winRate >= 50 ? "text-win" : "text-loss"}>{stats.winRate}%</span> · {stats.wins}W {stats.losses}L
						</p>
					</div>

					<dl className="grid grid-cols-4 gap-2 text-center">
						{[
							["CS", String(stats.avgCS)],
							["Gold", formatThousands(stats.avgGold)],
							["Damage", formatThousands(stats.avgDamage)],
							["Vision", String(stats.avgVisionScore)],
						].map(([label, value]) => (
							<div key={label}>
								<dd className="text-sm font-semibold text-foreground">{value}</dd>
								<dt className="text-[11px] text-muted-foreground">{label}</dt>
							</div>
						))}
					</dl>

					<div className="flex gap-0.5">
						{stats.recentTrend.slice(0, 20).map((win, index) => (
							<span key={index} className={`h-3 flex-1 rounded-sm ${win ? "bg-win" : "bg-loss"}`} />
						))}
					</div>
				</PanelBody>
			)}
		</Panel>
	);
}
```

`formatThousands` is defined in Task 4. For this task, add it to `src/lib/format.ts` now with its test. Write the test first:
```ts
describe("formatThousands", () => {
	it("abbreviates thousands with one decimal", () => {
		expect(formatThousands(13812)).toBe("13.8k");
	});

	it("rounds values below a thousand", () => {
		expect(formatThousands(812.6)).toBe("813");
	});
});
```
Append it to `src/lib/format.test.ts` and add `formatThousands` to that file's import. Run `pnpm test` and expect FAIL (`formatThousands is not a function`). Then append to `src/lib/format.ts`:
```ts
/** `13.8k` from 1000 up, a rounded number below. */
export function formatThousands(value: number): string {
	return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${Math.round(value)}`;
}
```
Run `pnpm test` and expect PASS.

- [ ] **Step 8: Create `most-played-panel.tsx` and `recently-played-panel.tsx`**

`src/components/summoner/overview/most-played-panel.tsx`:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChampionStats } from "@/hooks/useChampionStats";
import { getChampionDisplayName } from "@/lib/icon-helpers";
import { type QueueFilter } from "@/lib/champion-stats/queue";

const QUEUE_OPTIONS: { value: QueueFilter; label: string }[] = [
	{ value: "all", label: "All queues" },
	{ value: "solo", label: "Ranked Solo" },
	{ value: "flex", label: "Ranked Flex" },
];

/** Top five champions from the stored-match stats, with a link to the Champions tab. */
export function MostPlayedPanel({ puuid, version, basePath }: { puuid: string; version: string; basePath: string }) {
	const [queue, setQueue] = useState<QueueFilter>("all");
	const { data: stats, isLoading } = useChampionStats(puuid, queue);
	const top = stats?.slice(0, 5) ?? [];
	const maxGames = top[0]?.games ?? 1;

	return (
		<Panel>
			<PanelHeader
				title="Most played"
				actions={
					<Select value={queue} onValueChange={(v) => setQueue(v as QueueFilter)}>
						<SelectTrigger size="sm" className="h-7 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent position="popper">
							{QUEUE_OPTIONS.map((o) => (
								<SelectItem key={o.value} value={o.value}>
									{o.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				}
			/>
			{isLoading ? (
				<PanelBody className="space-y-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-9" />
					))}
				</PanelBody>
			) : top.length === 0 ? (
				<EmptyState title="No games in this queue" />
			) : (
				<PanelBody className="space-y-3">
					{top.map((s) => (
						<div key={s.championId} className="flex items-center gap-3">
							<ChampionIcon version={version} championName={s.championName} size={32} />
							<div className="min-w-0 flex-1">
								<div className="flex items-baseline justify-between gap-2 text-sm">
									<span className="truncate font-semibold text-foreground">{getChampionDisplayName(s.championName)}</span>
									<span className="text-xs text-muted-foreground">{s.kda} KDA</span>
								</div>
								<div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
									<div className="h-full rounded-full bg-primary" style={{ width: `${(s.games / maxGames) * 100}%` }} />
								</div>
							</div>
							<div className="w-12 text-right text-sm">
								<p className="font-semibold text-foreground">{s.games}</p>
								<p className={`text-xs ${s.winRate >= 50 ? "text-win" : "text-loss"}`}>{Math.round(s.winRate)}%</p>
							</div>
						</div>
					))}
					<Link href={`${basePath}/champions`} className="block text-center text-xs font-medium text-primary hover:underline">
						See all champions &rarr;
					</Link>
				</PanelBody>
			)}
		</Panel>
	);
}
```

Before writing, confirm that `SelectTrigger` accepts `size="sm"` by reading `src/components/ui/select.tsx`. If it does not, drop the prop and keep `className="h-7 text-xs"`, then record the ruling.

`src/components/summoner/overview/recently-played-panel.tsx`:
```tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { getSummonerIcon } from "@/lib/icon-helpers";
import { toSummonerSlug } from "@/lib/riot-id";
import { getRecentTeammates } from "@/lib/summoner/teammates";
import { type Match } from "@/lib/validators/match";

/** Teammates from at least two of the loaded games, linking to their profiles. */
export function RecentlyPlayedPanel({ matches, puuid, version }: { matches: Match[]; puuid: string; version: string }) {
	const teammates = useMemo(() => getRecentTeammates(matches, puuid), [matches, puuid]);

	return (
		<Panel>
			<PanelHeader title="Recently played with" />
			{teammates.length === 0 ? (
				<EmptyState title="No repeat teammates" description="Players you queued with twice or more show up here." />
			) : (
				<PanelBody className="space-y-1 p-2">
					{teammates.map((t) => {
						const winRate = Math.round((t.wins / t.games) * 100);
						return (
							<Link
								key={t.puuid}
								href={`/summoner/${toSummonerSlug(t.gameName, t.tagLine)}`}
								className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
							>
								<img src={getSummonerIcon(version, t.profileIcon)} alt="" width={32} height={32} className="size-8 rounded-md" />
								<div className="min-w-0 flex-1 text-sm">
									<p className="truncate font-medium text-foreground">
										{t.gameName}
										<span className="ml-1 text-muted-foreground">#{t.tagLine}</span>
									</p>
									<p className="text-xs text-muted-foreground">{t.games} games</p>
								</div>
								<span className={`text-sm font-medium ${winRate >= 50 ? "text-win" : "text-loss"}`}>{winRate}%</span>
							</Link>
						);
					})}
				</PanelBody>
			)}
		</Panel>
	);
}
```

- [ ] **Step 9: Create `achievement-preview.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAchievements, useDetectAchievements } from "@/hooks/useAchievements";
import { ACHIEVEMENTS } from "@/lib/achievements/definitions";

const PREVIEW_COUNT = 4;

/** Up to four earned achievements above the Overview columns; detection runs once per profile visit. */
export function AchievementPreview({ puuid, basePath }: { puuid: string; basePath: string }) {
	const { data: saved } = useAchievements(puuid);
	const { mutate: detect } = useDetectAchievements();

	useEffect(() => {
		detect({ puuid });
	}, [puuid, detect]);

	const earnedIds = new Set(saved?.map((a) => a.achievementId) ?? []);
	const earned = ACHIEVEMENTS.filter((a) => earnedIds.has(a.id));
	if (earned.length === 0) return null;

	return (
		<TooltipProvider delayDuration={200}>
			<div className="mb-4 flex flex-wrap items-center gap-1.5">
				{earned.slice(0, PREVIEW_COUNT).map((a) => (
					<Tooltip key={a.id}>
						<TooltipTrigger asChild>
							<Chip color={a.color} className="h-6 px-2 text-xs">
								{a.name}
							</Chip>
						</TooltipTrigger>
						<TooltipContent>
							<p>{a.description}</p>
						</TooltipContent>
					</Tooltip>
				))}
				<Link href={`${basePath}/achievements`} className="ml-1 text-xs font-medium text-primary hover:underline">
					{earned.length > PREVIEW_COUNT ? `+${earned.length - PREVIEW_COUNT} more` : "See all"} &rarr;
				</Link>
			</div>
		</TooltipProvider>
	);
}
```

- [ ] **Step 10: Create `overview-tab.tsx` and rewrite `page.tsx`**

`src/components/summoner/overview/overview-tab.tsx`:
```tsx
"use client";

import { useMemo } from "react";
import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { MatchList } from "@/components/summoner/match-history";
import { Skeleton } from "@/components/ui/skeleton";
import { useDDragonVersion } from "@/hooks/useDDragonVersion";
import { useLPHistory } from "@/hooks/useLPHistory";
import { useMatches } from "@/hooks/useMatches";
import { useRanked } from "@/hooks/useRanked";
import { useRunes } from "@/hooks/useRunes";
import { type Match } from "@/lib/validators/match";
import { AchievementPreview } from "./achievement-preview";
import { MostPlayedPanel } from "./most-played-panel";
import { RankedPanel } from "./ranked-panel";
import { RecentlyPlayedPanel } from "./recently-played-panel";
import { RolesPerformancePanel } from "./roles-performance-panel";

const INITIAL_MATCH_COUNT = 20;
const REMAINING_MATCH_COUNT = 30;

/** First 20 matches for a fast paint, then the next 30 by offset for the aggregate panels. */
export function useOverviewMatches(puuid: string): { matches?: Match[]; isLoading: boolean } {
	const { data: firstPage, isLoading } = useMatches(puuid, INITIAL_MATCH_COUNT);
	const { data: rest } = useMatches(firstPage ? puuid : undefined, REMAINING_MATCH_COUNT, undefined, INITIAL_MATCH_COUNT);
	const matches = useMemo(() => (firstPage ? [...firstPage, ...(rest ?? [])] : undefined), [firstPage, rest]);
	return { matches, isLoading };
}

/** Overview tab: stat column on the left, match list on the right. */
export function OverviewTab() {
	const { puuid, basePath } = useSummonerContext();
	const { data: version } = useDDragonVersion();
	const { data: ranked } = useRanked(puuid);
	const { data: runeData } = useRunes();
	const { matches, isLoading } = useOverviewMatches(puuid);
	const { data: soloHistory } = useLPHistory(puuid, "RANKED_SOLO_5x5");
	const { data: flexHistory } = useLPHistory(puuid, "RANKED_FLEX_SR");

	const solo = ranked?.find((e) => e.queueType === "RANKED_SOLO_5x5");
	const flex = ranked?.find((e) => e.queueType === "RANKED_FLEX_SR");

	return (
		<>
			<AchievementPreview puuid={puuid} basePath={basePath} />
			<div className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
				<div className="space-y-4">
					<RankedPanel puuid={puuid} queueType="RANKED_SOLO_5x5" entry={solo} />
					<RankedPanel puuid={puuid} queueType="RANKED_FLEX_SR" entry={flex} />
					{matches ? <RolesPerformancePanel matches={matches} puuid={puuid} /> : <Skeleton className="h-72" />}
					{version && <MostPlayedPanel puuid={puuid} version={version} basePath={basePath} />}
					{matches && version && <RecentlyPlayedPanel matches={matches} puuid={puuid} version={version} />}
				</div>
				<div className="min-w-0">
					<MatchList
						matches={matches}
						puuid={puuid}
						version={version}
						isLoading={isLoading}
						runeData={runeData}
						soloHistory={soloHistory}
						flexHistory={flexHistory}
					/>
				</div>
			</div>
		</>
	);
}
```
Read `src/hooks/useRanked.ts` before writing, to confirm the signature `useRanked(puuid: string | undefined)` and the return type `useQuery<RankedEntry[]>`. If the hook takes a `force` flag or has another name, adapt the call and record the ruling.

`src/app/summoner/[name]/page.tsx` (replace the whole file):
```tsx
import { OverviewTab } from "@/components/summoner/overview/overview-tab";

export default function SummonerOverviewPage() {
	return <OverviewTab />;
}
```

- [ ] **Step 11: Verify in the Browser pane**

Open `/summoner/Skaikru-HEAVN` and check, in both dark and light mode:
- achievement chips sit above the columns
- the left column shows, in order:
  - Ranked Solo and Flex, each with emblem, LP, W/L and a sparkline once there are two or more snapshots in 30 days
  - Roles & Performance, with the donut and stats
  - Most played (its select switches queues)
  - Recently played with
- the old match list renders on the right
- the console shows no errors

- [ ] **Step 12: Typecheck and lint**

Run: `pnpm run typecheck` → no errors.
Run: `npx eslint src/components/summoner/overview src/lib/summoner src/lib/format.ts src/test src/app/summoner` → 0 errors.

---

### Task 3: Shared mirrored scoreboard

**Files:**
- Modify: `src/lib/validators/match.ts` (`teams` entries get optional `objectives`)
- Create: `src/lib/summoner/scoreboard.ts`, `src/lib/summoner/scoreboard.test.ts`
- Create: `src/components/shared/scoreboard/mirrored-scoreboard.tsx`, `scoreboard-row.tsx`, `team-header.tsx`, `bans-row.tsx`

**Interfaces:**
- Consumes:
  - Task 2: `makeMatch`, `makeParticipant`
  - existing: `formatRankLabel`, `toSummonerSlug`, `getChampionIcon`
  - Phase 0: `ChampionIcon`, `ItemSlots`
  - Task 4 (written in this task too): `participantItems`, `formatThousands`. `participantItems` is created here in `src/lib/summoner/match-row.ts` with its test; Task 4 extends that file.
- Produces:
  - `interface TeamObjectives { towers: number; dragons: number; barons: number; heralds: number; grubs: number }`
  - `interface TeamSummary { teamId: number; win: boolean; kills: number; deaths: number; assists: number; bans: number[]; objectives: TeamObjectives }`
  - `interface ScoreboardRowPair { blue: Participant | null; red: Participant | null }`
  - `interface ScoreboardData { blue: TeamSummary; red: TeamSummary; rows: ScoreboardRowPair[] }`
  - `buildScoreboard(match: Match): ScoreboardData`
  - `participantItems(p: Participant): number[]`
  - `MirroredScoreboard(props: { data: ScoreboardData; version: string; highlightPuuid?: string; ranks?: Record<string, RankedEntry[]>; rankQueue?: string; champions?: Record<number, Champion>; footer?: React.ReactNode })`

- [ ] **Step 1: Add optional objectives to the match schema**

In `src/lib/validators/match.ts`, inside `matchSchema` → `info.teams` → the team `z.object({...})`, add after `bans`:
```ts
			objectives: z.record(z.string(), z.object({ kills: z.number() })).optional(),
```

- [ ] **Step 2: Write the failing tests**

`src/lib/summoner/scoreboard.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildScoreboard } from "./scoreboard";
import { makeMatch, makeParticipant } from "@/test/factories";

const blue = (puuid: string, teamPosition: string, k = 0) =>
	makeParticipant({ puuid, teamId: 100, teamPosition, kills: k, deaths: 1, assists: 2 });
const red = (puuid: string, teamPosition: string) =>
	makeParticipant({ puuid, teamId: 200, teamPosition, win: false });

describe("buildScoreboard", () => {
	it("pairs lane opponents by position, not by array order", () => {
		const data = buildScoreboard(
			makeMatch({ participants: [blue("b-sup", "UTILITY"), blue("b-top", "TOP"), red("r-top", "TOP"), red("r-sup", "UTILITY")] }),
		);
		expect(data.rows.map((r) => [r.blue?.puuid, r.red?.puuid])).toEqual([
			["b-top", "r-top"],
			["b-sup", "r-sup"],
		]);
	});

	it("keeps the original order when positions are empty (ARAM)", () => {
		const data = buildScoreboard(makeMatch({ participants: [blue("b1", ""), blue("b2", ""), red("r1", ""), red("r2", "")] }));
		expect(data.rows.map((r) => r.blue?.puuid)).toEqual(["b1", "b2"]);
	});

	it("leaves an empty cell when a team has fewer players", () => {
		const data = buildScoreboard(makeMatch({ participants: [blue("b1", "TOP"), blue("b2", "JUNGLE"), red("r1", "TOP")] }));
		expect(data.rows).toHaveLength(2);
		expect(data.rows[1].red).toBeNull();
	});

	it("sums team K/D/A", () => {
		const data = buildScoreboard(makeMatch({ participants: [blue("b1", "TOP", 3), blue("b2", "MIDDLE", 5)] }));
		expect([data.blue.kills, data.blue.deaths, data.blue.assists]).toEqual([8, 2, 4]);
	});

	it("reads objectives and bans, defaulting missing values to zero", () => {
		const data = buildScoreboard(
			makeMatch({
				teams: [
					{
						teamId: 100,
						win: true,
						bans: [
							{ championId: 157, pickTurn: 1 },
							{ championId: -1, pickTurn: 2 },
						],
						objectives: { tower: { kills: 10 }, dragon: { kills: 2 }, baron: { kills: 1 } },
					},
					{ teamId: 200, win: false, bans: [] },
				],
			}),
		);
		expect(data.blue.bans).toEqual([157]);
		expect(data.blue.objectives).toEqual({ towers: 10, dragons: 2, barons: 1, heralds: 0, grubs: 0 });
		expect(data.red.objectives).toEqual({ towers: 0, dragons: 0, barons: 0, heralds: 0, grubs: 0 });
		expect(data.blue.win).toBe(true);
	});
});
```

`src/lib/summoner/match-row.test.ts` (Task 4 appends to this file):
```ts
import { describe, expect, it } from "vitest";
import { participantItems } from "./match-row";
import { makeParticipant } from "@/test/factories";

describe("participantItems", () => {
	it("lists the seven item slots in order, trinket last", () => {
		expect(participantItems(makeParticipant({ item0: 1, item3: 4, item6: 3363 }))).toEqual([1, 0, 0, 4, 0, 0, 3363]);
	});
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — cannot find `./scoreboard` and `./match-row`.

- [ ] **Step 4: Implement `scoreboard.ts` and the first `match-row.ts` helper**

`src/lib/summoner/scoreboard.ts`:
```ts
import { type Match, type Participant } from "@/lib/validators/match";

export interface TeamObjectives {
	towers: number;
	dragons: number;
	barons: number;
	heralds: number;
	grubs: number;
}

export interface TeamSummary {
	teamId: number;
	win: boolean;
	kills: number;
	deaths: number;
	assists: number;
	bans: number[];
	objectives: TeamObjectives;
}

export interface ScoreboardRowPair {
	blue: Participant | null;
	red: Participant | null;
}

export interface ScoreboardData {
	blue: TeamSummary;
	red: TeamSummary;
	rows: ScoreboardRowPair[];
}

const POSITION_ORDER = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

function positionRank(p: Participant): number {
	const index = POSITION_ORDER.indexOf(p.teamPosition);
	return index === -1 ? POSITION_ORDER.length : index;
}

function teamPlayers(match: Match, teamId: number): Participant[] {
	return match.info.participants
		.filter((p) => p.teamId === teamId)
		.map((p, index) => ({ p, index }))
		.sort((a, b) => positionRank(a.p) - positionRank(b.p) || a.index - b.index)
		.map(({ p }) => p);
}

function summarize(match: Match, teamId: number, players: Participant[]): TeamSummary {
	const team = match.info.teams.find((t) => t.teamId === teamId);
	const objective = (key: string) => team?.objectives?.[key]?.kills ?? 0;

	return {
		teamId,
		win: team?.win ?? players[0]?.win ?? false,
		kills: players.reduce((sum, p) => sum + p.kills, 0),
		deaths: players.reduce((sum, p) => sum + p.deaths, 0),
		assists: players.reduce((sum, p) => sum + p.assists, 0),
		bans: (team?.bans ?? []).map((b) => b.championId).filter((id) => id > 0),
		objectives: {
			towers: objective("tower"),
			dragons: objective("dragon"),
			barons: objective("baron"),
			heralds: objective("riftHerald"),
			grubs: objective("horde"),
		},
	};
}

/** Blue (100) vs red (200) summary with lane opponents paired by position; missing players are `null`. */
export function buildScoreboard(match: Match): ScoreboardData {
	const blue = teamPlayers(match, 100);
	const red = teamPlayers(match, 200);
	const rows = Array.from({ length: Math.max(blue.length, red.length) }, (_, i) => ({
		blue: blue[i] ?? null,
		red: red[i] ?? null,
	}));

	return { blue: summarize(match, 100, blue), red: summarize(match, 200, red), rows };
}
```

`src/lib/summoner/match-row.ts`:
```ts
import { type Participant } from "@/lib/validators/match";

/** The seven item slots, trinket last. */
export function participantItems(p: Participant): number[] {
	return [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6];
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Create the scoreboard components**

`src/components/shared/scoreboard/team-header.tsx`:
```tsx
import { cn } from "@/lib/utils";
import { type TeamSummary } from "@/lib/summoner/scoreboard";

/** Team label, result, K/D/A and objective counts for one side of the scoreboard. */
export function TeamHeader({ team, side }: { team: TeamSummary; side: "blue" | "red" }) {
	const o = team.objectives;
	return (
		<div className={cn("flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs", side === "red" && "flex-row-reverse text-right")}>
			<span className={cn("font-bold", side === "blue" ? "text-team-blue" : "text-team-red")}>{side.toUpperCase()}</span>
			<span className={team.win ? "font-semibold text-win" : "font-semibold text-loss"}>{team.win ? "Victory" : "Defeat"}</span>
			<span className="text-foreground">
				{team.kills}/{team.deaths}/{team.assists}
			</span>
			<span className="text-muted-foreground" title="Towers · Dragons · Barons · Heralds · Voidgrubs">
				T {o.towers} · D {o.dragons} · B {o.barons} · H {o.heralds} · G {o.grubs}
			</span>
		</div>
	);
}
```

`src/components/shared/scoreboard/scoreboard-row.tsx`:
```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { ItemSlots } from "@/components/ui/item-slots";
import { formatThousands } from "@/lib/format";
import { formatRankLabel } from "@/lib/rank-calculator";
import { toSummonerSlug } from "@/lib/riot-id";
import { participantItems } from "@/lib/summoner/match-row";
import { type Participant } from "@/lib/validators/match";
import { type RankedEntry } from "@/lib/validators/ranked";

/** One player on one side of the scoreboard; the red side is mirrored. */
export function ScoreboardRow({
	participant,
	side,
	version,
	highlighted,
	rank,
}: {
	participant: Participant | null;
	side: "blue" | "red";
	version: string;
	highlighted: boolean;
	rank?: RankedEntry;
}) {
	if (!participant) return <div className="h-11" />;
	const p = participant;

	return (
		<div className={cn("flex h-11 items-center gap-2 px-2", side === "red" && "flex-row-reverse", highlighted && "bg-gold/10")}>
			<ChampionIcon version={version} championName={p.championName} size={28} level={p.champLevel} />
			<div className={cn("w-24 min-w-0 leading-tight sm:w-28", side === "red" && "text-right")}>
				<Link
					href={`/summoner/${toSummonerSlug(p.riotIdGameName, p.riotIdTagline)}`}
					onClick={(e) => e.stopPropagation()}
					className={cn("block truncate text-xs font-semibold hover:text-primary", highlighted ? "text-gold" : "text-foreground")}
				>
					{p.riotIdGameName}
				</Link>
				<span className="block truncate text-[10px] text-muted-foreground">
					{rank ? formatRankLabel(rank.tier, rank.rank) : "Unranked"}
				</span>
			</div>
			<div className={cn("w-16 text-center leading-tight", side === "red" && "order-none")}>
				<p className="text-xs font-semibold text-foreground">
					{p.kills}/{p.deaths}/{p.assists}
				</p>
				<p className="text-[10px] text-muted-foreground">
					{p.totalMinionsKilled + p.neutralMinionsKilled} CS · {formatThousands(p.goldEarned)}
				</p>
			</div>
			<ItemSlots version={version} items={participantItems(p)} size={17} className="hidden sm:flex" />
		</div>
	);
}
```

`src/components/shared/scoreboard/bans-row.tsx`:
```tsx
import { getChampionIcon, type Champion } from "@/lib/icon-helpers";

function BanIcons({ bans, version, champions }: { bans: number[]; version: string; champions?: Record<number, Champion> }) {
	return (
		<span className="flex items-center gap-1">
			{bans.map((id) => {
				const champ = champions?.[id];
				return champ ? (
					<img
						key={id}
						src={getChampionIcon(version, champ.id)}
						alt={champ.name}
						title={champ.name}
						width={18}
						height={18}
						className="size-[18px] rounded-full opacity-70 grayscale"
					/>
				) : null;
			})}
		</span>
	);
}

/** Both teams' bans with an optional centered slot (e.g. a link to the full match). */
export function BansRow({
	blueBans,
	redBans,
	version,
	champions,
	children,
}: {
	blueBans: number[];
	redBans: number[];
	version: string;
	champions?: Record<number, Champion>;
	children?: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
			<span className="flex items-center gap-1.5">
				Bans <BanIcons bans={blueBans} version={version} champions={champions} />
			</span>
			{children}
			<span className="flex items-center gap-1.5">
				<BanIcons bans={redBans} version={version} champions={champions} /> Bans
			</span>
		</div>
	);
}
```

`src/components/shared/scoreboard/mirrored-scoreboard.tsx`:
```tsx
import { type Champion } from "@/lib/icon-helpers";
import { type ScoreboardData } from "@/lib/summoner/scoreboard";
import { type RankedEntry } from "@/lib/validators/ranked";
import { BansRow } from "./bans-row";
import { ScoreboardRow } from "./scoreboard-row";
import { TeamHeader } from "./team-header";

/** LoG-style 5v5: blue left, red right, lane opponents face each other, bans at the bottom. */
export function MirroredScoreboard({
	data,
	version,
	highlightPuuid,
	ranks,
	rankQueue = "RANKED_SOLO_5x5",
	champions,
	footer,
}: {
	data: ScoreboardData;
	version: string;
	highlightPuuid?: string;
	ranks?: Record<string, RankedEntry[]>;
	rankQueue?: string;
	champions?: Record<number, Champion>;
	footer?: React.ReactNode;
}) {
	const rankOf = (puuid?: string) => (puuid ? ranks?.[puuid]?.find((e) => e.queueType === rankQueue) : undefined);

	return (
		<div className="bg-background/40">
			<div className="flex items-start justify-between gap-4 border-b px-3 py-2">
				<TeamHeader team={data.blue} side="blue" />
				<TeamHeader team={data.red} side="red" />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2">
				<div className="divide-y divide-border/50">
					{data.rows.map((row, i) => (
						<ScoreboardRow
							key={row.blue?.puuid ?? `b${i}`}
							participant={row.blue}
							side="blue"
							version={version}
							highlighted={!!row.blue && row.blue.puuid === highlightPuuid}
							rank={rankOf(row.blue?.puuid)}
						/>
					))}
				</div>
				<div className="divide-y divide-border/50 border-t md:border-l md:border-t-0">
					{data.rows.map((row, i) => (
						<ScoreboardRow
							key={row.red?.puuid ?? `r${i}`}
							participant={row.red}
							side="red"
							version={version}
							highlighted={!!row.red && row.red.puuid === highlightPuuid}
							rank={rankOf(row.red?.puuid)}
						/>
					))}
				</div>
			</div>
			<BansRow blueBans={data.blue.bans} redBans={data.red.bans} version={version} champions={champions}>
				{footer}
			</BansRow>
		</div>
	);
}
```

`formatThousands` already exists from Task 2.

- [ ] **Step 7: Typecheck and lint**

Run: `pnpm run typecheck` → no errors. The schema change is additive.
Run: `npx eslint src/components/shared src/lib/summoner src/lib/validators/match.ts` → 0 errors.

The visual check happens in Task 4, where the scoreboard is mounted.

---

### Task 4: Match list and match row C with the expanded scoreboard

**Files:**
- Modify: `src/lib/format.ts`, `src/lib/format.test.ts`
- Modify: `src/lib/summoner/match-row.ts`, `src/lib/summoner/match-row.test.ts`
- Create: `src/lib/summoner/match-filter.ts`, `src/lib/summoner/match-filter.test.ts`
- Create: `src/components/summoner/matches/match-list.tsx`, `match-filters.tsx`, `match-row.tsx`, `match-row-expanded.tsx`, `arena-scoreboard.tsx`, `match-badges.tsx`
- Modify: `src/components/summoner/overview/overview-tab.tsx` (swap the old `MatchList` for the new one)

**Interfaces:**
- Consumes:
  - Tasks 2 and 3: `calculateLPChange`, `buildScoreboard`, `MirroredScoreboard`, `participantItems`, `makeMatch`, `makeParticipant`
  - Phase 1: `QueueFilter`, `QUEUE_FILTERS`, `queueSelection`
  - existing: `useMatchBadgesBatch(matchIds)` → `Record<matchId, { puuid; badgeId }[]>`, `usePlayerRanks(puuids)`, `useChampions()`, `getMatchBadgeById`, `getRuneIcon`, `RuneData`, `RuneStyle`, `getQueueName`, the `arena-helpers` functions
- Produces:
  - `timeAgo(timestamp: number, now?: number): string`
  - `kdaRatio(kills: number, deaths: number, assists: number): number | null` (`null` means perfect)
  - `csPerMinute(cs: number, durationSeconds: number): number`
  - `shortQueueName(queueId: number, gameMode: string): string`
  - `killParticipation(player: Participant, participants: Participant[]): number` (0–100, integer)
  - `runeIcons(p: Participant, runeData?: RuneMaps): [string | null, string | null]`
  - `type RuneMaps = { runes: Map<number, RuneData>; styles: Map<number, RuneStyle> }`
  - `filterMatches(matches: Match[], puuid: string, queue: QueueFilter, championName: string | null): Match[]`. The champion argument serves the Phase 3 champion sub-page; the Overview passes `null`, because the spec moves champion filtering there.
  - `MatchList(props: { matches?: Match[]; puuid: string; version?: string; isLoading: boolean; runeData?: RuneMaps; soloHistory?: LPSnapshot[]; flexHistory?: LPSnapshot[] })`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/format.test.ts`, and extend its import to `import { csPerMinute, formatDuration, formatThousands, kdaRatio, timeAgo } from "./format";`:
```ts
describe("timeAgo", () => {
	const now = Date.parse("2026-10-10T12:00:00Z");

	it("is 'Just now' under five minutes and for future timestamps", () => {
		expect(timeAgo(now - 60_000, now)).toBe("Just now");
		expect(timeAgo(now + 60_000, now)).toBe("Just now");
	});

	it("rounds minutes down to five", () => {
		expect(timeAgo(now - 17 * 60_000, now)).toBe("15m ago");
	});

	it("switches to hours and days", () => {
		expect(timeAgo(now - 3 * 3_600_000, now)).toBe("3h ago");
		expect(timeAgo(now - 4 * 86_400_000, now)).toBe("4d ago");
	});
});

describe("kdaRatio", () => {
	it("is (kills + assists) / deaths rounded to two decimals", () => {
		expect(kdaRatio(8, 5, 10)).toBe(3.6);
		expect(kdaRatio(1, 3, 1)).toBe(0.67);
	});

	it("is null for a deathless game (perfect KDA)", () => {
		expect(kdaRatio(2, 0, 24)).toBeNull();
	});
});

describe("csPerMinute", () => {
	it("divides by game minutes with one decimal", () => {
		expect(csPerMinute(189, 1523)).toBe(7.4);
	});

	it("is 0 for a zero-length game", () => {
		expect(csPerMinute(10, 0)).toBe(0);
	});
});
```

Append to `src/lib/summoner/match-row.test.ts`, and extend its import to `import { killParticipation, participantItems, runeIcons, shortQueueName } from "./match-row";`:
```ts
describe("shortQueueName", () => {
	it("names ranked queues explicitly", () => {
		expect(shortQueueName(420, "CLASSIC")).toBe("Ranked Solo");
		expect(shortQueueName(440, "CLASSIC")).toBe("Ranked Flex");
	});

	it("uses the queue table, then the game mode", () => {
		expect(shortQueueName(450, "ARAM")).toBe("ARAM");
		expect(shortQueueName(9999, "SWARM")).toBe("SWARM");
	});
});

describe("killParticipation", () => {
	const me = makeParticipant({ puuid: "me", teamId: 100, kills: 8, assists: 10 });
	const mate = makeParticipant({ puuid: "mate", teamId: 100, kills: 32 });
	const enemy = makeParticipant({ puuid: "enemy", teamId: 200, kills: 50 });

	it("is the share of the team's kills, as a whole percent", () => {
		expect(killParticipation(me, [me, mate, enemy])).toBe(45);
	});

	it("is 0 when the team has no kills", () => {
		const quiet = makeParticipant({ puuid: "q", teamId: 100 });
		expect(killParticipation(quiet, [quiet, enemy])).toBe(0);
	});
});

describe("runeIcons", () => {
	const runeData = {
		runes: new Map([[8214, { id: 8214, key: "SummonAery", name: "Aery", icon: "perk-images/aery.png" }]]),
		styles: new Map([[8400, { id: 8400, key: "Resolve", name: "Resolve", icon: "perk-images/resolve.png", runes: [] }]]),
	};
	const withRunes = makeParticipant({
		perks: {
			statPerks: { defense: 0, flex: 0, offense: 0 },
			styles: [
				{ description: "primaryStyle", style: 8200, selections: [{ perk: 8214, var1: 0, var2: 0, var3: 0 }] },
				{ description: "subStyle", style: 8400, selections: [] },
			],
		},
	});

	it("resolves the keystone and secondary tree icons", () => {
		expect(runeIcons(withRunes, runeData)).toEqual([
			"https://ddragon.leagueoflegends.com/cdn/img/perk-images/aery.png",
			"https://ddragon.leagueoflegends.com/cdn/img/perk-images/resolve.png",
		]);
	});

	it("returns nulls without rune data or perks", () => {
		expect(runeIcons(withRunes, undefined)).toEqual([null, null]);
		expect(runeIcons(makeParticipant(), runeData)).toEqual([null, null]);
	});
});
```

`src/lib/summoner/match-filter.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { filterMatches } from "./match-filter";
import { makeMatch, makeParticipant } from "@/test/factories";

const mine = (championName: string) => makeParticipant({ puuid: "me", championName });
const solo = makeMatch({ matchId: "solo", queueId: 420, participants: [mine("Nami")] });
const arena = makeMatch({ matchId: "arena", queueId: 1700, participants: [mine("Lux")] });
const swift = makeMatch({ matchId: "swift", queueId: 480, participants: [mine("Nami")] });

describe("filterMatches", () => {
	it("keeps every queue, Arena included, for 'all'", () => {
		expect(filterMatches([solo, arena, swift], "me", "all", null)).toHaveLength(3);
	});

	it("filters by queue group", () => {
		expect(filterMatches([solo, arena, swift], "me", "normal", null).map((m) => m.metadata.matchId)).toEqual(["swift"]);
	});

	it("filters by the player's champion", () => {
		expect(filterMatches([solo, arena, swift], "me", "all", "Lux").map((m) => m.metadata.matchId)).toEqual(["arena"]);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL. `timeAgo`, `kdaRatio`, `csPerMinute`, `shortQueueName`, `killParticipation` and `runeIcons` are not functions, and `./match-filter` cannot be found.

- [ ] **Step 3: Implement the helpers**

Append to `src/lib/format.ts`:
```ts
/** `Just now`, `15m ago`, `3h ago`, `4d ago`; minutes round down to five. */
export function timeAgo(timestamp: number, now: number = Date.now()): string {
	const minutes = Math.floor((now - timestamp) / 60_000);
	if (minutes < 5) return "Just now";
	if (minutes < 60) return `${Math.floor(minutes / 5) * 5}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}

/** `(kills + assists) / deaths` to two decimals; `null` means perfect (no deaths). */
export function kdaRatio(kills: number, deaths: number, assists: number): number | null {
	if (deaths === 0) return null;
	return Math.round(((kills + assists) / deaths) * 100) / 100;
}

/** CS per minute to one decimal; 0 for a zero-length game. */
export function csPerMinute(cs: number, durationSeconds: number): number {
	if (durationSeconds <= 0) return 0;
	return Math.round((cs / (durationSeconds / 60)) * 10) / 10;
}
```

Replace `src/lib/summoner/match-row.ts` with:
```ts
import { getQueueName } from "@/lib/queue-names";
import { getRuneIcon, type RuneData, type RuneStyle } from "@/lib/icon-helpers";
import { type Participant } from "@/lib/validators/match";

export type RuneMaps = { runes: Map<number, RuneData>; styles: Map<number, RuneStyle> };

/** The seven item slots, trinket last. */
export function participantItems(p: Participant): number[] {
	return [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6];
}

/** Queue label for a match row. */
export function shortQueueName(queueId: number, gameMode: string): string {
	if (queueId === 420) return "Ranked Solo";
	if (queueId === 440) return "Ranked Flex";
	return getQueueName(queueId, gameMode);
}

/** Kills + assists as a whole percent of the team's kills; 0 when the team has none. */
export function killParticipation(player: Participant, participants: Participant[]): number {
	const teamKills = participants.filter((p) => p.teamId === player.teamId).reduce((sum, p) => sum + p.kills, 0);
	if (teamKills === 0) return 0;
	return Math.round(((player.kills + player.assists) / teamKills) * 100);
}

/** Keystone and secondary-tree icon URLs, `null` where unknown. */
export function runeIcons(p: Participant, runeData?: RuneMaps): [string | null, string | null] {
	if (!runeData) return [null, null];
	const [primary, secondary] = p.perks.styles;
	const keystone = primary?.selections[0] ? runeData.runes.get(primary.selections[0].perk) : undefined;
	const tree = secondary ? runeData.styles.get(secondary.style) : undefined;
	return [keystone ? getRuneIcon(keystone.icon) : null, tree ? getRuneIcon(tree.icon) : null];
}
```

`src/lib/summoner/match-filter.ts`:
```ts
import { queueSelection, type QueueFilter } from "@/lib/champion-stats/queue";
import { type Match } from "@/lib/validators/match";

/** Matches for a queue chip and an optional champion; `all` keeps every queue, Arena included. */
export function filterMatches(matches: Match[], puuid: string, queue: QueueFilter, championName: string | null): Match[] {
	const ids = queue === "all" ? null : queueSelection(queue).ids;
	return matches.filter(
		(m) =>
			(!ids || ids.includes(m.info.queueId)) &&
			(!championName || m.info.participants.some((p) => p.puuid === puuid && p.championName === championName)),
	);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Create `match-badges.tsx` and `match-filters.tsx`**

`src/components/summoner/matches/match-badges.tsx`:
```tsx
import { Chip } from "@/components/ui/chip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getMatchBadgeById } from "@/lib/match-badges/definitions";

/** Badge chips with tooltips; `max` shows that many plus a `+X` chip. Needs a TooltipProvider above. */
export function MatchBadges({ badgeIds, max }: { badgeIds: string[]; max?: number }) {
	const limit = max ?? badgeIds.length;
	const overflow = badgeIds.length - limit;

	return (
		<div className="flex flex-wrap items-center gap-1">
			{badgeIds.slice(0, limit).map((id) => {
				const def = getMatchBadgeById(id);
				if (!def) return null;
				return (
					<Tooltip key={id}>
						<TooltipTrigger asChild>
							<Chip color={def.color ?? ""}>{def.name}</Chip>
						</TooltipTrigger>
						<TooltipContent>
							<p>{def.description}</p>
						</TooltipContent>
					</Tooltip>
				);
			})}
			{overflow > 0 && <Chip color="">+{overflow}</Chip>}
		</div>
	);
}
```

`src/components/summoner/matches/match-filters.tsx` has queue chips only; per the spec, the champion filter lives on the Champions sub-page:
```tsx
"use client";

import { cn } from "@/lib/utils";
import { type QueueFilter } from "@/lib/champion-stats/queue";

const CHIPS: { value: QueueFilter; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "solo", label: "Solo" },
	{ value: "flex", label: "Flex" },
	{ value: "aram", label: "ARAM" },
	{ value: "normal", label: "Normal" },
];

/** Queue chips for the match list. */
export function MatchFilters({ queue, onQueueChange }: { queue: QueueFilter; onQueueChange: (queue: QueueFilter) => void }) {
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{CHIPS.map((chip) => (
				<button
					key={chip.value}
					type="button"
					onClick={() => onQueueChange(chip.value)}
					className={cn(
						"h-7 rounded-md border px-2.5 text-xs font-medium transition-colors",
						queue === chip.value ? "border-primary/50 bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground",
					)}
				>
					{chip.label}
				</button>
			))}
		</div>
	);
}
```

- [ ] **Step 6: Create `arena-scoreboard.tsx` and `match-row-expanded.tsx`**

`src/components/summoner/matches/arena-scoreboard.tsx`:
```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { getArenaTeams, getPlacementColor, getPlacementSuffix } from "@/lib/arena-helpers";
import { formatThousands } from "@/lib/format";
import { toSummonerSlug } from "@/lib/riot-id";
import { type Participant } from "@/lib/validators/match";

/** Arena leaderboard: eight duo teams by placement, top four above the divider. */
export function ArenaScoreboard({ participants, version, highlightPuuid }: { participants: Participant[]; version: string; highlightPuuid: string }) {
	return (
		<div className="divide-y divide-border/50 bg-background/40">
			{getArenaTeams(participants).map((team) => (
				<div
					key={team.placement}
					className={cn("flex items-center gap-3 px-3 py-2", team.placement > 4 && "opacity-60", team.placement === 4 && "border-b-2 border-b-border")}
				>
					<span className="w-8 text-sm font-bold" style={{ color: getPlacementColor(team.placement) }}>
						{team.placement}
						<span className="align-super text-[9px]">{getPlacementSuffix(team.placement)}</span>
					</span>
					<div className="grid flex-1 gap-1 sm:grid-cols-2">
						{team.players.map((p) => (
							<div key={p.puuid} className="flex min-w-0 items-center gap-2 text-xs">
								<ChampionIcon version={version} championName={p.championName} size={22} />
								<Link
									href={`/summoner/${toSummonerSlug(p.riotIdGameName, p.riotIdTagline)}`}
									onClick={(e) => e.stopPropagation()}
									className={cn("truncate font-medium hover:text-primary", p.puuid === highlightPuuid ? "text-gold" : "text-foreground")}
								>
									{p.riotIdGameName}
								</Link>
								<span className="ml-auto text-muted-foreground">
									{p.kills}/{p.deaths}/{p.assists} · {formatThousands(p.totalDamageDealtToChampions)}
								</span>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
```

`src/components/summoner/matches/match-row-expanded.tsx`:
```tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MirroredScoreboard } from "@/components/shared/scoreboard/mirrored-scoreboard";
import { useChampions } from "@/hooks/useChampions";
import { usePlayerRanks } from "@/hooks/usePlayerRanks";
import { isArenaMatch } from "@/lib/arena-helpers";
import { buildScoreboard } from "@/lib/summoner/scoreboard";
import { type Match } from "@/lib/validators/match";
import { ArenaScoreboard } from "./arena-scoreboard";

/** Expanded match: mirrored 5v5 (ranks fetched on open) or the Arena leaderboard, plus a full-match link. */
export function MatchRowExpanded({ match, puuid, version }: { match: Match; puuid: string; version: string }) {
	const arena = isArenaMatch(match.info.queueId);
	const puuids = useMemo(() => (arena ? undefined : match.info.participants.map((p) => p.puuid)), [arena, match]);
	const { data: ranks } = usePlayerRanks(puuids);
	const { data: champions } = useChampions();
	const data = useMemo(() => buildScoreboard(match), [match]);

	const fullMatch = (
		<Link
			href={`/match/${match.metadata.matchId}?puuid=${puuid}`}
			onClick={(e) => e.stopPropagation()}
			className="font-medium text-primary hover:underline"
		>
			Full match &rarr;
		</Link>
	);

	if (arena) {
		return (
			<div className="border-t">
				<ArenaScoreboard participants={match.info.participants} version={version} highlightPuuid={puuid} />
				<div className="border-t px-3 py-2 text-center text-xs">{fullMatch}</div>
			</div>
		);
	}

	return (
		<div className="border-t">
			<MirroredScoreboard
				data={data}
				version={version}
				highlightPuuid={puuid}
				ranks={ranks}
				rankQueue={match.info.queueId === 440 ? "RANKED_FLEX_SR" : "RANKED_SOLO_5x5"}
				champions={champions}
				footer={fullMatch}
			/>
		</div>
	);
}
```

- [ ] **Step 7: Create `match-row.tsx`**

```tsx
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { ItemSlots } from "@/components/ui/item-slots";
import { SpellRuneStack } from "@/components/ui/spell-rune-stack";
import { getPlacementColor, getPlacementSuffix, isArenaMatch, isArenaWin } from "@/lib/arena-helpers";
import { csPerMinute, formatDuration, kdaRatio, timeAgo } from "@/lib/format";
import { killParticipation, participantItems, runeIcons, shortQueueName, type RuneMaps } from "@/lib/summoner/match-row";
import { type Match, type Participant } from "@/lib/validators/match";
import { MatchBadges } from "./match-badges";
import { MatchRowExpanded } from "./match-row-expanded";

function Stat({ value, label, className }: { value: React.ReactNode; label: string; className?: string }) {
	return (
		<div className="w-11 text-center leading-tight">
			<p className={cn("text-sm font-semibold text-foreground", className)}>{value}</p>
			<p className="text-[10px] text-muted-foreground">{label}</p>
		</div>
	);
}

/** Minimal match row (C): result, champion, KDA, CS/KP/LP, items and badges; expands to the scoreboard. */
export function MatchRow({
	match,
	player,
	version,
	runeData,
	lpChange,
	badgeIds,
}: {
	match: Match;
	player: Participant;
	version: string;
	runeData?: RuneMaps;
	lpChange: number | null;
	badgeIds: string[];
}) {
	const [open, setOpen] = useState(false);
	const { info } = match;
	const arena = isArenaMatch(info.queueId);
	const placement = player.placement ?? (player.win ? 1 : 5);
	const won = arena ? isArenaWin(placement) : player.win;
	const kda = kdaRatio(player.kills, player.deaths, player.assists);
	const cs = player.totalMinionsKilled + player.neutralMinionsKilled;
	const ranked = info.queueId === 420 || info.queueId === 440;

	return (
		<div className="border-b last:border-b-0">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				className="relative flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 text-left transition-colors hover:bg-accent/40 sm:flex-nowrap sm:px-4"
			>
				<span className={cn("absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-r", won ? "bg-win" : "bg-loss")} />
				<div className="w-[4.75rem] shrink-0 leading-tight">
					{arena ? (
						<p className="text-sm font-bold" style={{ color: getPlacementColor(placement) }}>
							{placement}
							<span className="align-super text-[9px]">{getPlacementSuffix(placement)}</span>
						</p>
					) : (
						<p className={cn("text-sm font-bold", won ? "text-win" : "text-loss")}>{won ? "Victory" : "Defeat"}</p>
					)}
					<p className="truncate text-[11px] text-foreground">{shortQueueName(info.queueId, info.gameMode)}</p>
					<p className="text-[10px] text-muted-foreground">
						{formatDuration(info.gameDuration)} · {timeAgo(info.gameCreation)}
					</p>
				</div>

				<ChampionIcon version={version} championName={player.championName} size={44} level={player.champLevel} />
				<SpellRuneStack
					version={version}
					spells={[player.summoner1Id, player.summoner2Id]}
					runes={runeIcons(player, runeData)}
					className="hidden sm:grid"
				/>

				<div className="w-20 leading-tight">
					<p className="text-base font-bold text-foreground">
						{player.kills} / <span className="text-loss">{player.deaths}</span> / {player.assists}
					</p>
					<p className="text-[11px] text-muted-foreground">{kda === null ? "Perfect" : `${kda} KDA`}</p>
				</div>

				<div className="hidden gap-1 md:flex">
					{!arena && <Stat value={cs} label={`CS ${csPerMinute(cs, info.gameDuration)}`} />}
					<Stat value={`${killParticipation(player, info.participants)}%`} label="KP" />
					{ranked && (
						<Stat
							value={lpChange === null ? "—" : `${lpChange >= 0 ? "+" : ""}${lpChange}`}
							label="LP"
							className={lpChange === null ? "text-muted-foreground" : lpChange >= 0 ? "text-win" : "text-loss"}
						/>
					)}
				</div>

				<div className="ml-auto flex basis-full flex-col items-start gap-1 sm:basis-auto sm:items-end">
					<ItemSlots version={version} items={participantItems(player)} size={22} />
					{badgeIds.length > 0 && <MatchBadges badgeIds={badgeIds} max={2} />}
				</div>

				<ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
			</button>

			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.18 }}
						className="overflow-hidden"
					>
						<MatchRowExpanded match={match} puuid={player.puuid} version={version} />
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
```

A `<button>` cannot contain links; `MatchRowExpanded` (which has links) sits outside it. That is why the clickable header and the expanded body are siblings.

- [ ] **Step 8: Create `match-list.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useMatchBadgesBatch } from "@/hooks/useMatchBadges";
import { type QueueFilter } from "@/lib/champion-stats/queue";
import { calculateLPChange } from "@/lib/summoner/lp-change";
import { filterMatches } from "@/lib/summoner/match-filter";
import { type RuneMaps } from "@/lib/summoner/match-row";
import { type LPSnapshot } from "@/lib/validators/lp-history";
import { type Match } from "@/lib/validators/match";
import { MatchFilters } from "./match-filters";
import { MatchRow } from "./match-row";

const PAGE_SIZE = 20;

/** Recent games panel: filters, match rows C with LP change and badges, load more. */
export function MatchList({
	matches,
	puuid,
	version,
	isLoading,
	runeData,
	soloHistory,
	flexHistory,
}: {
	matches?: Match[];
	puuid: string;
	version?: string;
	isLoading: boolean;
	runeData?: RuneMaps;
	soloHistory?: LPSnapshot[];
	flexHistory?: LPSnapshot[];
}) {
	const [queue, setQueue] = useState<QueueFilter>("all");
	const [visible, setVisible] = useState(PAGE_SIZE);
	const matchIds = useMemo(() => matches?.map((m) => m.metadata.matchId), [matches]);
	const { data: badges } = useMatchBadgesBatch(matchIds);
	const filtered = useMemo(() => (matches ? filterMatches(matches, puuid, queue, null) : []), [matches, puuid, queue]);

	return (
		<Panel>
			<div className="flex flex-col gap-2 border-b px-4 py-2.5 sm:flex-row sm:items-center">
				<h2 className="text-sm font-semibold text-foreground">Recent games</h2>
				<div className="sm:ml-auto sm:w-auto">
					<MatchFilters
						queue={queue}
						onQueueChange={(next) => {
							setQueue(next);
							setVisible(PAGE_SIZE);
						}}
					/>
				</div>
			</div>

			{isLoading || !version ? (
				<div className="space-y-2 p-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-16" />
					))}
				</div>
			) : filtered.length === 0 ? (
				<EmptyState title={matches?.length ? "No games for this filter" : "No matches found"} />
			) : (
				<TooltipProvider delayDuration={200}>
					{filtered.slice(0, visible).map((match) => {
						const player = match.info.participants.find((p) => p.puuid === puuid);
						if (!player) return null;
						const { queueId, gameCreation, gameDuration } = match.info;
						const history = queueId === 440 ? flexHistory : soloHistory;
						const lpChange =
							queueId === 420 || queueId === 440 ? calculateLPChange(history, gameCreation + gameDuration * 1000) : null;
						const badgeIds = (badges?.[match.metadata.matchId] ?? []).filter((b) => b.puuid === puuid).map((b) => b.badgeId);

						return (
							<MatchRow
								key={match.metadata.matchId}
								match={match}
								player={player}
								version={version}
								runeData={runeData}
								lpChange={lpChange}
								badgeIds={badgeIds}
							/>
						);
					})}
					{visible < filtered.length && (
						<div className="p-3">
							<Button variant="outline" className="w-full" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
								Load more
							</Button>
						</div>
					)}
				</TooltipProvider>
			)}
		</Panel>
	);
}
```

- [ ] **Step 9: Swap the match list in `overview-tab.tsx`**

Replace `import { MatchList } from "@/components/summoner/match-history";` with `import { MatchList } from "@/components/summoner/matches/match-list";`. The props are compatible.

- [ ] **Step 10: Verify in the Browser pane**

Open `/summoner/Skaikru-HEAVN` and check:
- **Rows:** each shows the accent bar, result, queue, `duration · ago`, champion with level, spells and runes, KDA ("Perfect" on deathless games), CS/KP/LP on wide screens, items, and at most 2 badges plus `+X`.
- **Filters:** the queue chips narrow the list and reset paging, and "Load more" adds 20 rows.
- **Expanding a ranked row:** the mirrored scoreboard appears, with the header (result, K/D/A, objectives), 5 rows per side with lane opponents facing each other, rank labels once the batch arrives, the highlighted player in gold, bans, and a working "Full match →" link.
- **Expanding an Arena row** (if the history has one): the placement leaderboard appears.
- **Expanding an ARAM row:** 5 rows per side.
- The console shows no errors in dark and light mode.

- [ ] **Step 11: Typecheck and lint**

Run: `pnpm run typecheck` → no errors.
Run: `npx eslint src/components/summoner src/components/shared src/lib` → 0 errors in new files. The two pre-existing files `match-history.tsx` and `match-card.tsx` may still emit `no-img-element` warnings only.

---

### Task 5: Remove the replaced profile components

**Files:**
- Delete: `src/components/summoner/stats-card.tsx`, `roles-card.tsx`, `recent-players.tsx`, `ranked-card.tsx`, `mastery-list.tsx`, `achievement-bar.tsx`, `live-game-banner.tsx`, `lp-history-chart.tsx`, `refresh-timer.tsx`, `profile-header.tsx`, `champion-search.tsx`, `stats-skeleton.tsx`
- Keep: `src/components/summoner/match-history.tsx` and `match-card.tsx` (still used by the `[champion]` page until Phase 3)

- [ ] **Step 1: Confirm nothing imports the files**

Grep `src` for each basename. The pattern is:
```
summoner/(stats-card|roles-card|recent-players|ranked-card|mastery-list|achievement-bar|live-game-banner|lp-history-chart|refresh-timer|profile-header|champion-search|stats-skeleton)
```
Expected: no matches outside the files themselves. If `[champion]/page.tsx` or `live/page.tsx` imports one, keep that file, ledger a ruling, and remove it from the delete list.

- [ ] **Step 2: Delete them**

```bash
git rm src/components/summoner/stats-card.tsx src/components/summoner/roles-card.tsx src/components/summoner/recent-players.tsx src/components/summoner/ranked-card.tsx src/components/summoner/mastery-list.tsx src/components/summoner/achievement-bar.tsx src/components/summoner/live-game-banner.tsx src/components/summoner/lp-history-chart.tsx src/components/summoner/refresh-timer.tsx src/components/summoner/profile-header.tsx src/components/summoner/champion-search.tsx src/components/summoner/stats-skeleton.tsx
```

- [ ] **Step 2b: Check whether `CountUp` is still used**

Grep `src` for `CountUp`. If the only matches are `src/components/CountUp.jsx` and `CountUp.d.ts`, delete both with `git rm`.

- [ ] **Step 3: Typecheck, test and lint**

Run: `pnpm run typecheck` → no errors.
Run: `pnpm test` → all green.
Run: `pnpm run lint`

Expected: exactly **5** errors:
- `api/matches/[id]/route.ts` (1)
- `api/matches/[id]/timeline/route.ts` (1)
- `api/matches/route.ts` (2)
- `summoner/[name]/live/page.tsx` (1)

The `live-game-banner.tsx` error is gone with the file. Any other error is a regression; fix it.

---

### Task 6: Phase verification, review and the phase commit

- [ ] **Step 1: Production build**

Run: `pnpm run build`
Expected: success. `/summoner/[name]` is listed as dynamic (`ƒ`).

- [ ] **Step 2: Dark and light pass in the Browser pane**

Visit these pages and check the console for errors:
- `/summoner/Skaikru-HEAVN`: hero, tabs, left column, rows; expand one ranked, one ARAM and one Arena row if present.
- one teammate's profile, opened from "Recently played with".
- `/summoner/NoSuchPlayerXyz-0000`: the not-found page with the search box.

Then switch to light mode and repeat the first page.

- [ ] **Step 3: 375px mobile check**

Set the Browser pane to the mobile preset, reload `/summoner/Skaikru-HEAVN`, and run in the page:
```js
({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth })
```
Expected: the two values are equal. Also check that the tab bar scrolls inside itself, and that rows wrap their items under the main line. Reset the viewport to desktop afterwards.

- [ ] **Step 4: Pre-commit review of the staged diff**

Run `git add -A`, then dispatch the whole-diff reviewer, as in Phases 0 and 1. Fix Critical and Important findings with RED→GREEN tests, and ledger the minors.

- [ ] **Step 5: Commit the phase (single commit)**

```bash
git add -A
git status
git commit -m "$(cat <<'EOF'
feat(profile): server shell, Overview tab and new match rows

- Server-rendered summoner layout: splash hero (top mastery), rank chips,
  refresh, live banner, tab bar, per-profile metadata, not-found + loading
- Overview tab (layout B): ranked panels with 30-day LP sparkline, roles &
  performance, most played (stored-match stats), recently played with,
  achievement preview
- Match row C with LP change and badges; expands into the shared mirrored
  scoreboard (lane pairing, objectives, bans, ranks) or the Arena leaderboard
- Pure helpers with tests: format, LP change, sparkline, roles, teammates,
  scoreboard, match row, match filter, metadata, rank pills, live timer
- Remove the replaced profile components; next/image dropped from them

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```
Before committing, check that `git status` lists no `.env`, `.superpowers/` or `test_matches.json` changes.
