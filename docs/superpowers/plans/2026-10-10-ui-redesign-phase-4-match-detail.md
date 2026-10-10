# UI Redesign Phase 4 — Match Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/match/[id]?puuid=` as design A, a single page modelled on League of Graphs. From top to bottom:
1. A splash hero.
2. The mirrored scoreboard with bans.
3. Team gold advantage and damage charts.
4. A 5 vs 5 player selector.
5. Player tabs: Overview, Fighting, Farming, Objectives and Vision.

Arena matches keep a hero plus the Arena scoreboard.

**Architecture:**
- `page.tsx` becomes a server component. It awaits `params` and `searchParams`, which are Promises in Next 16, and renders one client island, `MatchDetail`.
- Every derived number lives in the new tested helper `src/lib/match/detail.ts`. This covers the player lookup, the timeline participant id, the result, the shares and the stat groups.
- The existing chart and timeline components are kept. Only their `Card` shell is swapped for the `Panel` primitive.
- The old `team-table`, `player-details`, `match-info`, `team-summary` and `arena-leaderboard` are replaced and deleted.

**Tech Stack:** Next.js 16.2.1 App Router, TanStack Query 5, recharts 3, Tailwind 4 tokens, shadcn, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-10-ui-redesign-design.md`. See §3 "Match detail (A, single page)", §1 "Hero splash source" and the §2 component layout under `match/`. The mockup is `.superpowers/brainstorm/214-1791637784/content/match-detail.html`, option A.

## Global Constraints

- Package manager: `pnpm` only.
- Comments: JSDoc and single-line inline comments only.
- Use `<img>` for external images, shadcn components where one exists, and no emoji.
- Components stay small; a file around 200 lines is a signal to split it.
- Use Phase 0 tokens and primitives (`Panel`, `PanelHeader`, `PanelBody`, `EmptyState`, `StatRing`, `HeroBanner`, `ChampionIcon`, `Skeleton`). No new colors.
- Hero splash: the `?puuid` player's champion, from `getChampionSplash(championName)`.
- Ranked 5s (queue 710 → `RANKED_PREMADE_5x5`) must use 5s ranks on this page. The mapping is `rankedQueueForQueueId` from `src/lib/ranked-queues.ts`.
- Commits: one commit at the end (Task 5), after the pre-commit review.
- Verification: check the page in the Browser pane in dark mode, light mode and at 375px.

## Review Focus

1. **`?puuid` missing, or not a player in this match.**
   - Expected: the page renders. The hero uses the first participant's splash and shows no result, and the selector defaults to the first participant.
   - Test: `findParticipant` / `defaultSelectedPuuid` (Task 1).
2. **No timeline,** either because it was never stored or Riot failed.
   - Expected: the scoreboard and damage chart still render, and timeline-based tabs show an EmptyState instead of a blank area.
   - Covered in Task 3 by the `timeline` guards in the tab components and the browser check.
3. **Remake (under 5 minutes).**
   - Expected: the hero says "Remake" in a neutral tone, not Defeat.
   - Test: `matchResult` (Task 1).
4. **A team with 0 kills, 0 damage or 0 gold.**
   - Expected: shares read 0 and never `NaN`.
   - Test: `playerShares` (Task 1).
5. **A Ranked 5s match.**
   - Expected: the average rank in the hero and the scoreboard ranks use `RANKED_PREMADE_5x5` entries.
   - Test: `calculateAvgRank` (Task 1). The scoreboard uses `rankedQueueForQueueId` (Task 4).

---

### Task 1: Match detail helpers and the 5s average rank

**Files:**
- Create: `src/lib/match/detail.ts`, `src/lib/match/detail.test.ts`
- Modify: `src/lib/rank-calculator.ts`
- Create: `src/lib/rank-calculator.test.ts`

**Interfaces:**
- Produces:
  - `findParticipant(match: Match, puuid: string | undefined): Participant | undefined`
  - `defaultSelectedPuuid(match: Match, puuid: string | undefined): string`
  - `participantIdOf(match: Match, puuid: string): number | null`
  - `type MatchResult = "Victory" | "Defeat" | "Remake"`
  - `matchResult(match: Match, player: Participant): MatchResult`
  - `interface PlayerShares { damageShare: number; goldShare: number; killParticipation: number; csPerMin: number; visionScore: number }`
  - `playerShares(match: Match, player: Participant): PlayerShares`
  - `interface StatLine { label: string; value: string }`
  - `type StatGroupKey = "damage" | "survivability" | "income" | "vision" | "combat"`
  - `playerStatGroups(player: Participant, durationSeconds: number): Record<StatGroupKey, StatLine[]>`
  - `calculateAvgRank`, which now maps queue 710 to `RANKED_PREMADE_5x5`

- [ ] **Step 1: Write the failing tests**

`src/lib/match/detail.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeMatch, makeParticipant } from "@/test/factories";
import { defaultSelectedPuuid, findParticipant, matchResult, participantIdOf, playerShares, playerStatGroups } from "./detail";

const blue = [
	makeParticipant({ puuid: "a", teamId: 100, kills: 4, assists: 2, totalDamageDealtToChampions: 20000, goldEarned: 10000, visionScore: 30 }),
	makeParticipant({ puuid: "b", teamId: 100, kills: 6, totalDamageDealtToChampions: 30000, goldEarned: 10000 }),
];
const red = [makeParticipant({ puuid: "c", teamId: 200, win: false })];
const match = makeMatch({ participants: [...blue, ...red], gameDuration: 1800 });

describe("findParticipant / defaultSelectedPuuid", () => {
	it("finds the ?puuid player", () => {
		expect(findParticipant(match, "b")?.puuid).toBe("b");
		expect(defaultSelectedPuuid(match, "b")).toBe("b");
	});

	it("falls back to the first participant for a missing or foreign puuid", () => {
		expect(findParticipant(match, undefined)).toBeUndefined();
		expect(findParticipant(match, "zzz")).toBeUndefined();
		expect(defaultSelectedPuuid(match, "zzz")).toBe("a");
		expect(defaultSelectedPuuid(match, undefined)).toBe("a");
	});
});

describe("participantIdOf", () => {
	it("is the 1-based position in info.participants", () => {
		expect(participantIdOf(match, "a")).toBe(1);
		expect(participantIdOf(match, "c")).toBe(3);
	});

	it("is null for a player not in the match", () => {
		expect(participantIdOf(match, "zzz")).toBeNull();
	});
});

describe("matchResult", () => {
	it("reads the player's win flag", () => {
		expect(matchResult(match, blue[0])).toBe("Victory");
		expect(matchResult(match, red[0])).toBe("Defeat");
	});

	it("calls games under five minutes a remake", () => {
		expect(matchResult(makeMatch({ participants: blue, gameDuration: 240 }), blue[0])).toBe("Remake");
	});
});

describe("playerShares", () => {
	it("divides by the player's own team", () => {
		expect(playerShares(match, blue[0])).toEqual({ damageShare: 40, goldShare: 50, killParticipation: 60, csPerMin: 0, visionScore: 30 });
	});

	it("never returns NaN for a team with nothing", () => {
		const empty = makeParticipant({ puuid: "x", teamId: 100, totalDamageDealtToChampions: 0, goldEarned: 0 });
		const shares = playerShares(makeMatch({ participants: [empty], gameDuration: 0 }), empty);
		expect(shares).toEqual({ damageShare: 0, goldShare: 0, killParticipation: 0, csPerMin: 0, visionScore: empty.visionScore });
	});
});

describe("playerStatGroups", () => {
	it("formats per-minute values and clocks", () => {
		const p = makeParticipant({ totalDamageDealtToChampions: 18000, goldEarned: 12000, timeCCingOthers: 75, totalTimeSpentDead: 130 });
		const groups = playerStatGroups(p, 1800);
		expect(groups.damage).toContainEqual({ label: "DPM", value: "600" });
		expect(groups.income).toContainEqual({ label: "Gold/min", value: "400" });
		expect(groups.combat).toContainEqual({ label: "CC time", value: "1:15" });
		expect(groups.combat).toContainEqual({ label: "Time dead", value: "2:10" });
	});

	it("lists multikills only when there are any", () => {
		expect(playerStatGroups(makeParticipant(), 1800).combat.map((s) => s.label)).not.toContain("Multikills");
		expect(playerStatGroups(makeParticipant({ doubleKills: 2, pentaKills: 1 }), 1800).combat).toContainEqual({
			label: "Multikills",
			value: "2× Double, 1× Penta",
		});
	});

	it("does not divide by a zero duration", () => {
		expect(playerStatGroups(makeParticipant({ goldEarned: 500 }), 0).income).toContainEqual({ label: "Gold/min", value: "0" });
	});
});
```

`src/lib/rank-calculator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateAvgRank } from "./rank-calculator";

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

const ranks = {
	a: [entry("RANKED_SOLO_5x5", "DIAMOND", "I"), entry("RANKED_PREMADE_5x5", "GOLD", "II")],
	b: [entry("RANKED_SOLO_5x5", "DIAMOND", "I"), entry("RANKED_PREMADE_5x5", "GOLD", "II")],
};

describe("calculateAvgRank", () => {
	it("uses solo ranks for solo games", () => {
		expect(calculateAvgRank(ranks, 420)?.tier).toBe("DIAMOND");
	});

	it("uses Ranked 5s ranks for queue 710", () => {
		expect(calculateAvgRank(ranks, 710)).toMatchObject({ tier: "GOLD", rank: "II" });
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/lib/match/detail.test.ts src/lib/rank-calculator.test.ts`
Expected: FAIL. `./detail` cannot be resolved, and the queue 710 average is `DIAMOND` instead of `GOLD`.

- [ ] **Step 3: Implement**

`src/lib/match/detail.ts`:

```ts
import { csPerMinute, formatDuration } from "@/lib/format";
import { killParticipation } from "@/lib/summoner/match-row";
import { type Match, type Participant } from "@/lib/validators/match";

const REMAKE_SECONDS = 300;

export type MatchResult = "Victory" | "Defeat" | "Remake";

/** The participant with `puuid`, if that player is in the match. */
export function findParticipant(match: Match, puuid: string | undefined): Participant | undefined {
	return puuid ? match.info.participants.find((p) => p.puuid === puuid) : undefined;
}

/** Player the selector starts on: `?puuid` when they played, else the first participant. */
export function defaultSelectedPuuid(match: Match, puuid: string | undefined): string {
	return findParticipant(match, puuid)?.puuid ?? match.info.participants[0]?.puuid ?? "";
}

/** Timeline participant id (1-10): position in `info.participants` plus one; null when absent. */
export function participantIdOf(match: Match, puuid: string): number | null {
	const index = match.info.participants.findIndex((p) => p.puuid === puuid);
	return index === -1 ? null : index + 1;
}

/** One player's result; games under five minutes are remakes. */
export function matchResult(match: Match, player: Participant): MatchResult {
	if (match.info.gameDuration < REMAKE_SECONDS) return "Remake";
	return player.win ? "Victory" : "Defeat";
}

export interface PlayerShares {
	damageShare: number;
	goldShare: number;
	killParticipation: number;
	csPerMin: number;
	visionScore: number;
}

const percentOf = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

/** Share of the player's team damage and gold, kill participation, CS per minute and vision score. */
export function playerShares(match: Match, player: Participant): PlayerShares {
	const team = match.info.participants.filter((p) => p.teamId === player.teamId);
	const total = (pick: (p: Participant) => number) => team.reduce((sum, p) => sum + pick(p), 0);
	return {
		damageShare: percentOf(player.totalDamageDealtToChampions, total((p) => p.totalDamageDealtToChampions)),
		goldShare: percentOf(player.goldEarned, total((p) => p.goldEarned)),
		killParticipation: killParticipation(player, match.info.participants),
		csPerMin: csPerMinute(player.totalMinionsKilled + player.neutralMinionsKilled, match.info.gameDuration),
		visionScore: player.visionScore,
	};
}

export interface StatLine {
	label: string;
	value: string;
}

export type StatGroupKey = "damage" | "survivability" | "income" | "vision" | "combat";

const number = (n: number) => n.toLocaleString("en-US");

/** The player's detailed stats grouped for the player tabs; per-minute values are 0 for a zero duration. */
export function playerStatGroups(player: Participant, durationSeconds: number): Record<StatGroupKey, StatLine[]> {
	const minutes = durationSeconds / 60;
	const perMinute = (n: number) => (minutes > 0 ? number(Math.round(n / minutes)) : "0");
	const cs = player.totalMinionsKilled + player.neutralMinionsKilled;
	const multikills = [
		[player.doubleKills, "Double"],
		[player.tripleKills, "Triple"],
		[player.quadraKills, "Quadra"],
		[player.pentaKills, "Penta"],
	]
		.filter(([count]) => (count as number) > 0)
		.map(([count, name]) => `${count}× ${name}`);

	return {
		damage: [
			{ label: "To champions", value: number(player.totalDamageDealtToChampions) },
			{ label: "Physical", value: number(player.physicalDamageDealtToChampions) },
			{ label: "Magic", value: number(player.magicDamageDealtToChampions) },
			{ label: "True", value: number(player.trueDamageDealtToChampions) },
			{ label: "DPM", value: perMinute(player.totalDamageDealtToChampions) },
		],
		survivability: [
			{ label: "Damage taken", value: number(player.totalDamageTaken) },
			{ label: "Self mitigated", value: number(player.damageSelfMitigated) },
			{ label: "Healing", value: number(player.totalHeal) },
			{ label: "Shielded allies", value: number(player.totalDamageShieldedOnTeammates) },
			{ label: "Healed allies", value: number(player.totalHealsOnTeammates) },
		],
		income: [
			{ label: "Gold", value: number(player.goldEarned) },
			{ label: "Gold/min", value: perMinute(player.goldEarned) },
			{ label: "CS", value: number(cs) },
			{ label: "CS/min", value: String(csPerMinute(cs, durationSeconds)) },
		],
		vision: [
			{ label: "Vision score", value: number(player.visionScore) },
			{ label: "Wards placed", value: number(player.wardsPlaced) },
			{ label: "Wards killed", value: number(player.wardsKilled) },
			{ label: "Control wards", value: number(player.visionWardsBoughtInGame) },
		],
		combat: [
			{ label: "Largest spree", value: number(player.largestKillingSpree) },
			...(multikills.length > 0 ? [{ label: "Multikills", value: multikills.join(", ") }] : []),
			{ label: "Turrets", value: number(player.turretKills) },
			{ label: "Dragons", value: number(player.dragonKills) },
			{ label: "Barons", value: number(player.baronKills) },
			{ label: "CC time", value: formatDuration(player.timeCCingOthers) },
			{ label: "Time dead", value: formatDuration(player.totalTimeSpentDead) },
			...(player.firstBloodKill ? [{ label: "First blood", value: "Yes" }] : []),
			...(player.firstTowerKill ? [{ label: "First tower", value: "Yes" }] : []),
		],
	};
}
```

`src/lib/rank-calculator.ts`:
- Add `import { rankedQueueForQueueId } from "@/lib/ranked-queues";`.
- Replace the two-line `relevantQueue` expression with:

```ts
	const relevantQueue = rankedQueueForQueueId(queueId) ?? "RANKED_SOLO_5x5";
```

If `makeParticipant` lacks any field used above, such as `physicalDamageDealtToChampions`, `doubleKills`, `firstBloodKill` or `visionWardsBoughtInGame`, add it with a zero or false default in `src/test/factories.ts`. The schema already requires all of them. If the factory omitted one, `tsc` would have flagged the factory, so check the factory first.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/match/detail.test.ts src/lib/rank-calculator.test.ts`
Expected: PASS

---

### Task 2: Restyle the chart and timeline shells as Panels

**Files:**
- Modify:
  - `src/components/match/gold-chart.tsx`
  - `src/components/match/damage-chart.tsx`
  - `src/components/match/vision-chart.tsx`
  - `src/components/match/kill-timeline.tsx`
  - `src/components/match/cs-gold-chart.tsx`
  - `src/components/match/objectives-timeline.tsx`

**Interfaces:**
- Produces: the same default exports and props. Only the outer shell changes.

The six files share one shell:

```tsx
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
					TITLE
				</CardTitle>
			</CardHeader>
			<CardContent>
			...
			</CardContent>
		</Card>
```

| File | Title |
|---|---|
| gold-chart | "Gold Advantage" → "Team gold advantage" |
| damage-chart | "Damage to Champions" → "Damage dealt" |
| vision-chart | "Vision Score" |
| kill-timeline | "Kills Over Time" → "Kills over time" |
| cs-gold-chart | "CS & Total Gold" → "CS & total gold" |
| objectives-timeline | "Objectives & Events" → "Objectives & events" |

- [ ] **Step 1: Swap the shell with a script**

```bash
python - <<'EOF'
import re
TITLES = {
    "gold-chart": "Team gold advantage",
    "damage-chart": "Damage dealt",
    "vision-chart": "Vision score",
    "kill-timeline": "Kills over time",
    "cs-gold-chart": "CS & total gold",
    "objectives-timeline": "Objectives & events",
}
for name, title in TITLES.items():
    p = f"src/components/match/{name}.tsx"
    s = open(p, encoding="utf-8").read()
    s = s.replace('import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";',
                  'import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";')
    s, n = re.subn(r"<Card>\s*<CardHeader>\s*<CardTitle[^>]*>\s*[^<]+?\s*</CardTitle>\s*</CardHeader>\s*<CardContent>",
                   f'<Panel>\n\t\t\t<PanelHeader title="{title}" />\n\t\t\t<PanelBody>', s)
    assert n == 1, (p, n)
    s, n = re.subn(r"</CardContent>\s*</Card>", "</PanelBody>\n\t\t</Panel>", s)
    assert n == 1, (p, n)
    open(p, "w", encoding="utf-8", newline="\n").write(s)
EOF
```

- [ ] **Step 2: Verify no Card shell is left and types still hold**

Run: `grep -l "components/ui/card" src/components/match/*.tsx; pnpm exec tsc --noEmit`
Expected:
- `grep` prints only files outside this task: `team-table.tsx`, `player-details.tsx`, `match-info.tsx`, `team-summary.tsx` or `arena-leaderboard.tsx`, if any of them use `Card`. Task 5 deletes those.
- `tsc` exits 0.

- [ ] **Step 3: Run tests**

Run: `pnpm test`
Expected: PASS (no test touches these files; this step is the regression net).

---

### Task 3: Player selector and player tabs

**Files:**
- Create:
  - `src/components/match/player-selector.tsx`
  - `src/components/match/player-tabs/player-tabs.tsx`
  - `src/components/match/player-tabs/stat-list.tsx`
  - `src/components/match/player-tabs/rune-page.tsx`
  - `src/components/match/player-tabs/overview-tab.tsx`
  - `src/components/match/player-tabs/fighting-tab.tsx`
  - `src/components/match/player-tabs/farming-tab.tsx`
  - `src/components/match/player-tabs/objectives-tab.tsx`
  - `src/components/match/player-tabs/vision-tab.tsx`

**Interfaces:**
- Consumes: Task 1 helpers; the existing `ItemBuild`, `SkillOrder`, `KillMap`, `KillTimeline`, `CsGoldChart`, `ObjectivesTimeline` and `VisionChart` (the last four reskinned in Task 2); `MatchBadges` from `@/components/summoner/matches/match-badges`; `StatRing`; `RuneMaps` from `@/lib/summoner/match-row`.
- Produces:
  - `PlayerSelector({ match, version, selected, onSelect })`
  - `PlayerTabs({ match, timeline, player, participantId, version, runeData, itemNames, badgeIds })`

- [ ] **Step 1: Selector**

`src/components/match/player-selector.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { getChampionDisplayName } from "@/lib/icon-helpers";
import { type Match } from "@/lib/validators/match";

/** 5 vs 5 champion buttons; the selected player gets the gold ring. */
export function PlayerSelector({
	match,
	version,
	selected,
	onSelect,
}: {
	match: Match;
	version: string;
	selected: string;
	onSelect: (puuid: string) => void;
}) {
	const teams = [100, 200].map((teamId) => match.info.participants.filter((p) => p.teamId === teamId));

	return (
		<div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Select player">
			{teams.map((team, index) => (
				<div key={index} className={cn("flex gap-1.5", index === 1 && "sm:ml-4")}>
					{team.map((p) => (
						<button
							key={p.puuid}
							type="button"
							onClick={() => onSelect(p.puuid)}
							aria-pressed={p.puuid === selected}
							title={`${p.riotIdGameName} · ${getChampionDisplayName(p.championName)}`}
							className={cn(
								"rounded-md border-2 transition-colors",
								p.puuid === selected ? "border-gold" : "border-transparent opacity-70 hover:opacity-100",
							)}
						>
							<ChampionIcon version={version} championName={p.championName} size={36} />
						</button>
					))}
				</div>
			))}
		</div>
	);
}
```

(Check `ChampionIcon`'s prop names in `src/components/ui/champion-icon.tsx` before writing. If its size prop or class prop differs, follow its signature. `border-gold` is the Phase 0 token used by the scoreboard highlight; if it is named differently in `globals.css`, use that name.)

- [ ] **Step 2: Shared pieces**

`src/components/match/player-tabs/stat-list.tsx`:

```tsx
import { type StatLine } from "@/lib/match/detail";

/** Titled label/value rows for one stat group. */
export function StatList({ title, stats }: { title: string; stats: StatLine[] }) {
	return (
		<div>
			<p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
			<dl className="space-y-1 text-sm">
				{stats.map((s) => (
					<div key={s.label} className="flex justify-between gap-3">
						<dt className="text-muted-foreground">{s.label}</dt>
						<dd className="font-medium tabular-nums text-foreground">{s.value}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}
```

`src/components/match/player-tabs/rune-page.tsx` (moved out of `player-details.tsx`, using `<img>`):

```tsx
import { getRuneIcon } from "@/lib/icon-helpers";
import { type RuneMaps } from "@/lib/summoner/match-row";
import { type Participant } from "@/lib/validators/match";

/** Primary and secondary rune trees with each selected rune. */
export function RunePage({ player, runeData }: { player: Participant; runeData?: RuneMaps }) {
	if (!runeData) return null;
	const trees = ["primaryStyle", "subStyle"]
		.map((description) => player.perks.styles.find((s) => s.description === description))
		.filter((style) => style !== undefined);

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			{trees.map((style) => (
				<div key={style.description}>
					<p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{runeData.styles.get(style.style)?.name ?? "Runes"}
					</p>
					<ul className="space-y-1.5">
						{style.selections.map((selection) => {
							const rune = runeData.runes.get(selection.perk);
							if (!rune) return null;
							return (
								<li key={selection.perk} className="flex items-center gap-2 text-sm">
									<img src={getRuneIcon(rune.icon)} alt="" width={24} height={24} className="size-6" />
									<span className="text-foreground">{rune.name}</span>
								</li>
							);
						})}
					</ul>
				</div>
			))}
		</div>
	);
}
```

- [ ] **Step 3: The five tabs**

All the tabs share one prop shape:

```ts
export interface PlayerTabProps {
	match: Match;
	timeline?: Timeline;
	player: Participant;
	participantId: number;
	version: string;
	runeData?: RuneMaps;
	itemNames?: Map<number, string>;
	badgeIds: string[];
}
```

Put `PlayerTabProps` in `player-tabs.tsx` and export it from there. Each tab imports it as a type.

`overview-tab.tsx`:

```tsx
import { useMemo } from "react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { StatRing } from "@/components/ui/stat-ring";
import { MatchBadges } from "@/components/summoner/matches/match-badges";
import ItemBuild from "@/components/match/item-build";
import SkillOrder from "@/components/match/skill-order";
import { playerShares } from "@/lib/match/detail";
import { RunePage } from "./rune-page";
import { type PlayerTabProps } from "./player-tabs";

/** Badges, share rings, item build, skill order and runes of the selected player. */
export function OverviewTab({ match, timeline, player, participantId, version, runeData, itemNames, badgeIds }: PlayerTabProps) {
	const shares = useMemo(() => playerShares(match, player), [match, player]);

	return (
		<div className="space-y-4">
			<Panel>
				<PanelBody className="space-y-4">
					{badgeIds.length > 0 && (
						<div className="flex justify-center">
							<MatchBadges badgeIds={badgeIds} />
						</div>
					)}
					<div className="flex flex-wrap justify-around gap-4">
						<StatRing label="Damage share" value={shares.damageShare} display={`${shares.damageShare}%`} />
						<StatRing label="Gold share" value={shares.goldShare} display={`${shares.goldShare}%`} color="var(--gold)" />
						<StatRing label="KP" value={shares.killParticipation} display={`${shares.killParticipation}%`} color="var(--win)" />
						<StatRing label="CS/min" value={shares.csPerMin} max={10} display={shares.csPerMin} color="var(--team-blue)" />
						<StatRing label="Vision" value={shares.visionScore} max={100} display={shares.visionScore} color="var(--muted-foreground)" />
					</div>
				</PanelBody>
			</Panel>
			<Panel>
				<PanelHeader title="Item build" />
				<PanelBody>
					<ItemBuild timeline={timeline} participantId={participantId} version={version} itemNames={itemNames} />
				</PanelBody>
			</Panel>
			<div className="grid gap-4 lg:grid-cols-2">
				<Panel>
					<PanelHeader title="Skill order" />
					<PanelBody>
						<SkillOrder timeline={timeline} participantId={participantId} />
					</PanelBody>
				</Panel>
				<Panel>
					<PanelHeader title="Runes" />
					<PanelBody>
						<RunePage player={player} runeData={runeData} />
					</PanelBody>
				</Panel>
			</div>
		</div>
	);
}
```

`fighting-tab.tsx`:

```tsx
import { useMemo } from "react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import KillMap from "@/components/match/kill-map";
import KillTimeline from "@/components/match/kill-timeline";
import { playerStatGroups } from "@/lib/match/detail";
import { StatList } from "./stat-list";
import { type PlayerTabProps } from "./player-tabs";

/** Damage, survivability and combat stats, team kills over time and the player's kill map. */
export function FightingTab({ match, timeline, player, participantId, version }: PlayerTabProps) {
	const groups = useMemo(() => playerStatGroups(player, match.info.gameDuration), [player, match]);

	return (
		<div className="space-y-4">
			<Panel>
				<PanelBody className="grid gap-6 sm:grid-cols-3">
					<StatList title="Damage" stats={groups.damage} />
					<StatList title="Survivability" stats={groups.survivability} />
					<StatList title="Combat" stats={groups.combat} />
				</PanelBody>
			</Panel>
			<KillTimeline timeline={timeline} participants={match.info.participants} />
			<Panel>
				<PanelHeader title="Kill map" />
				<PanelBody className="flex justify-center">
					<KillMap timeline={timeline} participantId={participantId} version={version} />
				</PanelBody>
			</Panel>
		</div>
	);
}
```

`farming-tab.tsx`:

```tsx
import { useMemo } from "react";
import { Panel, PanelBody } from "@/components/ui/panel";
import CsGoldChart from "@/components/match/cs-gold-chart";
import { playerStatGroups } from "@/lib/match/detail";
import { StatList } from "./stat-list";
import { type PlayerTabProps } from "./player-tabs";

/** Income stats of the player and team CS and gold over time. */
export function FarmingTab({ match, timeline, player }: PlayerTabProps) {
	const groups = useMemo(() => playerStatGroups(player, match.info.gameDuration), [player, match]);

	return (
		<div className="space-y-4">
			<Panel>
				<PanelBody className="max-w-sm">
					<StatList title="Income" stats={groups.income} />
				</PanelBody>
			</Panel>
			<CsGoldChart timeline={timeline} />
		</div>
	);
}
```

`objectives-tab.tsx`:

```tsx
import ObjectivesTimeline from "@/components/match/objectives-timeline";
import { type PlayerTabProps } from "./player-tabs";

/** The match's objective, tower and kill events. */
export function ObjectivesTab({ match, timeline, version }: PlayerTabProps) {
	return <ObjectivesTimeline timeline={timeline} participants={match.info.participants} version={version} />;
}
```

`vision-tab.tsx`:

```tsx
import { useMemo } from "react";
import { Panel, PanelBody } from "@/components/ui/panel";
import VisionChart from "@/components/match/vision-chart";
import { playerStatGroups } from "@/lib/match/detail";
import { StatList } from "./stat-list";
import { type PlayerTabProps } from "./player-tabs";

/** Vision stats of the player and every player's vision score. */
export function VisionTab({ match, player }: PlayerTabProps) {
	const groups = useMemo(() => playerStatGroups(player, match.info.gameDuration), [player, match]);

	return (
		<div className="space-y-4">
			<Panel>
				<PanelBody className="max-w-sm">
					<StatList title="Vision" stats={groups.vision} />
				</PanelBody>
			</Panel>
			<VisionChart participants={match.info.participants} />
		</div>
	);
}
```

- [ ] **Step 4: Tab bar with the no-timeline guard**

`src/components/match/player-tabs/player-tabs.tsx`:

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { type RuneMaps } from "@/lib/summoner/match-row";
import { type Match, type Participant } from "@/lib/validators/match";
import { type Timeline } from "@/lib/validators/timeline";
import { FarmingTab } from "./farming-tab";
import { FightingTab } from "./fighting-tab";
import { ObjectivesTab } from "./objectives-tab";
import { OverviewTab } from "./overview-tab";
import { VisionTab } from "./vision-tab";

export interface PlayerTabProps {
	match: Match;
	timeline?: Timeline;
	player: Participant;
	participantId: number;
	version: string;
	runeData?: RuneMaps;
	itemNames?: Map<number, string>;
	badgeIds: string[];
}

const TABS = [
	{ id: "overview", label: "Overview", needsTimeline: false, Component: OverviewTab },
	{ id: "fighting", label: "Fighting", needsTimeline: false, Component: FightingTab },
	{ id: "farming", label: "Farming", needsTimeline: false, Component: FarmingTab },
	{ id: "objectives", label: "Objectives", needsTimeline: true, Component: ObjectivesTab },
	{ id: "vision", label: "Vision", needsTimeline: false, Component: VisionTab },
] as const;

/** Tab bar for the selected player's Overview, Fighting, Farming, Objectives and Vision views. */
export function PlayerTabs(props: PlayerTabProps) {
	const [active, setActive] = useState<(typeof TABS)[number]["id"]>("overview");
	const tab = TABS.find((t) => t.id === active) ?? TABS[0];

	return (
		<div className="space-y-4">
			<Panel>
				<div role="tablist" aria-label="Player details" className="flex gap-5 overflow-x-auto px-4">
					{TABS.map((t) => (
						<button
							key={t.id}
							type="button"
							role="tab"
							aria-selected={t.id === active}
							onClick={() => setActive(t.id)}
							className={cn(
								"-mb-px border-b-2 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
								t.id === active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
							)}
						>
							{t.label}
						</button>
					))}
				</div>
			</Panel>
			{tab.needsTimeline && !props.timeline ? (
				<Panel>
					<EmptyState title="Timeline not available" description="Riot did not return a timeline for this match." />
				</Panel>
			) : (
				<tab.Component {...props} />
			)}
		</div>
	);
}
```

Ruling built into this design: Overview, Fighting, Farming and Vision still have player stats without a timeline. Their timeline-only parts (item build, skill order, kill map, kills over time, CS and gold) render nothing when the timeline is missing, because each existing component returns `null` without one. Objectives is entirely timeline-based, so it gets the EmptyState.

- [ ] **Step 5: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: exit 0. If `import type` cycles between `player-tabs.tsx` and the tab files cause a lint warning, keep them type-only, because type imports do not create runtime cycles.

---

### Task 4: Match page shell, hero, scoreboard, team charts and the Arena variant

**Files:**
- Modify (rewrite): `src/app/match/[id]/page.tsx`
- Create:
  - `src/components/match/match-detail.tsx`
  - `src/components/match/match-hero.tsx`
  - `src/components/match/team-charts.tsx`

**Interfaces:**
- Consumes: Task 1 helpers, Task 3 `PlayerSelector`/`PlayerTabs`, `MirroredScoreboard`, `buildScoreboard`, `ArenaScoreboard`, `rankedQueueForQueueId`, `calculateAvgRank`, `formatRankLabel`.
- Produces: `MatchDetail({ matchId, puuid }: { matchId: string; puuid?: string })`.

- [ ] **Step 1: Server page**

`src/app/match/[id]/page.tsx`:

```tsx
import { MatchDetail } from "@/components/match/match-detail";

/** Match detail: the route only unwraps params; the page is one client island. */
export default async function MatchPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ puuid?: string }>;
}) {
	const { id } = await params;
	const { puuid } = await searchParams;
	return <MatchDetail matchId={id} puuid={puuid} />;
}
```

- [ ] **Step 2: Hero**

`src/components/match/match-hero.tsx`:

```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";
import { HeroBanner } from "@/components/ui/hero-banner";
import { formatDuration } from "@/lib/format";
import { getChampionSplash } from "@/lib/icon-helpers";
import { type MatchResult } from "@/lib/match/detail";
import { getQueueName } from "@/lib/queue-names";
import { formatRankLabel } from "@/lib/rank-calculator";
import { toSummonerSlug } from "@/lib/riot-id";
import { type Match, type Participant } from "@/lib/validators/match";

const RESULT_TONE: Record<MatchResult, string> = {
	Victory: "text-win",
	Defeat: "text-loss",
	Remake: "text-muted-foreground",
};

/** Splash of the searched player's champion with queue, result, duration, date and the average rank. */
export function MatchHero({
	match,
	player,
	result,
	avgRank,
}: {
	match: Match;
	player: Participant | undefined;
	result: MatchResult | null;
	avgRank: { tier: string; rank: string } | null;
}) {
	const splashChampion = player?.championName ?? match.info.participants[0]?.championName;
	const date = new Date(match.info.gameCreation).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

	return (
		<HeroBanner splashUrl={splashChampion ? getChampionSplash(splashChampion) : null} className="rounded-lg border">
			<div className="flex min-h-36 flex-col justify-end gap-1 p-5">
				{player && (
					<Link
						href={`/summoner/${toSummonerSlug(player.riotIdGameName, player.riotIdTagline)}`}
						className="mb-auto text-xs font-medium text-primary hover:underline"
					>
						&larr; {player.riotIdGameName}#{player.riotIdTagline}
					</Link>
				)}
				<h1 className="text-2xl font-bold text-foreground">{getQueueName(match.info.queueId, match.info.gameMode)}</h1>
				<p className="text-sm text-muted-foreground">
					{result && <span className={cn("font-semibold", RESULT_TONE[result])}>{result} · </span>}
					{formatDuration(match.info.gameDuration)} · {date}
					{avgRank && ` · Avg. ${formatRankLabel(avgRank.tier, avgRank.rank)}`}
				</p>
			</div>
		</HeroBanner>
	);
}
```

(Check `toSummonerSlug`'s signature in `src/lib/riot-id.ts`. The old `arena-leaderboard.tsx` calls it, so copy its call form exactly.)

- [ ] **Step 3: Team charts**

`src/components/match/team-charts.tsx`:

```tsx
import DamageChart from "@/components/match/damage-chart";
import GoldChart from "@/components/match/gold-chart";
import { type Match } from "@/lib/validators/match";
import { type Timeline } from "@/lib/validators/timeline";

/** Team gold advantage and damage dealt side by side; gold needs the timeline. */
export function TeamCharts({ match, timeline }: { match: Match; timeline?: Timeline }) {
	return (
		<div className={timeline ? "grid gap-4 lg:grid-cols-2" : ""}>
			<GoldChart timeline={timeline} />
			<DamageChart participants={match.info.participants} />
		</div>
	);
}
```

- [ ] **Step 4: Orchestrator**

`src/components/match/match-detail.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MirroredScoreboard } from "@/components/shared/scoreboard/mirrored-scoreboard";
import { ArenaScoreboard } from "@/components/summoner/matches/arena-scoreboard";
import { useChampions } from "@/hooks/useChampions";
import { useDDragonVersion } from "@/hooks/useDDragonVersion";
import { useItems } from "@/hooks/useItems";
import { useMatch } from "@/hooks/useMatch";
import { useMatchBadgesBatch } from "@/hooks/useMatchBadges";
import { usePlayerRanks } from "@/hooks/usePlayerRanks";
import { useRunes } from "@/hooks/useRunes";
import { useTimeline } from "@/hooks/useTimeline";
import { isArenaMatch } from "@/lib/arena-helpers";
import { defaultSelectedPuuid, findParticipant, matchResult, participantIdOf } from "@/lib/match/detail";
import { calculateAvgRank } from "@/lib/rank-calculator";
import { rankedQueueForQueueId } from "@/lib/ranked-queues";
import { buildScoreboard } from "@/lib/summoner/scoreboard";
import { MatchHero } from "./match-hero";
import { PlayerSelector } from "./player-selector";
import { PlayerTabs } from "./player-tabs/player-tabs";
import { TeamCharts } from "./team-charts";

/** Match detail A: hero, mirrored scoreboard, team charts, player selector and player tabs; Arena gets hero plus leaderboard. */
export function MatchDetail({ matchId, puuid }: { matchId: string; puuid?: string }) {
	const { data: match, isLoading, isError } = useMatch(matchId);
	const { data: timeline } = useTimeline(matchId);
	const { data: version } = useDDragonVersion();
	const { data: runeData } = useRunes();
	const { data: itemNames } = useItems();
	const { data: champions } = useChampions();
	const puuids = useMemo(() => match?.info.participants.map((p) => p.puuid), [match]);
	const { data: ranks } = usePlayerRanks(puuids);
	const { data: badges } = useMatchBadgesBatch([matchId]);
	const [picked, setPicked] = useState<string | null>(null);

	if (isLoading || (!match && !isError) || !version) {
		return (
			<div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
				<Skeleton className="h-36" />
				<Skeleton className="h-96" />
			</div>
		);
	}
	if (!match) {
		return (
			<div className="mx-auto max-w-6xl px-4 py-6">
				<Panel>
					<EmptyState
						title="Match not found"
						description="It may be too old or Riot could not be reached."
						action={
							<Link href="/" className="text-sm font-medium text-primary hover:underline">
								Back to search
							</Link>
						}
					/>
				</Panel>
			</div>
		);
	}

	const searched = findParticipant(match, puuid);
	const result = searched ? matchResult(match, searched) : null;
	const avgRank = calculateAvgRank(ranks, match.info.queueId);
	const selected = picked ?? defaultSelectedPuuid(match, puuid);
	const player = findParticipant(match, selected);
	const participantId = participantIdOf(match, selected);
	const badgeIds = (badges?.[matchId] ?? []).filter((b) => b.puuid === selected).map((b) => b.badgeId);
	const hero = <MatchHero match={match} player={searched} result={result} avgRank={avgRank} />;

	if (isArenaMatch(match.info.queueId)) {
		return (
			<div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
				{hero}
				<Panel>
					<ArenaScoreboard participants={match.info.participants} version={version} highlightPuuid={puuid ?? ""} />
				</Panel>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
			{hero}
			<Panel>
				<MirroredScoreboard
					data={buildScoreboard(match)}
					version={version}
					highlightPuuid={puuid}
					ranks={ranks}
					rankQueue={rankedQueueForQueueId(match.info.queueId) ?? "RANKED_SOLO_5x5"}
					champions={champions}
				/>
			</Panel>
			<TeamCharts match={match} timeline={timeline} />
			<PlayerSelector match={match} version={version} selected={selected} onSelect={setPicked} />
			{player && participantId !== null && (
				<PlayerTabs
					match={match}
					timeline={timeline}
					player={player}
					participantId={participantId}
					version={version}
					runeData={runeData}
					itemNames={itemNames}
					badgeIds={badgeIds}
				/>
			)}
		</div>
	);
}
```

Notes for this step:
- `useMemo` for `puuids` runs before the early returns, so hook order is stable.
- `buildScoreboard(match)` is cheap and runs only after the early returns, so it needs no memo.
- If `MirroredScoreboard` renders the bans row itself through `data`, nothing else is needed. If bans only appear with a `footer`, pass nothing; the page has no "Full match" link.
- Check that `EmptyState` accepts `description` and `action` by reading `src/components/ui/empty-state.tsx`. `champion-detail.tsx` uses `action`, so it does.

- [ ] **Step 5: Typecheck and tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected:
- tsc exits 0. The old page's imports are gone, so nothing references `framer-motion`, `Loader` or `BackButton` from it.
- Tests PASS.

---

### Task 5: Remove the replaced components, verify and commit

**Files:**
- Delete:
  - `src/components/match/team-table.tsx`
  - `src/components/match/player-details.tsx`
  - `src/components/match/match-info.tsx`
  - `src/components/match/team-summary.tsx`
  - `src/components/match/arena-leaderboard.tsx`

- [ ] **Step 1: Confirm they are unused, then delete**

Run: `grep -rn "match/team-table\|match/player-details\|match/match-info\|match/team-summary\|match/arena-leaderboard" src`
Expected: no output. If the live page imports one of them, keep that file, note it for Phase 6 in the ledger as a Ruling, and delete the rest.

```bash
git rm src/components/match/team-table.tsx src/components/match/player-details.tsx src/components/match/match-info.tsx src/components/match/team-summary.tsx src/components/match/arena-leaderboard.tsx
```

Adjust this list to the Step 1 result.

- [ ] **Step 2: Full checks**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm exec eslint src && pnpm run build`
Expected:
- tests PASS;
- tsc 0;
- eslint shows only the 5 baseline errors (a deleted file may remove one of them, which is fine);
- build OK.

- [ ] **Step 3: Browser check (Browser pane, dev server on :3000)**

1. **Ranked SR game:** open it from a profile's expanded row via "Full match →". Check:
   - the hero shows the player's splash, the queue, a coloured result, duration, date and average rank;
   - the scoreboard has bans;
   - the gold and damage charts sit side by side;
   - the selector starts on the searched player with a gold ring;
   - each of the 5 tabs renders;
   - switching player updates the tabs.
2. **Ranked 5s game (queue 710), if one is stored:** the scoreboard ranks and the average rank are 5s ranks.
3. **Arena game:** the hero plus the Arena leaderboard.
4. **Same URL without `?puuid`:** the hero shows no result and the selector starts on the first player.
5. **Unknown id `/match/EUN1_0`:** the "Match not found" panel.
6. **Light mode and 375px width:** no horizontal page scroll, and the scoreboard stays usable.
7. **Console:** no hydration errors.

- [ ] **Step 4: Commit (after the pre-commit review and its fix pass)**

```bash
git add -A
git status --short   # confirm no .env, .superpowers/ or test_matches.json staged
git commit -m "$(cat <<'EOF'
feat(match): match detail page redesign (design A)

- Server route with one client island; splash hero with queue, result,
  duration, date and average rank (Ranked 5s aware)
- Mirrored scoreboard with bans, team gold advantage and damage charts
- 5 vs 5 player selector and Overview / Fighting / Farming / Objectives /
  Vision player tabs with share rings, stat groups, runes, item build and
  skill order
- Arena matches: hero plus the Arena leaderboard
- Charts and timelines restyled as Panels; old team table, player details,
  match info, team summary and arena leaderboard removed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```
