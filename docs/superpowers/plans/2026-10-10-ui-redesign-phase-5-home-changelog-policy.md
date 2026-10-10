# UI Redesign Phase 5 — Home, Changelog and Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add search-as-you-type suggestions to the summoner search, rebuild the home page as design B, and restyle the changelog list, changelog detail and privacy policy in the redesign system. The home page has four parts:
- a hero with splash, logo, search and local history chips;
- a "Recently searched" panel;
- a "Free rotation" panel;
- a "What's new" panel.

**Architecture:**
- `app/page.tsx`, `app/changelog/*` and `app/policy/page.tsx` become server components.
- Only the parts that need state or React Query are client islands: the search, the history chips, recently searched and free rotation.
- Derived values sit in small tested helpers:
  - `src/lib/changelog/summary.ts` for category counts and grouping;
  - `src/lib/home/format.ts` for rank labels and rotation champions.
- The old `layout/badges.tsx` category badges and the framer-motion changelog card are replaced by the `Chip` primitive and plain server-rendered markup.

**Tech Stack:** Next.js 16.2.1 App Router, TanStack Query 5, Tailwind 4 tokens, shadcn (`Table`), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-10-ui-redesign-design.md` §3 "Home (option B)" and "Changelog, policy, errors, maintenance". Mockups: `.superpowers/brainstorm/214-1791637784/content/home.html` (option B) and `misc-pages.html` (sections 1–3).

Scope changed in chat on 2026-10-10: the changelog and policy move from Phase 6 into this phase. Phase 6 keeps the live page, 404, error and summoner not-found. The user also asked for search-as-you-type on 2026-10-10 (Task 2). Riot has no name-prefix search; account-v1 only resolves an exact `Name#TAG`. Suggestions therefore come from our `Account` table (2109 rows, and an `ILIKE` prefix scan takes about 4 ms, so no index is needed). A full Riot ID that is not in the DB gets a "Look up Name#TAG" row that opens the profile, and the profile loader then fetches the summoner from Riot.

## Global Constraints

- **Tooling and code style:**
  - Package manager: `pnpm` only.
  - Comments are JSDoc or single-line inline only. JSX `{/* */}` comments are not allowed.
  - Use `<img>` for external images, shadcn components where one exists, no emoji, and keep files to roughly 200 lines at most.
- **Sizing:**
  - Icons are rem-sized through `remSize` or rem classes, never px.
  - Small text uses `text-2xs` / `text-3xs`.
- **Colors:**
  - Use tokens only.
  - Changelog category chips use the chart palette hexes from `globals.css`: feature `#b05ad6`, improvement `#34c38f`, fix `#e9b949`, design `#4f8fe6`. `Chip` takes a hex.
- **Interaction:** no keyboard navigation work (user rule).
- **Hero splash:** Ahri, from `getChampionSplash("Ahri")`.
- **Recent searches:**
  - The hero chips come from local search history (the existing `SearchHistory`).
  - The "Recently searched" panel is server-wide, from `/api/recent-searches`, and shows the solo rank.
- **What's new:** the newest changelog entry from `changelogs[0]` in `src/components/changelog/registry.ts`.
- **Commits:** one commit at the end, after the pre-commit review.
- **Verification:** check every page in the Browser pane in dark mode, light mode, at 375px and at 2560px.

## Review Focus

1. **Empty data.** A fresh database has no recent searches, Riot's rotation may be unavailable, and local history may be empty.
   - Expected: each panel shows its own empty state, and the page never collapses or throws.
   - Test: `recentSearchRank(null tier)` and `rotationChampions(unknown ids)` (Task 1); the panels guard themselves (Task 3).
2. **Rotation ids the DDragon champion map doesn't know yet** (a new champion).
   - Expected: those ids are skipped, and the rest are shown sorted by name.
   - Test: `rotationChampions` (Task 1).
3. **Changelog entries with only some categories, or with tables and images.**
   - Expected: only the categories that exist appear, in a fixed order, with correct counts. Tables and images still render.
   - Test: `categoryCounts` and `groupChanges` (Task 1); the browser check covers the rest (Task 7).
4. **An unknown changelog slug.**
   - Expected: `notFound()` as today.
   - This is unchanged code, kept in Task 4.
5. **Narrow and wide screens.** The policy table of contents must not squeeze the text on mobile, and the home panels must stack.
   - Expected: on mobile the TOC sits above the text, not sticky; panels are one column below `lg`.
   - Covered by the browser check at 375px and 2560px (Task 7).

6. **Search input edge cases:** one character, only `#`, `%` or `_` in the text, a name with spaces or accents, and a full `Name#TAG` that is not stored.
   - Expected:
     - fewer than 2 name characters makes no request;
     - wildcards are matched literally;
     - accents are kept;
     - an unknown full Riot ID shows the "Look up" row.
   - Test: `parseSearchTerms` / `lookupCandidate` (Task 2). Prisma `startsWith` escapes wildcards.

---

### Task 1: Changelog and home helpers

**Files:**
- Create: `src/lib/changelog/summary.ts`, `src/lib/changelog/summary.test.ts`
- Create: `src/lib/home/format.ts`, `src/lib/home/format.test.ts`

**Interfaces:**
- Produces:
  - `type ChangeCategory = "feature" | "improvement" | "fix" | "design"`
  - `CATEGORY_META: Record<ChangeCategory, { label: string; plural: string; color: string }>`
  - `categoryCounts(entry: ChangelogEntry): { category: ChangeCategory; count: number }[]`
  - `groupChanges(entry: ChangelogEntry): { category: ChangeCategory; items: ChangelogEntry["changes"] }[]`
  - `recentSearchRank(r: RecentSearch): string`
  - `rotationChampions(ids: number[], champions: Record<number, Champion> | undefined): Champion[]`

- [ ] **Step 1: Write the failing tests**

`src/lib/changelog/summary.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { type ChangelogEntry } from "@/components/changelog/changelog-type";
import { categoryCounts, groupChanges } from "./summary";

const entry: ChangelogEntry = {
	slug: "x",
	title: "X",
	date: "2026-10-10",
	summary: "",
	changes: [
		{ category: "fix", title: "f1", description: "" },
		{ category: "feature", title: "a1", description: "" },
		{ category: "fix", title: "f2", description: "" },
		{ category: "feature", title: "a2", description: "" },
	],
};

describe("categoryCounts", () => {
	it("counts only present categories in feature, improvement, design, fix order", () => {
		expect(categoryCounts(entry)).toEqual([
			{ category: "feature", count: 2 },
			{ category: "fix", count: 2 },
		]);
	});
});

describe("groupChanges", () => {
	it("groups in the same order and keeps item order inside a group", () => {
		expect(groupChanges(entry).map((g) => [g.category, g.items.map((i) => i.title)])).toEqual([
			["feature", ["a1", "a2"]],
			["fix", ["f1", "f2"]],
		]);
	});
});
```

`src/lib/home/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { recentSearchRank, rotationChampions } from "./format";

const search = (soloTier: string | null, soloRank: string | null, soloLp: number | null) => ({
	puuid: "p",
	gameName: "Skaikru",
	tagLine: "HEAVN",
	profileIconId: 1,
	soloTier,
	soloRank,
	soloLp,
});

describe("recentSearchRank", () => {
	it("formats tier, division and LP", () => {
		expect(recentSearchRank(search("EMERALD", "I", 42))).toBe("Emerald I · 42 LP");
	});

	it("drops the division for apex tiers", () => {
		expect(recentSearchRank(search("MASTER", "I", 212))).toBe("Master · 212 LP");
	});

	it("is Unranked without a solo entry", () => {
		expect(recentSearchRank(search(null, null, null))).toBe("Unranked");
	});
});

describe("rotationChampions", () => {
	const champions = {
		266: { id: "Aatrox", key: "266", name: "Aatrox" },
		103: { id: "Ahri", key: "103", name: "Ahri" },
	};

	it("maps ids to champions sorted by name and skips unknown ids", () => {
		expect(rotationChampions([103, 999, 266], champions).map((c) => c.name)).toEqual(["Aatrox", "Ahri"]);
	});

	it("is empty while the champion map is loading", () => {
		expect(rotationChampions([103], undefined)).toEqual([]);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/lib/changelog src/lib/home`
Expected: FAIL. The modules cannot be resolved.

- [ ] **Step 3: Implement**

`src/lib/changelog/summary.ts`:

```ts
import { type ChangelogEntry } from "@/components/changelog/changelog-type";

export type ChangeCategory = ChangelogEntry["changes"][number]["category"];

const ORDER: ChangeCategory[] = ["feature", "improvement", "design", "fix"];

/** Label, plural heading and chip hex (chart palette) for each change category. */
export const CATEGORY_META: Record<ChangeCategory, { label: string; plural: string; color: string }> = {
	feature: { label: "Feature", plural: "Features", color: "#b05ad6" },
	improvement: { label: "Improvement", plural: "Improvements", color: "#34c38f" },
	design: { label: "Design", plural: "Design", color: "#4f8fe6" },
	fix: { label: "Fix", plural: "Fixes", color: "#e9b949" },
};

/** Categories present in an entry with their change counts, in a fixed order. */
export function categoryCounts(entry: ChangelogEntry): { category: ChangeCategory; count: number }[] {
	return ORDER.map((category) => ({ category, count: entry.changes.filter((c) => c.category === category).length })).filter((c) => c.count > 0);
}

/** An entry's changes grouped by category, same order as `categoryCounts`. */
export function groupChanges(entry: ChangelogEntry): { category: ChangeCategory; items: ChangelogEntry["changes"] }[] {
	return ORDER.map((category) => ({ category, items: entry.changes.filter((c) => c.category === category) })).filter((g) => g.items.length > 0);
}
```

`src/lib/home/format.ts`:

```ts
import { type Champion } from "@/lib/icon-helpers";
import { formatRankLabel } from "@/lib/rank-calculator";
import { type RecentSearch } from "@/lib/validators/recent-searches";

/** Solo rank of a recently searched summoner, e.g. `Emerald I · 42 LP`; `Unranked` without one. */
export function recentSearchRank(r: RecentSearch): string {
	if (!r.soloTier) return "Unranked";
	const label = formatRankLabel(r.soloTier, r.soloRank ?? "I");
	return r.soloLp === null ? label : `${label} · ${r.soloLp} LP`;
}

/** Free-rotation champion ids as champions, sorted by name; ids the map doesn't know yet are skipped. */
export function rotationChampions(ids: number[], champions: Record<number, Champion> | undefined): Champion[] {
	if (!champions) return [];
	return ids
		.map((id) => champions[id])
		.filter((c): c is Champion => !!c)
		.sort((a, b) => a.name.localeCompare(b.name));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/changelog src/lib/home`
Expected: PASS

---

### Task 2: Live summoner search (as you type)

**Files:**
- Create: `src/lib/summoner/search-query.ts`, `src/lib/summoner/search-query.test.ts`
- Create: `src/lib/summoner/search.ts`
- Create: `src/app/api/summoner-search/route.ts`
- Create: `src/hooks/useSummonerSuggestions.ts`
- Create: `src/components/search/search-suggestions.tsx`
- Modify: `src/components/search/summoner-search.tsx`

**Interfaces:**
- Consumes: `toRecentSearch` (`src/lib/recent-searches.ts`); `recentSearchSchema` / `RecentSearch`; `parseRiotId`, `toSummonerSlug`; `addSearchHistory`.
- Produces:
  - `parseSearchTerms(raw: string): { name: string; tag: string | null } | null`
  - `sortExactFirst<T extends { gameName: string }>(rows: T[], name: string): T[]`
  - `lookupCandidate(raw: string, results: { gameName: string; tagLine: string }[]): { gameName: string; tagLine: string } | null`
  - `searchSummoners(terms): Promise<RecentSearch[]>`
  - `GET /api/summoner-search?q=` → `RecentSearch[]`
  - `useSummonerSuggestions(input: string)` → `{ results, pending, terms }`
  - `SearchSuggestions({ input, results, pending, onPick })`

The request strategy follows the user's request ("not five searches for five characters"):
- A 500 ms debounce means a request only goes out once typing pauses, so a quickly typed name costs one request.
- While the user types or a request is in flight, the dropdown shows "Searching…".
- A newer query aborts the older request through the TanStack `signal`.
- Results are cached per query for 60 s, so backspacing to an earlier text makes no new request.
- `DEBOUNCE_MS` is the single knob, if the user wants 1 s.

- [ ] **Step 1: Write the failing tests**

`src/lib/summoner/search-query.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { lookupCandidate, parseSearchTerms, sortExactFirst } from "./search-query";

describe("parseSearchTerms", () => {
	it("needs at least two name characters", () => {
		expect(parseSearchTerms("S")).toBeNull();
		expect(parseSearchTerms("  #EUNE")).toBeNull();
	});

	it("splits an optional tag prefix and trims", () => {
		expect(parseSearchTerms("  Skaikru ")).toEqual({ name: "Skaikru", tag: null });
		expect(parseSearchTerms("Skaikru#HE")).toEqual({ name: "Skaikru", tag: "HE" });
		expect(parseSearchTerms("Skaikru#")).toEqual({ name: "Skaikru", tag: null });
	});

	it("keeps spaces, accents and wildcard characters literally", () => {
		expect(parseSearchTerms("Mam Velke Peró%_")).toEqual({ name: "Mam Velke Peró%_", tag: null });
	});

	it("caps very long input", () => {
		expect(parseSearchTerms("a".repeat(100))?.name).toHaveLength(40);
	});
});

describe("sortExactFirst", () => {
	it("puts case-insensitive exact name matches first, keeping the rest in order", () => {
		const rows = [{ gameName: "Skaikru2" }, { gameName: "skaikru" }, { gameName: "Skaikrux" }];
		expect(sortExactFirst(rows, "Skaikru").map((r) => r.gameName)).toEqual(["skaikru", "Skaikru2", "Skaikrux"]);
	});
});

describe("lookupCandidate", () => {
	it("offers a Riot lookup for a full Riot ID that is not in the results", () => {
		expect(lookupCandidate("Faker#KR1", [])).toEqual({ gameName: "Faker", tagLine: "KR1" });
	});

	it("offers nothing when that exact account is already listed (any case)", () => {
		expect(lookupCandidate("skaikru#heavn", [{ gameName: "Skaikru", tagLine: "HEAVN" }])).toBeNull();
	});

	it("offers nothing without a tag", () => {
		expect(lookupCandidate("Skaikru", [])).toBeNull();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/lib/summoner/search-query.test.ts`
Expected: FAIL. The module cannot be resolved.

- [ ] **Step 3: Implement the helpers, query and route**

`src/lib/summoner/search-query.ts`:

```ts
import { parseRiotId } from "@/lib/riot-id";

const MIN_NAME = 2;
const MAX_INPUT = 40;

/** Typed search text as a name prefix and optional tag prefix; null below two name characters. */
export function parseSearchTerms(raw: string): { name: string; tag: string | null } | null {
	const text = raw.trim().slice(0, MAX_INPUT);
	const separator = text.indexOf("#");
	const name = (separator === -1 ? text : text.slice(0, separator)).trim();
	if (name.length < MIN_NAME) return null;
	const tag = separator === -1 ? "" : text.slice(separator + 1).trim();
	return { name, tag: tag || null };
}

/** Rows whose name equals `name` (case-insensitive) first; otherwise the original order. */
export function sortExactFirst<T extends { gameName: string }>(rows: T[], name: string): T[] {
	const target = name.toLowerCase();
	return [...rows.filter((r) => r.gameName.toLowerCase() === target), ...rows.filter((r) => r.gameName.toLowerCase() !== target)];
}

/** A full `Name#TAG` the results don't already contain, to offer as a Riot lookup; null otherwise. */
export function lookupCandidate(raw: string, results: { gameName: string; tagLine: string }[]): { gameName: string; tagLine: string } | null {
	const riotId = parseRiotId(raw.trim());
	if (!riotId) return null;
	const listed = results.some(
		(r) => r.gameName.toLowerCase() === riotId.gameName.toLowerCase() && r.tagLine.toLowerCase() === riotId.tagLine.toLowerCase(),
	);
	return listed ? null : riotId;
}
```

`src/lib/summoner/search.ts`:

```ts
import { prisma } from "@/lib/db";
import { toRecentSearch } from "@/lib/recent-searches";
import { type RecentSearch } from "@/lib/validators/recent-searches";
import { sortExactFirst } from "./search-query";

const SUGGESTION_LIMIT = 8;

/** Stored summoners whose name (and tag, if given) starts with the typed text, exact names first, with solo rank. */
export async function searchSummoners(terms: { name: string; tag: string | null }): Promise<RecentSearch[]> {
	const rows = await prisma.account.findMany({
		where: {
			gameName: { startsWith: terms.name, mode: "insensitive" },
			...(terms.tag ? { tagLine: { startsWith: terms.tag, mode: "insensitive" } } : {}),
			summoner: { isNot: null },
		},
		orderBy: { updatedAt: "desc" },
		take: SUGGESTION_LIMIT,
		select: {
			puuid: true,
			gameName: true,
			tagLine: true,
			summoner: { select: { profileIconId: true } },
			rankedEntries: { select: { queueType: true, tier: true, rank: true, leaguePoints: true } },
		},
	});
	return sortExactFirst(rows.map(toRecentSearch).filter((r) => r !== null), terms.name);
}
```

Prisma's `startsWith` escapes `%` and `_`, so the user's text is matched literally.

`src/app/api/summoner-search/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { parseSearchTerms } from "@/lib/summoner/search-query";
import { searchSummoners } from "@/lib/summoner/search";
import { type RecentSearch } from "@/lib/validators/recent-searches";

/** Summoner name suggestions from stored accounts; short input returns an empty list without a query. */
export async function GET(req: NextRequest): Promise<NextResponse<RecentSearch[] | { error: string }>> {
	const terms = parseSearchTerms(req.nextUrl.searchParams.get("q") ?? "");
	if (!terms) return NextResponse.json([]);
	try {
		return NextResponse.json(await searchSummoners(terms), { headers: { "Cache-Control": "private, max-age=30" } });
	} catch (error) {
		console.error("[api/summoner-search] query failed:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/summoner/search-query.test.ts && pnpm exec tsc --noEmit`
Expected: PASS; tsc 0.

- [ ] **Step 5: Hook and dropdown**

`src/hooks/useSummonerSuggestions.ts`:

```ts
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { parseSearchTerms } from "@/lib/summoner/search-query";
import { recentSearchSchema, type RecentSearch } from "@/lib/validators/recent-searches";

const DEBOUNCE_MS = 500;

/** Name suggestions for the typed text: one request per typing pause, cached per query, older requests aborted. */
export function useSummonerSuggestions(input: string) {
	const [debounced, setDebounced] = useState(input);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(input), DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [input]);

	const terms = parseSearchTerms(debounced);
	const query = useQuery<RecentSearch[]>({
		queryKey: ["summoner-search", terms?.name.toLowerCase() ?? "", terms?.tag?.toLowerCase() ?? ""],
		queryFn: async ({ signal }) => {
			const res = await fetch(`/api/summoner-search?${new URLSearchParams({ q: debounced })}`, { signal });
			if (!res.ok) throw new Error("Summoner search failed");
			return z.array(recentSearchSchema).parse(await res.json());
		},
		enabled: terms !== null,
		staleTime: 60_000,
		placeholderData: keepPreviousData,
	});
	const typing = parseSearchTerms(input) !== null && input.trim() !== debounced.trim();
	return { results: terms ? (query.data ?? []) : [], pending: typing || query.isFetching, terms: parseSearchTerms(input) };
}
```

`src/components/search/search-suggestions.tsx`:

```tsx
"use client";

import { Loader2, Search } from "lucide-react";
import { useDDragonVersion } from "@/hooks/useDDragonVersion";
import { recentSearchRank } from "@/lib/home/format";
import { getSummonerIcon, RANK_COLORS } from "@/lib/icon-helpers";
import { lookupCandidate } from "@/lib/summoner/search-query";
import { type RecentSearch } from "@/lib/validators/recent-searches";

/** Dropdown of stored summoners matching the typed text, a "Searching…" row while waiting, and a Riot lookup row for an unknown full Riot ID. */
export function SearchSuggestions({
	input,
	results,
	pending,
	onPick,
}: {
	input: string;
	results: RecentSearch[];
	pending: boolean;
	onPick: (gameName: string, tagLine: string) => void;
}) {
	const { data: version } = useDDragonVersion();
	const lookup = pending ? null : lookupCandidate(input, results);

	return (
		<ul className="max-h-80 overflow-y-auto py-1">
			{pending && (
				<li className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
					<Loader2 className="size-3.5 animate-spin" />
					Searching…
				</li>
			)}
			{results.map((r) => (
				<li key={r.puuid}>
					<button
						type="button"
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => onPick(r.gameName, r.tagLine)}
						className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-accent/50"
					>
						{version && r.profileIconId !== null ? (
							<img src={getSummonerIcon(version, r.profileIconId)} alt="" width={24} height={24} className="size-6 rounded" />
						) : (
							<span className="size-6 rounded bg-muted" />
						)}
						<span className="min-w-0 flex-1 truncate text-sm text-foreground">
							{r.gameName}
							<span className="text-muted-foreground">#{r.tagLine}</span>
						</span>
						<span className="text-xs" style={{ color: r.soloTier ? RANK_COLORS[r.soloTier] : undefined }}>
							{recentSearchRank(r)}
						</span>
					</button>
				</li>
			))}
			{lookup && (
				<li>
					<button
						type="button"
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => onPick(lookup.gameName, lookup.tagLine)}
						className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-primary transition-colors hover:bg-accent/50"
					>
						<Search className="size-4" />
						Look up {lookup.gameName}#{lookup.tagLine}
					</button>
				</li>
			)}
			{!pending && results.length === 0 && !lookup && <li className="px-3 py-1.5 text-xs text-muted-foreground">No stored summoner matches. Type the full Name#TAG.</li>}
		</ul>
	);
}
```

`onMouseDown` with `preventDefault` keeps the input focused, so the dropdown doesn't close before the click lands.

- [ ] **Step 6: Wire into `SummonerSearch`**

In `src/components/search/summoner-search.tsx`:
- Add `const [focused, setFocused] = useState(false);` and `const { results, pending, terms } = useSummonerSuggestions(input);`.
- Extract the navigation into `function go(gameName: string, tagLine: string)`. It calls `addSearchHistory(`${gameName}#${tagLine}`)`, `setFocused(false)` and `router.push(`/summoner/${toSummonerSlug(gameName, tagLine)}`)`. Use it in `handleSubmit`.
- On the `Input`, add `onFocus={() => setFocused(true)}` and `onBlur={() => setFocused(false)}`.
- Inside the existing `<div className="relative flex-1">`, after the `Input`, add:

```tsx
				{focused && terms && (
					<div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover text-left shadow-lg">
						<SearchSuggestions input={input} results={results} pending={pending} onPick={go} />
					</div>
				)}
```

Import `useSummonerSuggestions` and `SearchSuggestions`. Update the JSDoc to `/** Riot ID search box with as-you-type suggestions from stored summoners; Enter or Search opens the typed Riot ID. */`. The home hero and the navbar spotlight both use this component, so both get the suggestions.

- [ ] **Step 7: Typecheck and tests**

Run: `pnpm exec tsc --noEmit && pnpm test && pnpm exec eslint src/components/search src/hooks/useSummonerSuggestions.ts src/lib/summoner src/app/api/summoner-search`
Expected: tsc 0; PASS; no new lint errors. The debounce `setState` runs inside a timeout callback, not synchronously in the effect.

---

### Task 3: Home page (design B)

**Files:**
- Create: `src/components/home/home-hero.tsx`
- Create: `src/components/home/recently-searched.tsx`
- Create: `src/components/home/free-rotation.tsx`
- Create: `src/components/home/whats-new.tsx`
- Rewrite: `src/app/page.tsx`

**Interfaces:**
- Consumes: `recentSearchRank`, `rotationChampions` (Task 1), `categoryCounts`, `CATEGORY_META` (Task 1); `useRecentSearches`, `useRotation`, `useChampions`, `useDDragonVersion`; the existing `SummonerSearch`, `SearchHistory`, `Logo`, `HeroBanner`, `ChampionIcon`, `Panel`, `EmptyState`, `Skeleton`, `Chip`.
- Produces: `HomeHero()`, `RecentlySearched()`, `FreeRotation()`, `WhatsNew({ entry })`.

- [ ] **Step 1: Hero**

`src/components/home/home-hero.tsx`:

```tsx
import { HeroBanner } from "@/components/ui/hero-banner";
import { Logo } from "@/components/layout/logo";
import SearchHistory from "@/components/search/search-history";
import SummonerSearch from "@/components/search/summoner-search";
import { getChampionSplash } from "@/lib/icon-helpers";

/** Ahri splash with the large logo, the summoner search and the local search history chips. */
export function HomeHero() {
	return (
		<HeroBanner splashUrl={getChampionSplash("Ahri")} objectPosition="center 25%" className="border-b">
			<div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 py-16 text-center sm:py-24">
				<Logo className="text-5xl sm:text-6xl" />
				<p className="text-sm text-muted-foreground">League of Legends summoner tracker · EUNE</p>
				<div className="w-full max-w-xl space-y-3">
					<SummonerSearch />
					<div className="flex justify-center">
						<SearchHistory />
					</div>
				</div>
			</div>
		</HeroBanner>
	);
}
```

- [ ] **Step 2: Panels**

`src/components/home/recently-searched.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDDragonVersion } from "@/hooks/useDDragonVersion";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { recentSearchRank } from "@/lib/home/format";
import { getSummonerIcon, RANK_COLORS } from "@/lib/icon-helpers";
import { toSummonerSlug } from "@/lib/riot-id";

/** Last summoners anyone looked up, with profile icon and solo rank, linking to their profiles. */
export function RecentlySearched() {
	const { data, isLoading, isError } = useRecentSearches();
	const { data: version } = useDDragonVersion();

	return (
		<Panel>
			<PanelHeader title="Recently searched" actions={<span className="text-xs text-muted-foreground">all users</span>} />
			{isLoading ? (
				<div className="space-y-2 p-3">
					{Array.from({ length: 5 }).map((_, i) => (
						<Skeleton key={i} className="h-9" />
					))}
				</div>
			) : isError || !data || data.length === 0 ? (
				<EmptyState title="No searches yet" description="Profiles show up here once someone looks them up." />
			) : (
				<ul className="divide-y divide-border/50">
					{data.map((r) => (
						<li key={r.puuid}>
							<Link href={`/summoner/${toSummonerSlug(r.gameName, r.tagLine)}`} className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-accent/40">
								{version && r.profileIconId !== null ? (
									<img src={getSummonerIcon(version, r.profileIconId)} alt="" width={28} height={28} className="size-7 rounded-md" />
								) : (
									<span className="size-7 rounded-md bg-muted" />
								)}
								<span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
									{r.gameName}
									<span className="text-muted-foreground">#{r.tagLine}</span>
								</span>
								<span className="text-xs font-medium" style={{ color: r.soloTier ? RANK_COLORS[r.soloTier] : undefined }}>
									{recentSearchRank(r)}
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</Panel>
	);
}
```

`src/components/home/free-rotation.tsx`:

```tsx
"use client";

import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useChampions } from "@/hooks/useChampions";
import { useDDragonVersion } from "@/hooks/useDDragonVersion";
import { useRotation } from "@/hooks/useRotation";
import { rotationChampions } from "@/lib/home/format";

/** This week's free champions as icons with their names on hover. */
export function FreeRotation() {
	const { data: rotation, isLoading, isError } = useRotation();
	const { data: champions } = useChampions();
	const { data: version } = useDDragonVersion();
	const list = rotationChampions(rotation?.freeChampionIds ?? [], champions);

	return (
		<Panel>
			<PanelHeader title="Free rotation" />
			{isLoading || (rotation && !champions) || !version ? (
				<PanelBody className="grid grid-cols-5 gap-2">
					{Array.from({ length: 10 }).map((_, i) => (
						<Skeleton key={i} className="aspect-square" />
					))}
				</PanelBody>
			) : isError || list.length === 0 ? (
				<EmptyState title="Rotation unavailable" description="Riot did not return this week's free champions." />
			) : (
				<TooltipProvider delayDuration={150}>
					<PanelBody className="grid grid-cols-5 gap-2">
						{list.map((c) => (
							<Tooltip key={c.key}>
								<TooltipTrigger asChild>
									<span className="cursor-pointer">
										<ChampionIcon version={version} championName={c.id} size={44} className="w-full" />
									</span>
								</TooltipTrigger>
								<TooltipContent>{c.name}</TooltipContent>
							</Tooltip>
						))}
					</PanelBody>
				</TooltipProvider>
			)}
		</Panel>
	);
}
```

`ChampionIcon` sets an inline width and height from `size`. Inside the 5-column grid, pass `size={44}` and let the grid cell size it. If the inline size overrides `w-full`, drop `className="w-full"`; the grid stays centered either way. Check this visually in Task 7.

`src/components/home/whats-new.tsx`:

```tsx
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { type ChangelogEntry } from "@/components/changelog/changelog-type";
import { CATEGORY_META, categoryCounts } from "@/lib/changelog/summary";

/** The newest changelog entry with its summary and category counts, linking to the full entry. */
export function WhatsNew({ entry }: { entry: ChangelogEntry | undefined }) {
	return (
		<Panel>
			<PanelHeader
				title="What's new"
				actions={
					<Link href="/changelog" className="text-xs font-medium text-primary hover:underline">
						Changelog &rarr;
					</Link>
				}
			/>
			{entry ? (
				<PanelBody className="space-y-2">
					<p className="text-xs text-muted-foreground">
						{new Date(entry.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
					</p>
					<Link href={`/changelog/${entry.slug}`} className="block text-base font-semibold text-foreground hover:text-primary">
						{entry.title}
					</Link>
					<p className="line-clamp-3 text-sm text-muted-foreground">{entry.summary}</p>
					<div className="flex flex-wrap gap-1.5 pt-1">
						{categoryCounts(entry).map(({ category, count }) => (
							<Chip key={category} color={CATEGORY_META[category].color}>
								{count} {count === 1 ? CATEGORY_META[category].label.toLowerCase() : CATEGORY_META[category].plural.toLowerCase()}
							</Chip>
						))}
					</div>
				</PanelBody>
			) : (
				<PanelBody className="text-sm text-muted-foreground">No changes published yet.</PanelBody>
			)}
		</Panel>
	);
}
```

- [ ] **Step 3: Page**

Replace `src/app/page.tsx` with:

```tsx
import { changelogs } from "@/components/changelog/registry";
import { FreeRotation } from "@/components/home/free-rotation";
import { HomeHero } from "@/components/home/home-hero";
import { RecentlySearched } from "@/components/home/recently-searched";
import { WhatsNew } from "@/components/home/whats-new";

/** Home (design B): hero search, then recently searched, free rotation and what's new. */
export default function Home() {
	return (
		<>
			<HomeHero />
			<div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 lg:grid-cols-3">
				<RecentlySearched />
				<FreeRotation />
				<WhatsNew entry={changelogs[0]} />
			</div>
		</>
	);
}
```

`SummonerSearch` and `SearchHistory` are client components imported into server components. That is allowed, because they carry `"use client"`.

- [ ] **Step 4: Typecheck and tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: tsc 0; PASS.

---

### Task 4: Changelog list and detail

**Files:**
- Create: `src/components/changelog/page/changelog-timeline-item.tsx`
- Rewrite:
  - `src/components/changelog/page/changelog-detail.tsx`
  - `src/components/changelog/page/changelog-table.tsx`
  - `src/app/changelog/page.tsx`
  - `src/app/changelog/[slug]/page.tsx`
- Delete: `src/components/changelog/page/changelog-card.tsx`, `src/components/layout/badges.tsx`

**Interfaces:**
- Consumes: `categoryCounts`, `groupChanges`, `CATEGORY_META` (Task 1).
- Produces: `ChangelogTimelineItem({ entry, latest })`, `ChangelogDetail({ entry })` (named export), `ChangelogTable({ rows })`.

- [ ] **Step 1: List item and page**

`src/components/changelog/page/changelog-timeline-item.tsx`:

```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";
import { type ChangelogEntry } from "../changelog-type";
import { CATEGORY_META, categoryCounts } from "@/lib/changelog/summary";

const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

/** One changelog entry on the vertical timeline: date, then a card with title, summary and category count chips. */
export function ChangelogTimelineItem({ entry, latest }: { entry: ChangelogEntry; latest: boolean }) {
	return (
		<li className="relative pb-8 pl-8 last:pb-0">
			<span className="absolute bottom-0 left-[0.4rem] top-5 w-px bg-border" />
			<span className={cn("absolute left-0 top-1.5 size-3.5 rounded-full border-2 border-background", latest ? "bg-primary" : "bg-muted-foreground")} />
			<p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{longDate(entry.date)}</p>
			<Link href={`/changelog/${entry.slug}`} className="group block rounded-lg border bg-card p-5 transition-colors hover:border-primary/40">
				<h2 className="text-lg font-bold text-foreground transition-colors group-hover:text-primary">{entry.title}</h2>
				<p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{entry.summary}</p>
				<div className="mt-3 flex flex-wrap gap-1.5">
					{categoryCounts(entry).map(({ category, count }) => (
						<Chip key={category} color={CATEGORY_META[category].color}>
							{count} {count === 1 ? CATEGORY_META[category].label.toLowerCase() : CATEGORY_META[category].plural.toLowerCase()}
						</Chip>
					))}
				</div>
			</Link>
		</li>
	);
}
```

The last timeline line is hidden by `last:pb-0` plus the line's `bottom-0` on the last item. If the line still sticks out below the final card, add `[&:last-child>span:first-child]:hidden` to the `li`.

`src/app/changelog/page.tsx`:

```tsx
import { changelogs } from "@/components/changelog/registry";
import { ChangelogTimelineItem } from "@/components/changelog/page/changelog-timeline-item";

/** Changelog list: every entry on a vertical timeline, newest first. */
export default function ChangelogPage() {
	return (
		<div className="mx-auto max-w-3xl px-4 py-10">
			<h1 className="text-3xl font-bold tracking-tight text-foreground">Changelog</h1>
			<p className="mt-1 text-muted-foreground">New features, improvements and fixes in Summon.gg</p>
			<ol className="mt-8">
				{changelogs.map((entry, i) => (
					<ChangelogTimelineItem key={entry.slug} entry={entry} latest={i === 0} />
				))}
			</ol>
		</div>
	);
}
```

- [ ] **Step 2: Detail, table and page**

`src/components/changelog/page/changelog-table.tsx`:

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Achievement or badge requirements of a change as a name/requirement table. */
export function ChangelogTable({ rows }: { rows: { name: string; requirement: string }[] }) {
	return (
		<div className="mt-3 overflow-hidden rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Requirement</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows.map((row) => (
						<TableRow key={row.name}>
							<TableCell className="whitespace-nowrap font-medium text-foreground">{row.name}</TableCell>
							<TableCell className="text-muted-foreground">{row.requirement}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
```

`src/components/changelog/page/changelog-detail.tsx`:

```tsx
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { type ChangelogEntry } from "../changelog-type";
import { CATEGORY_META, categoryCounts, groupChanges } from "@/lib/changelog/summary";
import { ChangelogTable } from "./changelog-table";

/** One changelog entry: back link, date, title, summary and count chips, then one panel per category. */
export function ChangelogDetail({ entry }: { entry: ChangelogEntry }) {
	return (
		<div className="space-y-6">
			<div>
				<Link href="/changelog" className="text-xs font-medium text-primary hover:underline">
					&larr; Changelog
				</Link>
				<p className="mt-4 text-sm text-muted-foreground">
					{new Date(entry.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
				</p>
				<h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">{entry.title}</h1>
				<p className="mt-3 text-muted-foreground">{entry.summary}</p>
				<div className="mt-4 flex flex-wrap gap-1.5">
					{categoryCounts(entry).map(({ category, count }) => (
						<a key={category} href={`#${category}`}>
							<Chip color={CATEGORY_META[category].color}>
								{count} {count === 1 ? CATEGORY_META[category].label.toLowerCase() : CATEGORY_META[category].plural.toLowerCase()}
							</Chip>
						</a>
					))}
				</div>
			</div>
			{groupChanges(entry).map(({ category, items }) => (
				<Panel key={category} id={category} className="scroll-mt-20">
					<PanelHeader
						title={
							<span className="flex items-center gap-2">
								<span className="size-2 rounded-full" style={{ background: CATEGORY_META[category].color }} />
								{CATEGORY_META[category].plural}
								<span className="text-xs font-normal text-muted-foreground">{items.length}</span>
							</span>
						}
					/>
					<ul className="divide-y divide-border/50">
						{items.map((change) => (
							<li key={change.title} className="px-4 py-4">
								<h3 className="font-semibold text-foreground">{change.title}</h3>
								<p className="mt-1 text-sm leading-relaxed text-muted-foreground">{change.description}</p>
								{change.img && <img src={change.img} alt={change.title} className="mt-3 w-full rounded-md border" />}
								{change.table && <ChangelogTable rows={change.table} />}
							</li>
						))}
					</ul>
				</Panel>
			))}
		</div>
	);
}
```

`src/app/changelog/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { ChangelogDetail } from "@/components/changelog/page/changelog-detail";
import { changelogs, getChangelog } from "@/components/changelog/registry";

export function generateStaticParams() {
	return changelogs.map((c) => ({ slug: c.slug }));
}

/** One changelog entry; unknown slugs are a 404. */
export default async function ChangelogSlugPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const entry = getChangelog(slug);
	if (!entry) notFound();

	return (
		<div className="mx-auto max-w-3xl px-4 py-10">
			<ChangelogDetail entry={entry} />
		</div>
	);
}
```

- [ ] **Step 3: Remove the replaced pieces**

Run: `grep -rn "layout/badges\|changelog-card" src`
Expected: no output, now that the pages above no longer import them.

```bash
git rm src/components/changelog/page/changelog-card.tsx src/components/layout/badges.tsx
```

- [ ] **Step 4: Typecheck and tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: tsc 0; PASS.

---

### Task 5: Policy page

**Files:**
- Create: `src/components/policy/policy-sections.tsx`
- Create: `src/components/policy/policy-toc.tsx`
- Rewrite: `src/app/policy/page.tsx`

**Interfaces:**
- Produces:
  - `POLICY_UPDATED: string`
  - `POLICY_SECTIONS: { id: string; title: string; body: React.ReactNode }[]`
  - `PolicyToc({ sections })`

- [ ] **Step 1: Move the text into data, verbatim**

Create `src/components/policy/policy-sections.tsx`:
- Export `POLICY_UPDATED = "April 3, 2026"`, the date from the current page.
- Export `POLICY_SECTIONS`, with one entry per `<section>` of the current `src/app/policy/page.tsx`, in the same order.

For each section:
- `id`: the title in kebab case (`what-is-summon-gg`, `what-data-do-we-collect`, `how-do-we-store-it`, `what-we-dont-collect`, …, `local-storage`, `riot-games`, `questions`).
- `title`: the `<h2>` text.
- `body`: everything after the `<h2>`, copied verbatim inside a fragment. Keep the same `<p>`, `<ul className="list-disc pl-6 space-y-2">` and `<span className="font-medium|font-semibold">` markup.

The file starts with:

```tsx
/** Date shown under the policy title. */
export const POLICY_UPDATED = "April 3, 2026";

/** Policy text by section, in reading order; ids are the anchors the table of contents links to. */
export const POLICY_SECTIONS: { id: string; title: string; body: React.ReactNode }[] = [
	{
		id: "what-is-summon-gg",
		title: "What is Summon.gg?",
		body: (
			<p>
				Summon.gg is a free-to-use League of Legends stat tracker.
```

The text continues exactly as in the current page, one object per section.

- [ ] **Step 2: TOC and page**

`src/components/policy/policy-toc.tsx`:

```tsx
/** Section links; sticky beside the text from `lg`, a plain list above it on small screens. */
export function PolicyToc({ sections }: { sections: { id: string; title: string }[] }) {
	return (
		<nav aria-label="Policy sections" className="lg:sticky lg:top-20">
			<p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">On this page</p>
			<ul className="space-y-1.5 text-sm">
				{sections.map((s) => (
					<li key={s.id}>
						<a href={`#${s.id}`} className="text-muted-foreground transition-colors hover:text-primary">
							{s.title}
						</a>
					</li>
				))}
			</ul>
		</nav>
	);
}
```

`src/app/policy/page.tsx`:

```tsx
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { POLICY_SECTIONS, POLICY_UPDATED } from "@/components/policy/policy-sections";
import { PolicyToc } from "@/components/policy/policy-toc";

/** Privacy and data policy: sticky table of contents with readable-width text panels. */
export default function PolicyPage() {
	return (
		<div className="mx-auto max-w-5xl px-4 py-10">
			<h1 className="text-3xl font-bold tracking-tight text-foreground">Privacy &amp; Data Policy</h1>
			<p className="mt-1 text-muted-foreground">Last updated: {POLICY_UPDATED}</p>
			<div className="mt-8 grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
				<aside>
					<PolicyToc sections={POLICY_SECTIONS} />
				</aside>
				<div className="space-y-4">
					{POLICY_SECTIONS.map((s) => (
						<Panel key={s.id} id={s.id} className="scroll-mt-20">
							<PanelHeader title={s.title} />
							<PanelBody className="max-w-prose space-y-3 text-sm leading-relaxed text-foreground/90 [&_ul]:space-y-1.5">{s.body}</PanelBody>
						</Panel>
					))}
				</div>
			</div>
		</div>
	);
}
```

`BackButton` is no longer imported here. The live page still uses it, and Phase 6 rewrites that page.

- [ ] **Step 3: Typecheck and tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: tsc 0; PASS.

---

### Task 6: Changelog entry for the redesign

**Files:**
- Create: `src/components/changelog/changes/2026-10-10/metadata.ts`
- Modify: `src/components/changelog/registry.ts`

- [ ] **Step 1: Entry**

`src/components/changelog/changes/2026-10-10/metadata.ts`:

```ts
import { type ChangelogEntry } from "../../changelog-type";

const changelog: ChangelogEntry = {
	slug: "2026-10-10",
	title: "The Big Redesign",
	date: "2026-10-10",
	summary:
		"Summon.gg has a new look modelled on League of Graphs: a new profile with tabs, a full match page, Ranked 5s support, LP history and a cleaner home page.",
	changes: [
		{
			category: "design",
			title: "New profile layout",
			description:
				"Profiles open on a champion splash hero with rank chips and tabs for Overview, Champions, LP History and Achievements. The overview pairs a stat column (ranked cards, roles, most played) with a compact match list that expands into a mirrored 5v5 scoreboard.",
		},
		{
			category: "design",
			title: "Match detail page",
			description:
				"Every match has its own page: scoreboard with ranks, runes, badges and bans, player comparison bars, gold, kills and CS charts, and per-player tabs for overview, fighting, farming, objectives and vision.",
		},
		{
			category: "feature",
			title: "Ranked 5s",
			description: "Ranked 5s ranks, LP history and games are tracked next to Solo and Flex, with their own rank card and filters.",
		},
		{
			category: "feature",
			title: "LP history tab",
			description: "A season-long LP chart with one point per played day and a change table grouped into collapsible days.",
		},
		{
			category: "feature",
			title: "Champions tab",
			description: "Per-champion stats from every stored game with mastery, plus a page per champion with its matches.",
		},
		{
			category: "improvement",
			title: "More game modes",
			description: "ARAM Mayhem, Arena, URF variants, Brawl and other rotating modes are recognised and can be filtered.",
		},
		{
			category: "improvement",
			title: "Large screens",
			description: "Text and icons scale up smoothly on 1440p and wider displays.",
		},
		{
			category: "design",
			title: "Home, changelog and policy",
			description: "The home page shows recently searched summoners, the free rotation and the latest changes; the changelog and policy pages use the new style.",
		},
	],
};

export default changelog;
```

- [ ] **Step 2: Register it first (newest first)**

In `registry.ts`, add `import changelog_2026_10_10 from "./changes/2026-10-10/metadata";` above the other imports, and put `changelog_2026_10_10,` first in the `changelogs` array.

- [ ] **Step 3: Tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: tsc 0; PASS.

---

### Task 7: Verify, review, commit

- [ ] **Step 1: Full checks**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm exec eslint src && pnpm run build`
Expected:
- tests PASS;
- tsc 0;
- eslint shows only the baseline errors;
- the build succeeds, with `/changelog/[slug]` statically generated for every entry, including `2026-10-10`.

- [ ] **Step 2: Browser check (own tab, dev server :3000)**

- **`/` (home):**
  - The Ahri hero shows, and search works.
  - Typing `Sk` lists stored summoners with ranks, and a click opens the profile. Typing a full unknown `Name#TAG` shows the "Look up" row.
  - Typing one character or `%` sends no request or matches literally. Check the Network tab for `/api/summoner-search` requests.
  - The navbar spotlight search shows the same suggestions.
  - History chips appear after one search.
  - Recently searched lists summoners with ranks and links.
  - The free rotation shows icons with a name on hover.
  - What's new shows "The Big Redesign" and links to it.
- **`/changelog`:** timeline items appear newest first, with the latest dot in primary and correct count chips.
- **`/changelog/2026-10-10` and `/changelog/2026-04-03`** (that entry has tables):
  - the back link works;
  - there is one panel per category;
  - tables render in the new style;
  - images render where they exist.
- **`/changelog/nope`:** 404.
- **`/policy`:** the TOC is sticky at desktop width and the anchors scroll to the panels. At 375px the TOC sits above the text, with no horizontal scroll.
- **All of the above:**
  - in light mode;
  - at 2560px (20px root, layout centered);
  - with no console errors.

- [ ] **Step 3: Commit (after the pre-commit review and its fix pass)**

```bash
git add -A
git status --short   # confirm no .env, .superpowers/ or test_matches.json staged
git commit -m "$(cat <<'EOF'
feat(pages): home redesign, changelog and policy restyle (Phase 5)

- Search-as-you-type suggestions from stored summoners (home and
  navbar), with a Riot lookup row for an unknown full Riot ID
- Home (design B): Ahri hero with search and local history chips, then
  recently searched (server-wide, solo rank), free rotation and the
  latest changelog entry
- Changelog: vertical timeline list and a per-category panel detail
  page with the new table style; category chips on the Chip primitive
- Policy: sticky table of contents with readable-width text panels
- Changelog entry for the redesign
- Old category badges and animated changelog card removed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```
