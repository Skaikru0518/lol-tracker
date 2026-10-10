# UI Redesign Phase 6 — Live Game and Error Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/summoner/[name]/live` as design A, then restyle the 404 and error pages and remove the components nothing uses anymore. Design A has:
- a hero with the player's champion splash, a pulsing LIVE timer, the queue and the map;
- a mirrored 5v5 with spells, rune trees, rank emblem, tier, WR and games;
- the team average rank per side, and bans at the bottom.

**Architecture:**
- The live route becomes a thin server page inside the existing summoner layout. It renders one client island, `LiveGame`.
- `LiveGame` reads `puuid` from `SummonerProvider`, so it no longer makes its own `useAccount` call.
- Derived values sit in a tested helper, `src/lib/live/live-game.ts`: team split, per-player rank summary, team average and map name.
- The timer uses the existing `useNow` and `liveElapsedSeconds`. That removes the old `setState`-in-effect, which is one of the 5 baseline lint errors.
- The 404 and error pages share one `ErrorScreen` component.

**Tech Stack:** Next.js 16.2.1 App Router, TanStack Query 5, Tailwind 4 tokens, shadcn, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-10-ui-redesign-design.md`:
- §3 "Live game (A)";
- §3 "Changelog, policy, errors, maintenance", the 404, error, summoner not-found and maintenance bullets;
- §5 "Live page: a player who is not in game gets an empty state with a link back to the profile".

Mockups: `.superpowers/brainstorm/214-1791637784/content/live.html` (option A) and `misc-pages.html` (sections 4–6).

## Global Constraints

- **Tooling and code style:**
  - Package manager: `pnpm` only.
  - Comments are JSDoc or single-line inline only; no JSX `{/* */}`.
  - Use `<img>` for external images, shadcn components where one exists, no emoji, and keep files to roughly 200 lines at most.
- **Sizing:**
  - Icons are rem-sized through primitives (`ChampionIcon`, `RankEmblem`) or `remSize`.
  - Small text uses `text-2xs` / `text-3xs`.
- **Colors:** tokens only.
- **Interaction:** no keyboard-navigation work.
- **Live page data:**
  - No champion mastery on the live page, because it would add 10 Riot calls.
  - Ranks come from the existing `usePlayerRanks`.
- **Fixed splashes:** the 404 page uses Teemo; maintenance (already done in Phase 0) uses Heimerdinger.
- **Commits:** one commit at the end, after the pre-commit review.
- **Verification:**
  - Check each page in the Browser pane in dark mode, light mode, at 375px and at 2560px.
  - Only use a profile that is actually in a game. Otherwise verify the not-in-game state, and never look up new Riot IDs.

## Review Focus

1. **Player not in game, or the live request fails.**
   - Expected: an EmptyState with a link back to the profile, never a blank page or an endless loader.
   - Covered by the `LiveGame` branches (Task 3) and the browser check (Task 5).
2. **Champion select** (`gameStartTime` 0) **and the timer.**
   - Expected: the "CHAMP SELECT" label without a running clock. In game, the timer ticks once a second from the start time, with no `setState` in an effect.
   - Test: `liveElapsedSeconds` already exists. Task 3 reuses it; lint must lose the live-page baseline error.
3. **Unranked players, and queues without their own rank** (ARAM, Arena, normals).
   - Expected: the row shows "Unranked" with no WR or games. The team average uses solo ranks for unranked queues, the same rule as the match page.
   - Test: `playerRankSummary` / `teamAvgRank` (Task 1).
4. **Ranked 5s and Flex games.**
   - Expected: ranks, WR, games and averages use that queue's entries.
   - Test: `playerRankSummary` / `teamAvgRank` with 440 and 710 (Task 1).
5. **Unequal teams** (Arena lobbies, custom 4v5) **and missing champion or rune data.**
   - Expected: rows pair by index with an empty cell on the shorter side. Unknown champions or runes show placeholders.
   - Test: `splitTeams` (Task 1); the placeholders are in the row component (Task 2).

---

### Task 1: Live game helpers

**Files:**
- Create: `src/lib/live/live-game.ts`, `src/lib/live/live-game.test.ts`

**Interfaces:**
- Consumes: `calculateAvgRank` (`src/lib/rank-calculator.ts`), `rankedQueueForQueueId` (`src/lib/ranked-queues.ts`), `RankedEntry`, `LiveGameParticipant`.
- Produces:
  - `splitTeams(participants: LiveGameParticipant[]): { rows: { blue: LiveGameParticipant | null; red: LiveGameParticipant | null }[] }`
  - `interface RankSummary { tier: string; rank: string; leaguePoints: number; winRate: number; games: number }`
  - `playerRankSummary(entries: RankedEntry[] | undefined, queueId: number): RankSummary | null`
  - `teamAvgRank(team: LiveGameParticipant[], ranks: Record<string, RankedEntry[]> | undefined, queueId: number): { tier: string; rank: string } | null`
  - `mapName(mapId: number | undefined): string`

- [ ] **Step 1: Write the failing tests**

`src/lib/live/live-game.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mapName, playerRankSummary, splitTeams, teamAvgRank } from "./live-game";

const player = (puuid: string, teamId: number) => ({
	puuid,
	summonerId: "",
	riotId: `${puuid}#EUNE`,
	championId: 1,
	teamId,
	spell1Id: 4,
	spell2Id: 14,
	perks: { perkIds: [8112], perkStyle: 8100, perkSubStyle: 8200 },
});

const entry = (queueType: string, tier: string, rank: string, wins: number, losses: number) => ({
	queueType,
	tier,
	rank,
	leaguePoints: 40,
	wins,
	losses,
	hotStreak: false,
	veteran: false,
	freshBlood: false,
	inactive: false,
});

describe("splitTeams", () => {
	it("pairs blue and red by index, padding the shorter side", () => {
		const { rows } = splitTeams([player("b1", 100), player("r1", 200), player("b2", 100)]);
		expect(rows.map((r) => [r.blue?.puuid ?? null, r.red?.puuid ?? null])).toEqual([
			["b1", "r1"],
			["b2", null],
		]);
	});
});

describe("playerRankSummary", () => {
	const entries = [entry("RANKED_SOLO_5x5", "EMERALD", "I", 54, 46), entry("RANKED_FLEX_SR", "GOLD", "II", 10, 10), entry("RANKED_PREMADE_5x5", "SILVER", "I", 3, 1)];

	it("uses the game's ranked queue", () => {
		expect(playerRankSummary(entries, 420)).toEqual({ tier: "EMERALD", rank: "I", leaguePoints: 40, winRate: 54, games: 100 });
		expect(playerRankSummary(entries, 440)?.tier).toBe("GOLD");
		expect(playerRankSummary(entries, 710)).toMatchObject({ tier: "SILVER", winRate: 75, games: 4 });
	});

	it("falls back to solo for queues without their own rank", () => {
		expect(playerRankSummary(entries, 450)?.tier).toBe("EMERALD");
	});

	it("is null for an unranked player or unknown ranks", () => {
		expect(playerRankSummary([entry("RANKED_FLEX_SR", "GOLD", "II", 1, 1)], 420)).toBeNull();
		expect(playerRankSummary(undefined, 420)).toBeNull();
	});
});

describe("teamAvgRank", () => {
	it("averages only the team's players in the game's queue", () => {
		const ranks = {
			b1: [entry("RANKED_SOLO_5x5", "DIAMOND", "I", 1, 1)],
			b2: [entry("RANKED_SOLO_5x5", "DIAMOND", "I", 1, 1)],
			r1: [entry("RANKED_SOLO_5x5", "IRON", "IV", 1, 1)],
		};
		expect(teamAvgRank([player("b1", 100), player("b2", 100)], ranks, 420)).toMatchObject({ tier: "DIAMOND", rank: "I" });
	});

	it("is null when nobody on the team is ranked", () => {
		expect(teamAvgRank([player("b1", 100)], {}, 420)).toBeNull();
	});
});

describe("mapName", () => {
	it("names the common maps and falls back for others", () => {
		expect(mapName(11)).toBe("Summoner's Rift");
		expect(mapName(12)).toBe("Howling Abyss");
		expect(mapName(30)).toBe("Rings of Wrath");
		expect(mapName(99)).toBe("Custom map");
		expect(mapName(undefined)).toBe("Custom map");
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/lib/live`
Expected: FAIL. The module cannot be resolved.

- [ ] **Step 3: Implement**

`src/lib/live/live-game.ts`:

```ts
import { calculateAvgRank } from "@/lib/rank-calculator";
import { rankedQueueForQueueId } from "@/lib/ranked-queues";
import { type LiveGameParticipant } from "@/lib/validators/live-game";
import { type RankedEntry } from "@/lib/validators/ranked";

/** Blue and red players paired by their order in the spectator response; the shorter side is padded with null. */
export function splitTeams(participants: LiveGameParticipant[]): { rows: { blue: LiveGameParticipant | null; red: LiveGameParticipant | null }[] } {
	const blue = participants.filter((p) => p.teamId === 100);
	const red = participants.filter((p) => p.teamId === 200);
	return { rows: Array.from({ length: Math.max(blue.length, red.length) }, (_, i) => ({ blue: blue[i] ?? null, red: red[i] ?? null })) };
}

export interface RankSummary {
	tier: string;
	rank: string;
	leaguePoints: number;
	winRate: number;
	games: number;
}

/** The player's rank in the game's queue (solo for queues without their own) with season WR and games; null when unranked. */
export function playerRankSummary(entries: RankedEntry[] | undefined, queueId: number): RankSummary | null {
	const queueType = rankedQueueForQueueId(queueId) ?? "RANKED_SOLO_5x5";
	const e = entries?.find((x) => x.queueType === queueType);
	if (!e) return null;
	const games = e.wins + e.losses;
	return { tier: e.tier, rank: e.rank, leaguePoints: e.leaguePoints, winRate: games > 0 ? Math.round((e.wins / games) * 100) : 0, games };
}

/** Average rank of one team in the game's queue; null when none of its players are ranked. */
export function teamAvgRank(
	team: LiveGameParticipant[],
	ranks: Record<string, RankedEntry[]> | undefined,
	queueId: number,
): { tier: string; rank: string } | null {
	if (!ranks) return null;
	const own = Object.fromEntries(team.filter((p) => ranks[p.puuid]).map((p) => [p.puuid, ranks[p.puuid]]));
	return calculateAvgRank(own, queueId);
}

const MAPS: Record<number, string> = { 11: "Summoner's Rift", 12: "Howling Abyss", 30: "Rings of Wrath" };

/** Display name of a live game's map. */
export function mapName(mapId: number | undefined): string {
	return (mapId !== undefined && MAPS[mapId]) || "Custom map";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/live && pnpm exec tsc --noEmit`
Expected: PASS; tsc 0.

---

### Task 2: Live hero and mirrored rows

**Files:**
- Create: `src/components/live/live-hero.tsx`
- Create: `src/components/live/live-row.tsx`
- Create: `src/components/live/live-scoreboard.tsx`

**Interfaces:**
- Consumes: Task 1 helpers; `useNow`, `liveElapsedSeconds`, `formatDuration`, `getQueueName`, `getChampionSplash`, `getSummonerSpellIcon`, `getRuneIcon`, `formatRankLabel`, `riotIdToSlug`, `RANK_COLORS`; `ChampionIcon`, `RankEmblem`, `HeroBanner`, `Panel`; `remSize`; `RuneMaps`, `Champion`.
- Produces:
  - `LiveHero({ game, championName, playerLabel })`
  - `LiveRow({ participant, side, version, champions, runeData, rank, ranksLoading, highlighted })`
  - `LiveScoreboard({ game, version, champions, runeData, ranks, ranksLoading, highlightPuuid })`

- [ ] **Step 1: Hero**

`src/components/live/live-hero.tsx`:

```tsx
"use client";

import { HeroBanner } from "@/components/ui/hero-banner";
import { useNow } from "@/hooks/useNow";
import { formatDuration } from "@/lib/format";
import { getChampionSplash } from "@/lib/icon-helpers";
import { mapName } from "@/lib/live/live-game";
import { getQueueName } from "@/lib/queue-names";
import { liveElapsedSeconds } from "@/lib/summoner/live-elapsed";

/** The player's champion splash with a pulsing LIVE timer (or champ select), the queue and the map. */
export function LiveHero({
	game,
	championName,
	playerLabel,
}: {
	game: { gameStartTime?: number; gameLength?: number; gameQueueConfigId?: number; mapId?: number };
	championName: string | undefined;
	playerLabel: string;
}) {
	const now = useNow();
	const champSelect = !game.gameStartTime;
	const elapsed = liveElapsedSeconds(game.gameStartTime, game.gameLength, now);

	return (
		<HeroBanner splashUrl={championName ? getChampionSplash(championName) : null} className="rounded-lg border">
			<div className="flex min-h-36 flex-col justify-end gap-1 p-5">
				<p className="flex items-center gap-2 text-sm font-bold text-loss">
					<span className="relative flex size-2.5">
						<span className="absolute inline-flex size-full animate-ping rounded-full bg-loss opacity-60" />
						<span className="relative inline-flex size-2.5 rounded-full bg-loss" />
					</span>
					{champSelect ? "CHAMP SELECT" : "LIVE"}
					{!champSelect && <span className="font-mono tabular-nums text-foreground">{formatDuration(elapsed)}</span>}
				</p>
				<h1 className="text-2xl font-bold text-foreground">{getQueueName(game.gameQueueConfigId ?? 0)}</h1>
				<p className="text-sm text-muted-foreground">
					{playerLabel} · {mapName(game.mapId)}
				</p>
			</div>
		</HeroBanner>
	);
}
```

- [ ] **Step 2: Row**

`src/components/live/live-row.tsx`:

```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { RankEmblem } from "@/components/ui/rank-emblem";
import { Skeleton } from "@/components/ui/skeleton";
import { type Champion, getRuneIcon, getSummonerSpellIcon, RANK_COLORS } from "@/lib/icon-helpers";
import { type RankSummary } from "@/lib/live/live-game";
import { formatRankLabel } from "@/lib/rank-calculator";
import { riotIdToSlug } from "@/lib/riot-id";
import { type RuneMaps } from "@/lib/summoner/match-row";
import { remSize } from "@/lib/ui/size";
import { type LiveGameParticipant } from "@/lib/validators/live-game";

const ICON = remSize(18);

/** One live player: champion, spells, rune trees, name, rank emblem with tier, WR and games; the red side is mirrored. */
export function LiveRow({
	participant,
	side,
	version,
	champions,
	runeData,
	rank,
	ranksLoading,
	highlighted,
}: {
	participant: LiveGameParticipant | null;
	side: "blue" | "red";
	version: string;
	champions?: Record<number, Champion>;
	runeData?: RuneMaps;
	rank: RankSummary | null;
	ranksLoading: boolean;
	highlighted: boolean;
}) {
	if (!participant) return <div className="h-14" />;
	const p = participant;
	const champion = champions?.[p.championId];
	const keystone = runeData?.runes.get(p.perks.perkIds[0]);
	const primary = runeData?.styles.get(p.perks.perkStyle);
	const secondary = runeData?.styles.get(p.perks.perkSubStyle);
	const icon = (src: string | null | undefined, alt: string) =>
		src ? <img src={src} alt={alt} title={alt} style={{ width: ICON, height: ICON }} className="rounded" /> : <span className="rounded bg-muted" style={{ width: ICON, height: ICON }} />;

	return (
		<div className={cn("flex h-14 items-center gap-2.5 px-3", side === "red" && "flex-row-reverse", highlighted && "bg-gold/10")}>
			{champion ? <ChampionIcon version={version} championName={champion.id} size={36} /> : <span className="size-9 rounded-md bg-muted" />}
			<div className="grid shrink-0 grid-cols-2 gap-0.5">
				{icon(getSummonerSpellIcon(version, p.spell1Id), "Spell")}
				{icon(keystone && getRuneIcon(keystone.icon), keystone?.name ?? "Keystone")}
				{icon(getSummonerSpellIcon(version, p.spell2Id), "Spell")}
				{icon(secondary && getRuneIcon(secondary.icon), secondary?.name ?? "Secondary tree")}
			</div>
			<div className={cn("min-w-0 flex-1 leading-tight", side === "red" && "text-right")}>
				<Link href={`/summoner/${riotIdToSlug(p.riotId)}`} className={cn("block truncate text-sm font-semibold hover:text-primary", highlighted ? "text-gold" : "text-foreground")}>
					{p.riotId}
				</Link>
				<p className="truncate text-2xs text-muted-foreground">
					{primary?.name ?? "—"} · {secondary?.name ?? "—"}
				</p>
			</div>
			{ranksLoading ? (
				<Skeleton className="h-8 w-24" />
			) : (
				<div className={cn("flex w-28 shrink-0 items-center gap-2", side === "red" && "flex-row-reverse")}>
					<RankEmblem tier={rank?.tier} size={28} />
					<div className={cn("leading-tight", side === "red" && "text-right")}>
						<p className="text-xs font-semibold" style={{ color: rank ? RANK_COLORS[rank.tier] : undefined }}>
							{rank ? formatRankLabel(rank.tier, rank.rank) : "Unranked"}
						</p>
						{rank && (
							<p className="text-3xs text-muted-foreground">
								<span className={rank.winRate >= 50 ? "text-win" : "text-loss"}>{rank.winRate}%</span> · {rank.games}G
							</p>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
```

`ChampionIcon` takes the DDragon champion id (`champion.id`, for example "MonkeyKing"), the same as the old live page's `getChampionIcon(version, champ.id)`.

- [ ] **Step 3: Scoreboard**

`src/components/live/live-scoreboard.tsx`:

```tsx
import { cn } from "@/lib/utils";
import { BansRow } from "@/components/shared/scoreboard/bans-row";
import { Panel } from "@/components/ui/panel";
import { type Champion, RANK_COLORS } from "@/lib/icon-helpers";
import { playerRankSummary, splitTeams, teamAvgRank } from "@/lib/live/live-game";
import { formatRankLabel } from "@/lib/rank-calculator";
import { type RuneMaps } from "@/lib/summoner/match-row";
import { type LiveGame } from "@/lib/validators/live-game";
import { type RankedEntry } from "@/lib/validators/ranked";
import { LiveRow } from "./live-row";

function TeamLabel({ side, avg }: { side: "blue" | "red"; avg: { tier: string; rank: string } | null }) {
	return (
		<span className={cn("flex items-center gap-2 text-xs", side === "red" && "flex-row-reverse")}>
			<span className={cn("font-bold", side === "blue" ? "text-team-blue" : "text-team-red")}>{side.toUpperCase()}</span>
			{avg && (
				<span className="text-muted-foreground">
					avg <span style={{ color: RANK_COLORS[avg.tier] }}>{formatRankLabel(avg.tier, avg.rank)}</span>
				</span>
			)}
		</span>
	);
}

/** Mirrored 5v5 of a live game with each team's average rank on top and the bans below. */
export function LiveScoreboard({
	game,
	version,
	champions,
	runeData,
	ranks,
	ranksLoading,
	highlightPuuid,
}: {
	game: Pick<LiveGame, "participants" | "bannedChampions" | "gameQueueConfigId">;
	version: string;
	champions?: Record<number, Champion>;
	runeData?: RuneMaps;
	ranks?: Record<string, RankedEntry[]>;
	ranksLoading: boolean;
	highlightPuuid: string;
}) {
	const { rows } = splitTeams(game.participants);
	const queueId = game.gameQueueConfigId;
	const blue = game.participants.filter((p) => p.teamId === 100);
	const red = game.participants.filter((p) => p.teamId === 200);
	const bans = (teamId: number) => game.bannedChampions.filter((b) => b.teamId === teamId && b.championId > 0).map((b) => b.championId);
	const row = (p: (typeof rows)[number]["blue"], side: "blue" | "red") => (
		<LiveRow
			key={p?.puuid ?? `${side}-empty`}
			participant={p}
			side={side}
			version={version}
			champions={champions}
			runeData={runeData}
			rank={p ? playerRankSummary(ranks?.[p.puuid], queueId) : null}
			ranksLoading={ranksLoading}
			highlighted={!!p && p.puuid === highlightPuuid}
		/>
	);

	return (
		<Panel>
			<div className="flex items-center justify-between border-b px-3 py-2">
				<TeamLabel side="blue" avg={teamAvgRank(blue, ranks, queueId)} />
				<TeamLabel side="red" avg={teamAvgRank(red, ranks, queueId)} />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2">
				<div className="divide-y divide-border/50">{rows.map((r) => row(r.blue, "blue"))}</div>
				<div className="divide-y divide-border/50 border-t md:border-l md:border-t-0">{rows.map((r) => row(r.red, "red"))}</div>
			</div>
			<BansRow blueBans={bans(100)} redBans={bans(200)} version={version} champions={champions} />
		</Panel>
	);
}
```

Check `BansRow`'s props in `src/components/shared/scoreboard/bans-row.tsx`. It takes `blueBans: number[]`, `redBans: number[]`, `version`, `champions` and optional `children`, so pass the champion ids as above. Its tooltips need a `TooltipProvider` above; `LiveGame` provides one in Task 3.

- [ ] **Step 4: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: 0.

---

### Task 3: Live page shell

**Files:**
- Create: `src/components/live/live-game.tsx`
- Rewrite: `src/app/summoner/[name]/live/page.tsx`

**Interfaces:**
- Consumes: Task 2 components; `useSummonerContext` (`puuid`, `gameName`, `tagLine`, `basePath`, `version`); `useLiveGame`, `useChampions`, `useRunes`, `usePlayerRanks`.
- Produces: `LiveGame()`.

- [ ] **Step 1: Island**

`src/components/live/live-game.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSummonerContext } from "@/components/summoner/shell/summoner-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useChampions } from "@/hooks/useChampions";
import { useLiveGame } from "@/hooks/useLiveGame";
import { usePlayerRanks } from "@/hooks/usePlayerRanks";
import { useRunes } from "@/hooks/useRunes";
import { LiveHero } from "./live-hero";
import { LiveScoreboard } from "./live-scoreboard";

/** Live page: hero with timer and the mirrored 5v5, or an empty state with a link back when the player is not in a game. */
export function LiveGame() {
	const { puuid, gameName, tagLine, basePath, version } = useSummonerContext();
	const { data: live, isLoading, isError } = useLiveGame(puuid);
	const { data: champions } = useChampions();
	const { data: runeData } = useRunes();
	const puuids = useMemo(() => live?.participants?.map((p) => p.puuid), [live?.participants]);
	const { data: ranks, isLoading: ranksLoading } = usePlayerRanks(puuids);

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-36" />
				<Skeleton className="h-80" />
			</div>
		);
	}

	if (isError || !live?.inGame || !live.participants) {
		return (
			<Panel>
				<EmptyState
					title={isError ? "Live game unavailable" : "Not in a game right now"}
					description={isError ? "Riot could not be reached. Try again in a minute." : `${gameName}#${tagLine} is not playing at the moment.`}
					action={
						<Link href={basePath} className="text-sm font-medium text-primary hover:underline">
							&larr; Back to profile
						</Link>
					}
				/>
			</Panel>
		);
	}

	const me = live.participants.find((p) => p.puuid === puuid);
	const championName = me ? champions?.[me.championId]?.id : undefined;

	return (
		<TooltipProvider delayDuration={200}>
			<div className="space-y-4">
				<LiveHero game={live} championName={championName} playerLabel={`${gameName}#${tagLine}`} />
				<LiveScoreboard
					game={{ participants: live.participants, bannedChampions: live.bannedChampions ?? [], gameQueueConfigId: live.gameQueueConfigId ?? 0 }}
					version={version}
					champions={champions}
					runeData={runeData}
					ranks={ranks}
					ranksLoading={ranksLoading}
					highlightPuuid={puuid}
				/>
			</div>
		</TooltipProvider>
	);
}
```

- [ ] **Step 2: Page**

Replace `src/app/summoner/[name]/live/page.tsx` with:

```tsx
import { LiveGame } from "@/components/live/live-game";

/** Live game tab content; the summoner layout above provides the profile hero and context. */
export default function LivePage() {
	return <LiveGame />;
}
```

If the other tab pages (for example `lp/page.tsx`) wrap their content in a container, look at how one of them renders its client component and use the same wrapper here.

- [ ] **Step 3: Typecheck, tests, lint**

Run: `pnpm exec tsc --noEmit && pnpm test && pnpm exec eslint src 2>&1 | tail -3`
Expected:
- tsc 0;
- tests PASS;
- eslint shows 4 errors instead of the baseline 5, because the live page's setState-in-effect error is gone.

---

### Task 4: 404, error and cleanup

**Files:**
- Create: `src/components/errors/error-screen.tsx`
- Rewrite: `src/app/not-found.tsx`, `src/app/error.tsx`
- Delete, only if `grep` shows no importers:
  - `src/components/ui/back-button.tsx`
  - `src/components/ui/card.tsx`
  - `src/components/ui/loader.tsx`
  - `src/components/ui/accordion.tsx`
  - `src/components/ui/badge.tsx`

**Interfaces:**
- Produces: `ErrorScreen({ code?, title, description, splash?, children })`.

- [ ] **Step 1: Shared screen**

`src/components/errors/error-screen.tsx`:

```tsx
import { HeroBanner } from "@/components/ui/hero-banner";
import { getChampionSplash } from "@/lib/icon-helpers";

/** Full-width message screen with an optional champion splash, a big code or title and action buttons below. */
export function ErrorScreen({
	code,
	title,
	description,
	splash,
	children,
}: {
	code?: string;
	title: string;
	description: string;
	splash?: string;
	children?: React.ReactNode;
}) {
	return (
		<HeroBanner splashUrl={splash ? getChampionSplash(splash) : null} objectPosition="center 30%" className="min-h-[70vh] border-b">
			<div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
				{code && <p className="text-7xl font-bold tracking-tight text-primary">{code}</p>}
				<h1 className="text-2xl font-bold text-foreground">{title}</h1>
				<p className="text-muted-foreground">{description}</p>
				{children && <div className="mt-2 flex w-full flex-col items-center gap-3">{children}</div>}
			</div>
		</HeroBanner>
	);
}
```

- [ ] **Step 2: Pages**

`src/app/not-found.tsx`:

```tsx
import Link from "next/link";
import { ErrorScreen } from "@/components/errors/error-screen";
import SummonerSearch from "@/components/search/summoner-search";
import { Button } from "@/components/ui/button";

/** 404: Teemo splash, a short line, Go home and a summoner search. */
export default function NotFound() {
	return (
		<ErrorScreen code="404" title="This page vanished into the fog of war" description="The link may be old, or the page never existed." splash="Teemo">
			<Button asChild>
				<Link href="/">Go home</Link>
			</Button>
			<div className="w-full max-w-md rounded-xl border bg-background/85 p-3 backdrop-blur-md">
				<SummonerSearch compact />
			</div>
		</ErrorScreen>
	);
}
```

`src/app/error.tsx`:

```tsx
"use client";

import Link from "next/link";
import { ErrorScreen } from "@/components/errors/error-screen";
import { Button } from "@/components/ui/button";

/** Route error boundary: Try again re-renders the segment, Go home leaves it. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
	return (
		<ErrorScreen title="Something went wrong" description="The Riot API or our server did not respond. It usually works again in a moment.">
			<div className="flex gap-2">
				<Button onClick={reset}>Try again</Button>
				<Button asChild variant="outline">
					<Link href="/">Go home</Link>
				</Button>
			</div>
		</ErrorScreen>
	);
}
```

The error page no longer prints `error.message` to visitors, because it can leak internals. The `digest` still reaches the server logs through Next.

- [ ] **Step 3: Summoner not-found and maintenance (verify only)**

`src/app/summoner/not-found.tsx` already matches the spec, with a panel, an EmptyState and the search box. `src/components/layout/maintenance-screen.tsx` was restyled in Phase 0. Make no code change; check both in Task 5.

- [ ] **Step 4: Remove unused primitives**

Run: `for f in back-button card loader accordion badge; do printf "%s: " $f; grep -rln "components/ui/$f\"" src | grep -v "src/components/ui/$f.tsx" | wc -l; done`
Expected: `0` for each. Delete only the ones with 0:

```bash
git rm src/components/ui/back-button.tsx src/components/ui/card.tsx src/components/ui/loader.tsx src/components/ui/accordion.tsx src/components/ui/badge.tsx
```

Adjust the list to the grep result. Then run `pnpm exec tsc --noEmit`, expecting 0. If a package such as `@radix-ui/react-accordion` is now unused, leave `package.json` alone, because dependency pruning is out of scope.

---

### Task 5: Verify, review, commit

- [ ] **Step 1: Full checks**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm exec eslint src && pnpm run build`
Expected:
- tests PASS;
- tsc 0;
- eslint shows 4 errors (the baseline minus the live page);
- the build succeeds.

- [ ] **Step 2: Browser check (own tab)**

- **`/summoner/<stored profile>/live`** for a player who is not in game: the "Not in a game right now" panel with a working back link, under the summoner hero and tabs.
- **A profile that is in game**, only if the live banner is showing on a stored profile:
  - the hero shows the splash, a ticking timer and the queue/map;
  - the mirrored rows have spells, runes, rank, WR and games;
  - the team averages and bans show;
  - your own row is highlighted.
  If no stored profile is in game, note it in the ledger and rely on the code review for the in-game path.
- **`/does-not-exist`:** the Teemo 404, Go home works, and the search box shows suggestions without being clipped.
- **Error screen:** temporarily throw in a test route, or check `error.tsx` renders through a component test. If neither is cheap, review it visually by reading the code and note that in the ledger.
- **`/summoner/<non-existent>`:** do not open this. It would trigger a Riot lookup. Review `summoner/not-found.tsx` by reading it.
- **All pages:** in light mode, at 375px and at 2560px; no console errors.

- [ ] **Step 3: Commit (after the pre-commit review and its fix pass)**

```bash
git add -A
git status --short   # confirm no .env, .superpowers/ or test_matches.json staged
git commit -m "$(cat <<'EOF'
feat(live): live game redesign and error pages (Phase 6)

- Live page (design A): champion splash hero with a pulsing LIVE timer,
  queue and map; mirrored 5v5 with spells, rune trees, rank emblem, WR
  and games; team average ranks and bans; Ranked 5s and Flex aware;
  not-in-game empty state with a link back to the profile
- Timer on useNow (no setState in an effect)
- 404 (Teemo, Go home, summoner search) and error page (Try again,
  Go home) on a shared ErrorScreen
- Unused primitives removed (back button, card, loader, accordion, badge)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```
