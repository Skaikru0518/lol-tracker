# UI Redesign — Phase 0: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the visual and structural foundation for the redesign: palette A design tokens (dark and light), the shared UI primitives every later phase builds on, a restyled navbar, footer, maintenance screen and loader, and removal of the aurora/glow layer and dead code.

**Architecture:**
- Design tokens live as CSS variables in `src/app/globals.css` and are exposed to Tailwind 4 through `@theme inline`.
- Primitives are small presentational components in `src/components/ui/`. Any logic in them is pulled out into pure helpers under `src/lib/ui/`, which are unit-tested with Vitest.
- No page layouts change in this phase except the global shell (navbar, footer, maintenance, loader); pages are redesigned from Phase 2 on.

**Tech Stack:** Next.js 16.2.1 (App Router), React 19.2, Tailwind CSS 4, shadcn/ui (radix), framer-motion, next-themes, Vitest 5 (new, dev only).

**Spec:** `docs/superpowers/specs/2026-10-10-ui-redesign-design.md` (sections 2 "Design system", 3 "Navbar and footer" / "maintenance", 6, 7 — Phase 0).

## Global Constraints

- Logo and Geist typography stay. The logo markup is `<span className="text-primary">Summon</span>.gg`.
- Palette A (spec §2 table). No aurora, glow, blur blobs or neon shadows anywhere.
- Every color goes through tokens; dark and light mode must both be legible.
- Badge/chip style: colored text, `${color}44` border, `${color}20` background.
- Use plain `<img>` for external and dynamic images, never `next/image`.
- Use the shadcn component when one exists (`button`, `input`, `select`, `tooltip`, `separator`, `table`, `skeleton`).
- Comments: JSDoc blocks (`/** */`) above functions/types only. No inline `//` comments.
- No emoji in code or UI.
- Components stay small — a file around 200 lines is a signal to split it.
- No new env variables; use constants in code.
- Code, comments and UI copy in English.
- Both lockfiles stay in sync after any dependency change: `package-lock.json` (npm, local) and `pnpm-lock.yaml` (Docker uses `pnpm install --frozen-lockfile`).
- Maintenance-mode logic (`isMaintenanceMode()` in the root layout) is unchanged; only its screen is restyled.
- **Commits:** none per task. One commit at the end of the phase (Task 8), covering everything.

## Review Focus

1. **Corrupted search history in localStorage** (non-JSON, non-array, non-string items, written by an older build or by hand): the navbar spotlight and history chips render normally with no history and no crash. Pinned by `parseSearchHistory` tests in Task 5.
2. **Typing `/` inside a text field** (the spotlight input itself, any form input, a contenteditable): the global `/` shortcut must not fire and must not swallow the character. Pinned by `isTypingTarget` tests in Task 5.
3. **Chip colors that are not 6-digit hex** (`#fff`, `FFF`, `red`, `""`, whitespace): no invalid CSS such as `red44` and no invisible chip. Instead, short hex expands and garbage falls back to the muted tokens. Pinned by `normalizeHex`/`chipStyle` tests in Task 1.
4. **Tier strings that are empty, lowercase or unknown** (`""`, `"emerald"`, `"UNRANKED"`, `"NONE"`): the rank emblem shows the unranked image, never a broken one. Pinned by `getRankEmblem` tests in Task 1.
5. **Stat ring values out of range** (`NaN`, negative, above max, `max = 0`): the ring stays within 0–100% and never renders a negative or overflowing arc. Pinned by `ringOffset` tests in Task 1.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `vitest.config.ts` | create | Vitest config with `@/` alias |
| `src/lib/ui/chip-style.ts` (+ `.test.ts`) | create | hex normalisation + chip inline style |
| `src/lib/ui/stat-ring.ts` (+ `.test.ts`) | create | ring arc offset math |
| `src/lib/ui/tabs.ts` (+ `.test.ts`) | create | tab href + active-state helpers |
| `src/lib/ui/keyboard.ts` (+ `.test.ts`) | create | "is the user typing" check for shortcuts |
| `src/lib/icon-helpers.ts` (+ `src/lib/icon-helpers.test.ts`) | modify | add `getChampionSplash`, harden `getRankEmblem` |
| `src/lib/search-history.ts` (+ `.test.ts`) | modify | add subscribe/raw/parse for `useSyncExternalStore` |
| `src/app/globals.css` | modify | palette A tokens, dark + light, cleanup |
| `src/components/ui/panel.tsx` | create | `Panel`, `PanelHeader`, `PanelBody` |
| `src/components/ui/chip.tsx` | create | colored chip |
| `src/components/ui/empty-state.tsx` | create | panel empty/error state |
| `src/components/ui/stat-ring.tsx` | create | circular percentage ring |
| `src/components/ui/tabs-nav.tsx` | create | route-based tab bar |
| `src/components/ui/hero-banner.tsx` | create | splash background + gradient |
| `src/components/ui/rank-emblem.tsx` | create | rank emblem image |
| `src/components/ui/champion-icon.tsx` | create | champion square icon with optional level |
| `src/components/ui/item-slots.tsx` | create | row of item icons |
| `src/components/ui/spell-rune-stack.tsx` | create | 2×2 spells + runes |
| `src/app/dev/ui/page.tsx` | create | dev-only primitive gallery for visual checks |
| `src/components/layout/logo.tsx` | create | shared logo |
| `src/components/layout/navbar.tsx` | rewrite | header bar |
| `src/components/layout/search-spotlight.tsx` | create | search overlay (split out of navbar) |
| `src/components/search/search-history.tsx` | rewrite | history chips via `useSearchHistory` |
| `src/hooks/useSearchHistory.ts` | create | `useSyncExternalStore` hook |
| `src/hooks/useIsClient.ts` | create | client-mount check without effect setState |
| `src/components/layout/footer.tsx` | rewrite | static slim footer |
| `src/components/layout/maintenance-screen.tsx` | rewrite | splash maintenance screen (server component) |
| `src/components/ui/loader.tsx` | rewrite | restyled loader, lint fix |
| `src/app/layout.tsx` | modify | drop aurora, static footer |
| dead files (Task 7) | delete | aurora, lenis, page transition, unused skeleton/loader |

---

### Task 1: Vitest setup and pure UI helpers

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/ui/chip-style.ts`, `src/lib/ui/chip-style.test.ts`
- Create: `src/lib/ui/stat-ring.ts`, `src/lib/ui/stat-ring.test.ts`
- Create: `src/lib/ui/tabs.ts`, `src/lib/ui/tabs.test.ts`
- Modify: `src/lib/icon-helpers.ts` (`getRankEmblem` at line ~98, add `getChampionSplash` after `getChampionIcon`)
- Create: `src/lib/icon-helpers.test.ts`
- Modify: `package.json` (scripts + devDependency)

**Interfaces:**
- Produces:
  - `normalizeHex(input: string): string | null`
  - `interface ChipStyle { color: string; borderColor: string; backgroundColor: string }`
  - `chipStyle(color: string): ChipStyle`
  - `ringOffset(value: number, max: number, circumference: number): number`
  - `buildTabHref(basePath: string, segment: string | null): string`
  - `isTabActive(activeSegment: string | null, tabSegment: string | null): boolean`
  - `getChampionSplash(championName: string, skinNum?: number): string`
  - `getRankEmblem(tier: string | null | undefined): string` (signature widened, same name)

- [ ] **Step 1: Install Vitest and add the script**

Run:
```bash
npm install -D vitest@^5.0.3
```
Then in `package.json` `"scripts"`, add after `"typecheck"`:
```json
		"test": "vitest run"
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
});
```

- [ ] **Step 3: Write the failing tests**

`src/lib/ui/chip-style.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { chipStyle, normalizeHex } from "./chip-style";

describe("normalizeHex", () => {
	it("keeps a lowercase 6-digit hex", () => {
		expect(normalizeHex("#e74c3c")).toBe("#e74c3c");
	});

	it("lowercases and adds the missing hash", () => {
		expect(normalizeHex("E74C3C")).toBe("#e74c3c");
	});

	it("expands 3-digit shorthand", () => {
		expect(normalizeHex("#FfF")).toBe("#ffffff");
	});

	it("trims surrounding whitespace", () => {
		expect(normalizeHex("  #2ecc71 ")).toBe("#2ecc71");
	});

	it.each(["red", "", "#12345", "#gggggg", "#e74c3c80"])(
		"rejects %j",
		(input) => {
			expect(normalizeHex(input)).toBeNull();
		},
	);
});

describe("chipStyle", () => {
	it("builds text, 44-alpha border and 20-alpha background", () => {
		expect(chipStyle("#e74c3c")).toEqual({
			color: "#e74c3c",
			borderColor: "#e74c3c44",
			backgroundColor: "#e74c3c20",
		});
	});

	it("uses the expanded hex for shorthand input", () => {
		expect(chipStyle("#fff").borderColor).toBe("#ffffff44");
	});

	it("falls back to muted tokens for invalid colors", () => {
		expect(chipStyle("red")).toEqual({
			color: "var(--muted-foreground)",
			borderColor: "var(--border)",
			backgroundColor: "transparent",
		});
	});
});
```

`src/lib/ui/stat-ring.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { ringOffset } from "./stat-ring";

const C = 100;

describe("ringOffset", () => {
	it("is the full circumference at 0", () => {
		expect(ringOffset(0, 100, C)).toBe(100);
	});

	it("is half the circumference at 50%", () => {
		expect(ringOffset(50, 100, C)).toBe(50);
	});

	it("is 0 at max", () => {
		expect(ringOffset(100, 100, C)).toBe(0);
	});

	it("clamps values above max", () => {
		expect(ringOffset(250, 100, C)).toBe(0);
	});

	it("clamps negative values", () => {
		expect(ringOffset(-20, 100, C)).toBe(100);
	});

	it("treats NaN as empty", () => {
		expect(ringOffset(Number.NaN, 100, C)).toBe(100);
	});

	it("treats a non-positive max as empty", () => {
		expect(ringOffset(5, 0, C)).toBe(100);
	});

	it("supports a non-100 max", () => {
		expect(ringOffset(7.4, 10, C)).toBeCloseTo(26);
	});
});
```

`src/lib/ui/tabs.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildTabHref, isTabActive } from "./tabs";

describe("buildTabHref", () => {
	it("returns the base path for the index tab", () => {
		expect(buildTabHref("/summoner/Skaikru-HEAVN", null)).toBe(
			"/summoner/Skaikru-HEAVN",
		);
	});

	it("appends the segment", () => {
		expect(buildTabHref("/summoner/Skaikru-HEAVN", "lp")).toBe(
			"/summoner/Skaikru-HEAVN/lp",
		);
	});

	it("does not double the slash when the base ends with one", () => {
		expect(buildTabHref("/summoner/Skaikru-HEAVN/", "champions")).toBe(
			"/summoner/Skaikru-HEAVN/champions",
		);
	});

	it("strips the trailing slash for the index tab", () => {
		expect(buildTabHref("/summoner/Skaikru-HEAVN/", null)).toBe(
			"/summoner/Skaikru-HEAVN",
		);
	});
});

describe("isTabActive", () => {
	it("matches the index tab when no child segment is selected", () => {
		expect(isTabActive(null, null)).toBe(true);
	});

	it("matches an equal segment", () => {
		expect(isTabActive("champions", "champions")).toBe(true);
	});

	it("does not match a different segment", () => {
		expect(isTabActive("lp", "champions")).toBe(false);
	});

	it("does not mark the index tab active on a child segment", () => {
		expect(isTabActive("lp", null)).toBe(false);
	});
});
```

`src/lib/icon-helpers.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { getChampionSplash, getRankEmblem } from "./icon-helpers";

describe("getChampionSplash", () => {
	it("builds the default skin splash URL", () => {
		expect(getChampionSplash("MissFortune")).toBe(
			"https://ddragon.leagueoflegends.com/cdn/img/champion/splash/MissFortune_0.jpg",
		);
	});

	it("applies the Fiddlesticks id fix", () => {
		expect(getChampionSplash("FiddleSticks")).toContain("/Fiddlesticks_0.jpg");
	});

	it("uses the given skin number", () => {
		expect(getChampionSplash("Ahri", 7)).toContain("/Ahri_7.jpg");
	});

	it("falls back to skin 0 for invalid skin numbers", () => {
		expect(getChampionSplash("Ahri", -3)).toContain("/Ahri_0.jpg");
		expect(getChampionSplash("Ahri", 2.6)).toContain("/Ahri_2.jpg");
	});
});

describe("getRankEmblem", () => {
	it("maps an upper-case tier to its local emblem", () => {
		expect(getRankEmblem("EMERALD")).toBe("/icons/rank/emerald.png");
	});

	it("accepts lower-case tiers", () => {
		expect(getRankEmblem("grandmaster")).toBe("/icons/rank/grandmaster.png");
	});

	it.each(["", "UNRANKED", "NONE", "WOOD", null, undefined])(
		"falls back to unranked for %j",
		(tier) => {
			expect(getRankEmblem(tier)).toBe("/icons/rank/unranked.png");
		},
	);
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./chip-style"` (and the same for `./stat-ring` and `./tabs`). `icon-helpers.test.ts` also fails: `getChampionSplash is not a function`, and the unranked cases fail.

- [ ] **Step 5: Implement the helpers**

`src/lib/ui/chip-style.ts`:
```ts
const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Normalises a CSS hex color to lowercase `#rrggbb`.
 * Accepts an optional `#`, 3-digit shorthand and surrounding whitespace.
 * Returns `null` for anything else, including named colors and alpha hex.
 */
export function normalizeHex(input: string): string | null {
	const match = HEX_PATTERN.exec(input.trim());
	if (!match) return null;

	const digits = match[1].toLowerCase();
	const full =
		digits.length === 3
			? digits
					.split("")
					.map((digit) => digit + digit)
					.join("")
			: digits;

	return `#${full}`;
}

/** Inline style applied to a colored chip. */
export interface ChipStyle {
	color: string;
	borderColor: string;
	backgroundColor: string;
}

/**
 * Chip style from a hex color: the color as text, a `44` alpha border and a
 * `20` alpha fill. Invalid colors fall back to the muted theme tokens so a bad
 * value from data never produces invalid CSS.
 */
export function chipStyle(color: string): ChipStyle {
	const hex = normalizeHex(color);

	if (!hex) {
		return {
			color: "var(--muted-foreground)",
			borderColor: "var(--border)",
			backgroundColor: "transparent",
		};
	}

	return {
		color: hex,
		borderColor: `${hex}44`,
		backgroundColor: `${hex}20`,
	};
}
```

`src/lib/ui/stat-ring.ts`:
```ts
/**
 * `stroke-dashoffset` for a progress ring: the full circumference when empty,
 * 0 when full. The ratio is clamped to 0–1; `NaN` and a non-positive `max`
 * count as empty.
 */
export function ringOffset(
	value: number,
	max: number,
	circumference: number,
): number {
	const ratio =
		max > 0 && Number.isFinite(value)
			? Math.min(Math.max(value / max, 0), 1)
			: 0;

	return circumference * (1 - ratio);
}
```

`src/lib/ui/tabs.ts`:
```ts
/**
 * Href for a route tab. `segment` is the child segment under `basePath`, or
 * `null` for the index tab.
 */
export function buildTabHref(basePath: string, segment: string | null): string {
	const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
	return segment ? `${base}/${segment}` : base;
}

/**
 * Whether a tab is active, given the segment returned by
 * `useSelectedLayoutSegment()` (`null` on the index page).
 */
export function isTabActive(
	activeSegment: string | null,
	tabSegment: string | null,
): boolean {
	return activeSegment === tabSegment;
}
```

In `src/lib/icon-helpers.ts`, add directly below `getChampionIcon`:
```ts
/**
 * Data Dragon splash art URL. Splash images are not versioned. Invalid skin
 * numbers fall back to the default skin.
 */
export function getChampionSplash(championName: string, skinNum = 0) {
	const fixedName = CHAMPION_ID_FIXES[championName] ?? championName;
	const skin = Number.isFinite(skinNum) && skinNum > 0 ? Math.trunc(skinNum) : 0;
	return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${fixedName}_${skin}.jpg`;
}
```
Replace the existing `getRankEmblem` with:
```ts
const RANK_EMBLEM_TIERS = new Set([
	"iron",
	"bronze",
	"silver",
	"gold",
	"platinum",
	"emerald",
	"diamond",
	"master",
	"grandmaster",
	"challenger",
]);

/**
 * Local rank emblem path. Empty, unknown or unranked tiers resolve to the
 * unranked emblem so the image is never broken.
 */
export function getRankEmblem(tier: string | null | undefined) {
	const key = (tier ?? "").trim().toLowerCase();
	return `/icons/rank/${RANK_EMBLEM_TIERS.has(key) ? key : "unranked"}.png`;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — 4 files, all tests green.

- [ ] **Step 7: Typecheck the widened `getRankEmblem` callers**

Run: `npm run typecheck`
Expected: no errors. Existing callers pass a `string`, which still type-checks.

---

### Task 2: Palette A design tokens

**Files:**
- Modify: `src/app/globals.css` (whole `@theme inline` block, `:root`, `.dark`, scrollbar, keyframes)

**Interfaces:**
- Produces these Tailwind color utilities for later tasks: `bg-nav`, `text-win`/`bg-win`, `text-loss`/`bg-loss`, `text-gold`/`bg-gold`, `text-team-blue`, `text-team-red`. The standard shadcn ones stay as well: `bg-card`, `border-border`, `text-muted-foreground`, `bg-primary`, `bg-muted`, `bg-accent`. All of them exist in both themes.

- [ ] **Step 1: Add the new color mappings to the first `@theme inline` block**

Replace the last two lines of the first `@theme inline` block:
```css
	--color-win: var(--win);
	--color-loss: var(--loss);
}
```
with:
```css
	--color-win: var(--win);
	--color-loss: var(--loss);
	--color-gold: var(--gold);
	--color-nav: var(--nav);
	--color-team-blue: var(--team-blue);
	--color-team-red: var(--team-red);
}
```

- [ ] **Step 2: Replace the `:root` (light) block**

```css
:root {
	--background: #f5f6fa;
	--foreground: #1b1e2e;
	--nav: #ffffff;
	--card: #ffffff;
	--card-foreground: #1b1e2e;
	--popover: #ffffff;
	--popover-foreground: #1b1e2e;
	--primary: #9a3fc4;
	--primary-foreground: #ffffff;
	--secondary: #eceef5;
	--secondary-foreground: #2a2e45;
	--muted: #eceef5;
	--muted-foreground: #626886;
	--accent: #eceef5;
	--accent-foreground: #1b1e2e;
	--destructive: #d64545;
	--border: #e1e4ee;
	--input: #e1e4ee;
	--ring: #9a3fc4;
	--chart-1: #9a3fc4;
	--chart-2: #2f6fd0;
	--chart-3: #1f9d6f;
	--chart-4: #b8860b;
	--chart-5: #d64545;
	--radius: 0.5rem;
	--win: #1f9d6f;
	--loss: #d64545;
	--gold: #b8860b;
	--team-blue: #2f6fd0;
	--team-red: #d64545;
	--scrollbar: #cfd3e0;
	--scrollbar-hover: #b7bccd;
}
```

- [ ] **Step 3: Replace the `.dark` block**

```css
.dark {
	--background: #0d0f1a;
	--foreground: #d4d7e6;
	--nav: #0a0c15;
	--card: #151827;
	--card-foreground: #d4d7e6;
	--popover: #151827;
	--popover-foreground: #d4d7e6;
	--primary: #b05ad6;
	--primary-foreground: #ffffff;
	--secondary: #1d2136;
	--secondary-foreground: #d4d7e6;
	--muted: #1d2136;
	--muted-foreground: #7d829c;
	--accent: #1d2136;
	--accent-foreground: #ffffff;
	--destructive: #ef5350;
	--border: #252a40;
	--input: #1d2136;
	--ring: #b05ad6;
	--chart-1: #b05ad6;
	--chart-2: #4f8fe6;
	--chart-3: #34c38f;
	--chart-4: #e9b949;
	--chart-5: #ef5350;
	--win: #34c38f;
	--loss: #ef5350;
	--gold: #e9b949;
	--team-blue: #4f8fe6;
	--team-red: #ef5350;
	--scrollbar: #2a3048;
	--scrollbar-hover: #3a4160;
}
```

- [ ] **Step 4: Point the scrollbar at the tokens and drop the glow animation**

Replace every `oklch(0.3 0.02 250)` in the scrollbar rules with `var(--scrollbar)`, and `oklch(0.4 0.03 250)` with `var(--scrollbar-hover)`. Delete the whole `@keyframes smoke { … }` block and the `--animate-smoke: smoke 4s ease-in-out infinite;` line (only the old maintenance glow used it). Keep `shimmer`.

- [ ] **Step 5: Verify nothing else used `animate-smoke`**

Run: `npx rg -n "animate-smoke" src` (or use the Grep tool)
Expected: only `src/components/layout/maintenance-screen.tsx`, which Task 6 rewrites.

- [ ] **Step 6: Typecheck and start the dev server**

Run: `npm run typecheck` → no errors.
Run: `npm run dev`, open `http://localhost:3000`. Expected: the page renders in the new navy/purple tokens. Old components may look rough; they are redesigned in later phases. Toggle the theme to confirm the light tokens apply.

---

### Task 3: Layout primitives — Panel, Chip, EmptyState, StatRing, TabsNav

**Files:**
- Create: `src/components/ui/panel.tsx`
- Create: `src/components/ui/chip.tsx`
- Create: `src/components/ui/empty-state.tsx`
- Create: `src/components/ui/stat-ring.tsx`
- Create: `src/components/ui/tabs-nav.tsx`

**Interfaces:**
- Consumes: `chipStyle` (Task 1), `ringOffset` (Task 1), `buildTabHref`, `isTabActive` (Task 1), `cn` from `@/lib/utils`.
- Produces:
  - `Panel(props: React.ComponentProps<"section">)`
  - `PanelHeader(props: Omit<React.ComponentProps<"header">, "title"> & { title: React.ReactNode; actions?: React.ReactNode })`
  - `PanelBody(props: React.ComponentProps<"div">)`
  - `Chip(props: Omit<React.ComponentProps<"span">, "color"> & { color: string })`
  - `EmptyState(props: { title: string; description?: string; action?: React.ReactNode; className?: string })`
  - `StatRing(props: { label: string; value: number; max?: number; display: React.ReactNode; color?: string; className?: string })`
  - `interface TabItem { label: string; segment: string | null }`
  - `TabsNav(props: { basePath: string; tabs: readonly TabItem[]; className?: string })` (client component)

- [ ] **Step 1: Create `panel.tsx`**

```tsx
import { cn } from "@/lib/utils";

/** Bordered surface that groups one section of a page. */
export function Panel({ className, ...props }: React.ComponentProps<"section">) {
	return (
		<section
			data-slot="panel"
			className={cn(
				"overflow-hidden rounded-lg border bg-card text-card-foreground",
				className,
			)}
			{...props}
		/>
	);
}

/** Title row of a panel with an optional actions slot on the right. */
export function PanelHeader({
	title,
	actions,
	className,
	...props
}: Omit<React.ComponentProps<"header">, "title"> & {
	title: React.ReactNode;
	actions?: React.ReactNode;
}) {
	return (
		<header
			data-slot="panel-header"
			className={cn(
				"flex min-h-11 items-center justify-between gap-3 border-b px-4 py-2",
				className,
			)}
			{...props}
		>
			<h2 className="text-sm font-semibold text-foreground">{title}</h2>
			{actions && <div className="flex items-center gap-2">{actions}</div>}
		</header>
	);
}

/** Padded content area of a panel. */
export function PanelBody({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div data-slot="panel-body" className={cn("p-4", className)} {...props} />
	);
}
```

- [ ] **Step 2: Create `chip.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { chipStyle } from "@/lib/ui/chip-style";

/**
 * Small colored label — badges, rank pills, tags. The color is a hex string;
 * invalid values render in muted theme colors.
 */
export function Chip({
	color,
	className,
	style,
	...props
}: Omit<React.ComponentProps<"span">, "color"> & { color: string }) {
	return (
		<span
			data-slot="chip"
			className={cn(
				"inline-flex h-5 items-center gap-1 whitespace-nowrap rounded border px-1.5 text-[10px] font-semibold",
				className,
			)}
			style={{ ...chipStyle(color), ...style }}
			{...props}
		/>
	);
}
```

- [ ] **Step 3: Create `empty-state.tsx`**

```tsx
import { cn } from "@/lib/utils";

/** Centered message for an empty or failed panel, with an optional action. */
export function EmptyState({
	title,
	description,
	action,
	className,
}: {
	title: string;
	description?: string;
	action?: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-1.5 px-4 py-8 text-center",
				className,
			)}
		>
			<p className="text-sm font-medium text-foreground">{title}</p>
			{description && (
				<p className="max-w-xs text-xs text-muted-foreground">{description}</p>
			)}
			{action && <div className="mt-2">{action}</div>}
		</div>
	);
}
```

- [ ] **Step 4: Create `stat-ring.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { ringOffset } from "@/lib/ui/stat-ring";

const SIZE = 64;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Circular progress ring with a label above and a formatted value in the
 * middle. `value` is clamped to `0..max`.
 */
export function StatRing({
	label,
	value,
	max = 100,
	display,
	color = "var(--primary)",
	className,
}: {
	label: string;
	value: number;
	max?: number;
	display: React.ReactNode;
	color?: string;
	className?: string;
}) {
	return (
		<div className={cn("flex flex-col items-center gap-1.5", className)}>
			<span className="text-xs font-medium text-muted-foreground">{label}</span>
			<div className="relative size-16">
				<svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full -rotate-90">
					<circle
						cx={SIZE / 2}
						cy={SIZE / 2}
						r={RADIUS}
						fill="none"
						stroke="var(--border)"
						strokeWidth={STROKE}
					/>
					<circle
						cx={SIZE / 2}
						cy={SIZE / 2}
						r={RADIUS}
						fill="none"
						stroke={color}
						strokeWidth={STROKE}
						strokeLinecap="round"
						strokeDasharray={CIRCUMFERENCE}
						strokeDashoffset={ringOffset(value, max, CIRCUMFERENCE)}
					/>
				</svg>
				<span className="absolute inset-0 grid place-items-center text-sm font-bold text-foreground">
					{display}
				</span>
			</div>
		</div>
	);
}
```

- [ ] **Step 5: Create `tabs-nav.tsx`**

Before writing it, read `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-selected-layout-segment.md`. Confirm that the hook returns the segment one level below the layout that renders the component, and `null` on the index page.

```tsx
"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";
import { buildTabHref, isTabActive } from "@/lib/ui/tabs";

/** One route tab. `segment` is the child route segment, `null` for the index. */
export interface TabItem {
	label: string;
	segment: string | null;
}

/**
 * Link-based tab bar for nested routes. Must be rendered from the layout that
 * owns the tabbed segments, so the selected segment resolves correctly.
 */
export function TabsNav({
	basePath,
	tabs,
	className,
}: {
	basePath: string;
	tabs: readonly TabItem[];
	className?: string;
}) {
	const activeSegment = useSelectedLayoutSegment();

	return (
		<nav
			className={cn(
				"flex gap-6 overflow-x-auto border-b [scrollbar-width:none]",
				className,
			)}
		>
			{tabs.map((tab) => {
				const active = isTabActive(activeSegment, tab.segment);
				return (
					<Link
						key={tab.label}
						href={buildTabHref(basePath, tab.segment)}
						aria-current={active ? "page" : undefined}
						className={cn(
							"-mb-px whitespace-nowrap border-b-2 py-2.5 text-sm font-medium transition-colors",
							active
								? "border-primary text-foreground"
								: "border-transparent text-muted-foreground hover:text-foreground",
						)}
					>
						{tab.label}
					</Link>
				);
			})}
		</nav>
	);
}
```

- [ ] **Step 6: Typecheck and lint the new files**

Run: `npm run typecheck`
Expected: no errors.
Run: `npx eslint src/components/ui/panel.tsx src/components/ui/chip.tsx src/components/ui/empty-state.tsx src/components/ui/stat-ring.tsx src/components/ui/tabs-nav.tsx`
Expected: 0 errors.

---

### Task 4: Game primitives and the dev gallery

**Files:**
- Create: `src/components/ui/hero-banner.tsx`
- Create: `src/components/ui/rank-emblem.tsx`
- Create: `src/components/ui/champion-icon.tsx`
- Create: `src/components/ui/item-slots.tsx`
- Create: `src/components/ui/spell-rune-stack.tsx`
- Create: `src/app/dev/ui/page.tsx`

**Interfaces:**
- Consumes:
  - Task 1: `getChampionSplash`, `getRankEmblem`
  - existing helpers: `getChampionIcon(version, championName)`, `getChampionDisplayName(championName)`, `getItemIcon(version, itemId): string | null`, `getSummonerSpellIcon(version, spellId)`, `getDDragonVersion(): Promise<string>`
  - Task 3: all primitives
- Produces:
  - `HeroBanner(props: { splashUrl?: string | null; objectPosition?: string; className?: string; children: React.ReactNode })`
  - `RankEmblem(props: { tier: string | null | undefined; size?: number; className?: string })`
  - `ChampionIcon(props: { version: string; championName: string; size?: number; level?: number; className?: string })`
  - `ItemSlots(props: { version: string; items: readonly number[]; size?: number; className?: string })`
  - `SpellRuneStack(props: { version: string; spells: readonly [number, number]; runes: readonly [string | null, string | null]; size?: number; className?: string })`. `runes` are already-resolved image URLs: primary keystone first, secondary tree second.

- [ ] **Step 1: Create `hero-banner.tsx`**

```tsx
import { cn } from "@/lib/utils";

/**
 * Splash-art header. The image sits behind a left-to-right and bottom fade into
 * the page background, so content placed on top stays readable in both themes.
 */
export function HeroBanner({
	splashUrl,
	objectPosition = "center 20%",
	className,
	children,
}: {
	splashUrl?: string | null;
	objectPosition?: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div className={cn("relative isolate overflow-hidden", className)}>
			{splashUrl && (
				<img
					src={splashUrl}
					alt=""
					aria-hidden
					className="absolute inset-0 -z-10 size-full object-cover"
					style={{ objectPosition }}
				/>
			)}
			<div
				aria-hidden
				className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/60 to-background/90"
			/>
			<div
				aria-hidden
				className="absolute inset-x-0 bottom-0 -z-10 h-16 bg-gradient-to-b from-transparent to-background"
			/>
			{children}
		</div>
	);
}
```

- [ ] **Step 2: Create `rank-emblem.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { getRankEmblem } from "@/lib/icon-helpers";

/** Local rank emblem image; unknown or empty tiers show the unranked emblem. */
export function RankEmblem({
	tier,
	size = 48,
	className,
}: {
	tier: string | null | undefined;
	size?: number;
	className?: string;
}) {
	return (
		<img
			src={getRankEmblem(tier)}
			alt={`${tier ? tier.toLowerCase() : "unranked"} emblem`}
			width={size}
			height={size}
			className={cn("shrink-0 object-contain", className)}
		/>
	);
}
```

- [ ] **Step 3: Create `champion-icon.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { getChampionDisplayName, getChampionIcon } from "@/lib/icon-helpers";

/** Square champion portrait with an optional level badge in the corner. */
export function ChampionIcon({
	version,
	championName,
	size = 32,
	level,
	className,
}: {
	version: string;
	championName: string;
	size?: number;
	level?: number;
	className?: string;
}) {
	return (
		<span
			className={cn("relative inline-block shrink-0", className)}
			style={{ width: size, height: size }}
		>
			<img
				src={getChampionIcon(version, championName)}
				alt={getChampionDisplayName(championName)}
				width={size}
				height={size}
				className="size-full rounded-md object-cover"
			/>
			{level !== undefined && (
				<span className="absolute -bottom-1 -right-1 rounded-md border bg-background px-1 text-[9px] leading-tight text-foreground">
					{level}
				</span>
			)}
		</span>
	);
}
```

- [ ] **Step 4: Create `item-slots.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { getItemIcon } from "@/lib/icon-helpers";

/** Row of item icons; `0` renders as an empty slot. */
export function ItemSlots({
	version,
	items,
	size = 22,
	className,
}: {
	version: string;
	items: readonly number[];
	size?: number;
	className?: string;
}) {
	return (
		<div className={cn("flex gap-0.5", className)}>
			{items.map((itemId, index) => {
				const src = getItemIcon(version, itemId);
				return src ? (
					<img
						key={index}
						src={src}
						alt=""
						width={size}
						height={size}
						className="rounded"
					/>
				) : (
					<span
						key={index}
						className="rounded bg-muted"
						style={{ width: size, height: size }}
					/>
				);
			})}
		</div>
	);
}
```

- [ ] **Step 5: Create `spell-rune-stack.tsx`**

```tsx
import { cn } from "@/lib/utils";
import { getSummonerSpellIcon } from "@/lib/icon-helpers";

/**
 * 2x2 grid: summoner spells in the first column, keystone and secondary rune
 * tree in the second. Rune entries are resolved image URLs or `null`.
 */
export function SpellRuneStack({
	version,
	spells,
	runes,
	size = 18,
	className,
}: {
	version: string;
	spells: readonly [number, number];
	runes: readonly [string | null, string | null];
	size?: number;
	className?: string;
}) {
	return (
		<div className={cn("grid shrink-0 grid-flow-col grid-rows-2 gap-0.5", className)}>
			{spells.map((spellId, index) => (
				<img
					key={`spell-${index}`}
					src={getSummonerSpellIcon(version, spellId)}
					alt=""
					width={size}
					height={size}
					className="rounded"
				/>
			))}
			{runes.map((src, index) =>
				src ? (
					<img
						key={`rune-${index}`}
						src={src}
						alt=""
						width={size}
						height={size}
						className="rounded-full bg-black/40 p-px"
					/>
				) : (
					<span
						key={`rune-${index}`}
						className="rounded-full bg-muted"
						style={{ width: size, height: size }}
					/>
				),
			)}
		</div>
	);
}
```

- [ ] **Step 6: Create the dev-only gallery `src/app/dev/ui/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { StatRing } from "@/components/ui/stat-ring";
import { HeroBanner } from "@/components/ui/hero-banner";
import { RankEmblem } from "@/components/ui/rank-emblem";
import { ChampionIcon } from "@/components/ui/champion-icon";
import { ItemSlots } from "@/components/ui/item-slots";
import { SpellRuneStack } from "@/components/ui/spell-rune-stack";
import { Button } from "@/components/ui/button";
import { getChampionSplash, getDDragonVersion } from "@/lib/icon-helpers";

/**
 * Visual gallery of the redesign primitives for manual checks in both themes.
 * Not available in production builds.
 */
export default async function UiGalleryPage() {
	if (process.env.NODE_ENV === "production") notFound();

	const version = await getDDragonVersion();

	return (
		<div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
			<HeroBanner splashUrl={getChampionSplash("Nami")} className="rounded-lg">
				<div className="flex h-40 items-end gap-4 p-6">
					<ChampionIcon version={version} championName="Nami" size={64} level={18} />
					<div>
						<h1 className="text-2xl font-bold text-foreground">Hero banner</h1>
						<div className="mt-2 flex gap-1.5">
							<Chip color="#34c38f">EMERALD I · SOLO</Chip>
							<Chip color="#4fb3c9">PLATINUM I · FLEX</Chip>
							<Chip color="#fff">short hex</Chip>
							<Chip color="red">invalid</Chip>
						</div>
					</div>
				</div>
			</HeroBanner>

			<div className="grid gap-4 md:grid-cols-2">
				<Panel>
					<PanelHeader title="Ranked Solo" actions={<Button size="sm">Update</Button>} />
					<PanelBody className="flex items-center gap-4">
						<RankEmblem tier="EMERALD" size={64} />
						<RankEmblem tier="" size={40} />
						<RankEmblem tier="emerald" size={40} />
					</PanelBody>
				</Panel>

				<Panel>
					<PanelHeader title="Match primitives" />
					<PanelBody className="flex items-center gap-3">
						<ChampionIcon version={version} championName="MissFortune" size={44} level={14} />
						<SpellRuneStack version={version} spells={[4, 7]} runes={[null, null]} />
						<ItemSlots version={version} items={[3031, 6672, 3006, 3094, 3036, 0, 3363]} />
					</PanelBody>
				</Panel>

				<Panel>
					<PanelHeader title="Stat rings" />
					<PanelBody className="flex justify-around">
						<StatRing label="Dmg share" value={21.5} display="21.5%" />
						<StatRing label="KP" value={45} display="45%" color="var(--win)" />
						<StatRing label="CS/min" value={7.4} max={10} display="7.4" />
						<StatRing label="Overflow" value={250} display="250" />
						<StatRing label="NaN" value={Number.NaN} display="-" />
					</PanelBody>
				</Panel>

				<Panel>
					<PanelHeader title="Empty state" />
					<EmptyState
						title="No matches found"
						description="This summoner has no stored matches for this queue."
						action={<Button size="sm" variant="outline">Retry</Button>}
					/>
				</Panel>
			</div>
		</div>
	);
}
```

- [ ] **Step 7: Verify in the browser**

With `npm run dev` running, open `http://localhost:3000/dev/ui`.

Expected:
- The Nami splash fades into the background.
- The chips render; "short hex" is white and "invalid" is muted.
- The empty tier shows the unranked emblem.
- The rings stay within bounds: "Overflow" is full and "NaN" is empty.
- Item slot 6 is an empty grey square.

Toggle light mode and re-check legibility.

- [ ] **Step 8: Typecheck and lint**

Run: `npm run typecheck` → no errors.
Run: `npx eslint src/components/ui src/app/dev`
Expected: 0 errors. `@next/next/no-img-element` warnings are accepted (project rule: plain `<img>`).

---

### Task 5: Navbar, search spotlight and search history

**Files:**
- Create: `src/lib/ui/keyboard.ts`, `src/lib/ui/keyboard.test.ts`
- Modify: `src/lib/search-history.ts`
- Create: `src/lib/search-history.test.ts`
- Create: `src/hooks/useSearchHistory.ts`
- Create: `src/components/layout/logo.tsx`
- Create: `src/components/layout/search-spotlight.tsx`
- Rewrite: `src/components/layout/navbar.tsx`
- Rewrite: `src/components/search/search-history.tsx`

**Interfaces:**
- Consumes: `Panel` (Task 3). Existing: `SummonerSearch` (`components/search/summoner-search.tsx`, props `{ compact?: boolean; autoFocus?: boolean }`), `ThemeToggle`, `parseRiotId`, `toSummonerSlug`.
- Produces:
  - `isTypingTarget(target: { tagName?: string; isContentEditable?: boolean } | null): boolean`
  - `parseSearchHistory(raw: string | null): string[]`
  - `readSearchHistoryRaw(): string | null`
  - `subscribeSearchHistory(onChange: () => void): () => void`
  - `useSearchHistory(): string[]`
  - `Logo(props: { className?: string })`
  - `SearchSpotlight(props: { open: boolean; onClose: () => void })`
  - existing `getSearchHistory`, `addSearchHistory` and `clearSearchHistory` keep their signatures

- [ ] **Step 1: Write the failing tests**

`src/lib/ui/keyboard.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { isTypingTarget } from "./keyboard";

describe("isTypingTarget", () => {
	it.each(["INPUT", "TEXTAREA", "SELECT", "input"])(
		"is true for %s elements",
		(tagName) => {
			expect(isTypingTarget({ tagName })).toBe(true);
		},
	);

	it("is true for contenteditable elements", () => {
		expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
	});

	it("is false for regular elements", () => {
		expect(isTypingTarget({ tagName: "BUTTON" })).toBe(false);
		expect(isTypingTarget({ tagName: "BODY", isContentEditable: false })).toBe(false);
	});

	it("is false for a missing target", () => {
		expect(isTypingTarget(null)).toBe(false);
	});
});
```

`src/lib/search-history.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parseSearchHistory } from "./search-history";

describe("parseSearchHistory", () => {
	it("returns an empty list for null", () => {
		expect(parseSearchHistory(null)).toEqual([]);
	});

	it("parses a stored list", () => {
		expect(parseSearchHistory('["Skaikru#HEAVN","Nyzor#420"]')).toEqual([
			"Skaikru#HEAVN",
			"Nyzor#420",
		]);
	});

	it("returns an empty list for corrupt JSON", () => {
		expect(parseSearchHistory("{not json")).toEqual([]);
	});

	it("returns an empty list for non-array JSON", () => {
		expect(parseSearchHistory('{"a":1}')).toEqual([]);
		expect(parseSearchHistory('"Skaikru#HEAVN"')).toEqual([]);
	});

	it("drops non-string entries", () => {
		expect(parseSearchHistory('["Skaikru#HEAVN",42,null,{"x":1}]')).toEqual([
			"Skaikru#HEAVN",
		]);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./keyboard"`. `parseSearchHistory` fails with "is not a function".

- [ ] **Step 3: Implement `keyboard.ts`**

```ts
const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Whether a keyboard event target is a text field, so global single-key
 * shortcuts should not fire. Takes a minimal shape instead of `HTMLElement` so
 * it works with any `EventTarget` and in tests without a DOM.
 */
export function isTypingTarget(
	target: { tagName?: string; isContentEditable?: boolean } | null,
): boolean {
	if (!target) return false;
	if (target.isContentEditable) return true;
	return TYPING_TAGS.has((target.tagName ?? "").toUpperCase());
}
```

- [ ] **Step 4: Rewrite `src/lib/search-history.ts`**

```ts
const STORAGE_KEY = "summon-gg-search-history";
const CHANGE_EVENT = "summon-gg-search-history-change";
const MAX_ITEMS = 10;

/** Parses the stored history; anything that is not a JSON string array yields `[]`. */
export function parseSearchHistory(raw: string | null): string[] {
	if (!raw) return [];
	try {
		const value: unknown = JSON.parse(raw);
		return Array.isArray(value)
			? value.filter((item): item is string => typeof item === "string")
			: [];
	} catch {
		return [];
	}
}

/** Raw stored value, used as the `useSyncExternalStore` snapshot. */
export function readSearchHistoryRaw(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

/** Subscribes to history changes from this tab and from other tabs. */
export function subscribeSearchHistory(onChange: () => void): () => void {
	window.addEventListener("storage", onChange);
	window.addEventListener(CHANGE_EVENT, onChange);
	return () => {
		window.removeEventListener("storage", onChange);
		window.removeEventListener(CHANGE_EVENT, onChange);
	};
}

/** Current history, newest first. */
export function getSearchHistory(): string[] {
	return parseSearchHistory(readSearchHistoryRaw());
}

/** Moves `query` to the front of the history, capped at `MAX_ITEMS`. */
export function addSearchHistory(query: string): void {
	if (typeof window === "undefined") return;
	try {
		const history = getSearchHistory().filter((item) => item !== query);
		history.unshift(query);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_ITEMS)));
		window.dispatchEvent(new Event(CHANGE_EVENT));
	} catch {
		return;
	}
}

/** Removes all stored history. */
export function clearSearchHistory(): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.removeItem(STORAGE_KEY);
		window.dispatchEvent(new Event(CHANGE_EVENT));
	} catch {
		return;
	}
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all files green.

- [ ] **Step 6: Create `src/hooks/useSearchHistory.ts`**

```ts
import { useMemo, useSyncExternalStore } from "react";
import {
	parseSearchHistory,
	readSearchHistoryRaw,
	subscribeSearchHistory,
} from "@/lib/search-history";

/**
 * Search history that stays in sync with localStorage, including other tabs.
 * The snapshot is the raw string so it is referentially stable between reads.
 */
export function useSearchHistory(): string[] {
	const raw = useSyncExternalStore(
		subscribeSearchHistory,
		readSearchHistoryRaw,
		() => null,
	);
	return useMemo(() => parseSearchHistory(raw), [raw]);
}
```

- [ ] **Step 7: Rewrite `src/components/search/search-history.tsx`**

```tsx
"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { clearSearchHistory } from "@/lib/search-history";
import { parseRiotId, toSummonerSlug } from "@/lib/riot-id";
import { useSearchHistory } from "@/hooks/useSearchHistory";

/** Recent searches as chips linking to each profile, with a clear action. */
export default function SearchHistory() {
	const history = useSearchHistory();

	if (history.length === 0) return null;

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{history.map((item) => {
				const riotId = parseRiotId(item);
				if (!riotId) return null;
				return (
					<Link
						key={item}
						href={`/summoner/${toSummonerSlug(riotId.gameName, riotId.tagLine)}`}
						className="inline-flex h-7 items-center rounded-full border bg-card px-3 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
					>
						{item}
					</Link>
				);
			})}
			<button
				type="button"
				onClick={clearSearchHistory}
				className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
			>
				<X className="size-3" />
				Clear
			</button>
		</div>
	);
}
```

- [ ] **Step 8: Create `src/components/layout/logo.tsx`**

```tsx
import { cn } from "@/lib/utils";

/** The Summon.gg wordmark. Size it through `className` (font size). */
export function Logo({ className }: { className?: string }) {
	return (
		<span className={cn("font-bold tracking-tight text-foreground", className)}>
			<span className="text-primary">Summon</span>.gg
		</span>
	);
}
```

- [ ] **Step 9: Create `src/components/layout/search-spotlight.tsx`**

```tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import SummonerSearch from "@/components/search/summoner-search";
import SearchHistory from "@/components/search/search-history";
import { Panel } from "@/components/ui/panel";

/** Full-screen search overlay opened from the navbar or the `/` shortcut. */
export function SearchSpotlight({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	return (
		<AnimatePresence>
			{open && (
				<motion.div
					key="spotlight"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
					className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 px-4 pt-[18vh] backdrop-blur-sm"
					onClick={onClose}
				>
					<motion.div
						initial={{ y: -12 }}
						animate={{ y: 0 }}
						exit={{ y: -12 }}
						transition={{ duration: 0.15, ease: "easeOut" }}
						className="w-full max-w-lg"
						onClick={(event) => event.stopPropagation()}
					>
						<Panel className="flex flex-col gap-3 p-4 shadow-xl">
							<SummonerSearch autoFocus />
							<SearchHistory />
							<p className="text-center text-xs text-muted-foreground">
								Press{" "}
								<kbd className="rounded border px-1.5 py-0.5 text-[10px]">Esc</kbd>{" "}
								to close
							</p>
						</Panel>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
```

- [ ] **Step 10: Rewrite `src/components/layout/navbar.tsx`**

The spotlight is tied to the path it was opened on, so a navigation closes it without a `setState` call inside an effect. That call is the current lint error at line 30.

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import ThemeToggle from "@/components/ui/theme-toggle";
import { Logo } from "@/components/layout/logo";
import { SearchSpotlight } from "@/components/layout/search-spotlight";
import { isTypingTarget } from "@/lib/ui/keyboard";

/**
 * Fixed top bar: logo, centered search trigger (hidden on the home page, which
 * has its own search) and theme toggle. `/` opens the search, `Esc` closes it.
 */
export default function Navbar() {
	const pathname = usePathname();
	const isHome = pathname === "/";
	const [openedOn, setOpenedOn] = useState<string | null>(null);
	const spotlightOpen = openedOn === pathname;

	const openSpotlight = useCallback(() => setOpenedOn(pathname), [pathname]);
	const closeSpotlight = useCallback(() => setOpenedOn(null), []);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				closeSpotlight();
				return;
			}
			if (
				event.key === "/" &&
				!isHome &&
				!isTypingTarget(event.target as HTMLElement | null)
			) {
				event.preventDefault();
				openSpotlight();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isHome, openSpotlight, closeSpotlight]);

	useEffect(() => {
		if (!spotlightOpen) return;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = "";
		};
	}, [spotlightOpen]);

	return (
		<>
			<header className="fixed inset-x-0 top-0 z-40 h-14 border-b bg-nav/90 backdrop-blur">
				<div className="mx-auto flex h-full max-w-7xl items-center gap-4 px-4 sm:px-6">
					<Link href="/" className="shrink-0 text-lg">
						<Logo />
					</Link>

					{isHome ? (
						<div className="flex-1" />
					) : (
						<button
							type="button"
							onClick={openSpotlight}
							className="mx-auto flex h-9 w-full max-w-md items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
						>
							<Search className="size-3.5" />
							<span>Search summoner...</span>
							<kbd className="ml-auto hidden rounded border px-1.5 py-0.5 text-[10px] sm:inline">
								/
							</kbd>
						</button>
					)}

					<ThemeToggle />
				</div>
			</header>

			<SearchSpotlight open={spotlightOpen} onClose={closeSpotlight} />
		</>
	);
}
```

- [ ] **Step 11: Verify in the browser**

With the dev server running, open `http://localhost:3000/summoner/Skaikru-HEAVN`.

Expected:
- The new navbar renders: the logo, the search trigger in the center, and the theme toggle.
- `/` opens the spotlight.
- Typing `/` inside the spotlight input adds the character and does not reopen the spotlight.
- `Esc` closes the spotlight, and so does a click on the backdrop.
- Searching a summoner navigates away and the spotlight closes.
- The history chips show the search.
- "Clear" empties the chips immediately.
- On `/` (home) the trigger is hidden.

Then, in DevTools, run `localStorage.setItem("summon-gg-search-history","{bad")` and reload. The spotlight must open with no chips and no console error.

- [ ] **Step 12: Typecheck and lint**

Run: `npm run typecheck` → no errors.
Run: `npx eslint src/components/layout src/components/search src/hooks/useSearchHistory.ts src/lib/search-history.ts src/lib/ui`
Expected: 0 errors. The navbar `setState`-in-effect error and the `search-history.tsx` one are gone.

---

### Task 6: Footer, maintenance screen and loader

**Files:**
- Rewrite: `src/components/layout/footer.tsx`
- Rewrite: `src/components/layout/maintenance-screen.tsx`
- Create: `src/hooks/useIsClient.ts`
- Rewrite: `src/components/ui/loader.tsx`
- Modify: `src/app/layout.tsx` (body/main markup)

**Interfaces:**
- Consumes: `Logo` (Task 5), `HeroBanner` (Task 4), `Panel` (Task 3), `getChampionSplash` (Task 1), `useDDragonVersion` (existing).
- Produces:
  - `useIsClient(): boolean`
  - `Loader(props: { fullScreen?: boolean; className?: string })` (default export, same API as today)
  - `MaintenanceScreen()` (default export, now a server component)
  - `Footer()` (default export)

- [ ] **Step 1: Rewrite `footer.tsx`**

The footer becomes a normal block at the bottom of the page instead of a fixed bar.

```tsx
"use client";

import Link from "next/link";
import { useDDragonVersion } from "@/hooks/useDDragonVersion";

/** Slim page footer: patch, changelog and policy links, Riot legal notice. */
export default function Footer() {
	const { data: version } = useDDragonVersion();

	return (
		<footer className="mt-auto border-t bg-nav">
			<div className="mx-auto flex max-w-7xl flex-col items-center gap-1 px-4 py-4 text-[11px] text-muted-foreground sm:px-6">
				<div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
					<span className="font-medium text-foreground">Summon.gg</span>
					<span>Patch {version ?? "..."}</span>
					<Link href="/changelog" className="hover:text-foreground">
						Changelog
					</Link>
					<Link href="/policy" className="hover:text-foreground">
						Policy
					</Link>
					<span>&copy; {new Date().getFullYear()}</span>
				</div>
				<p className="text-center">
					Summon.gg isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the
					views or opinions of Riot Games or anyone officially involved in
					producing or managing Riot Games properties.
				</p>
			</div>
		</footer>
	);
}
```

- [ ] **Step 2: Rewrite `maintenance-screen.tsx` as a server component**

```tsx
import { HeroBanner } from "@/components/ui/hero-banner";
import { Panel } from "@/components/ui/panel";
import { Logo } from "@/components/layout/logo";
import { getChampionSplash } from "@/lib/icon-helpers";

const FEATURES = ["Ranked Stats", "Match History", "Champion Mastery"] as const;

/** Full-page screen shown while `MAINTENANCE_MODE` is on. */
export default function MaintenanceScreen() {
	return (
		<HeroBanner
			splashUrl={getChampionSplash("Heimerdinger")}
			objectPosition="center 25%"
			className="min-h-screen"
		>
			<div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
				<Logo className="text-5xl sm:text-6xl" />

				<span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-sm font-medium text-gold">
					<span className="size-2 rounded-full bg-gold" />
					Under maintenance
				</span>

				<p className="max-w-md text-base text-muted-foreground">
					Summon.gg is getting an upgrade. We&apos;ll be back shortly.
				</p>

				<div className="flex flex-wrap justify-center gap-2">
					{FEATURES.map((feature) => (
						<Panel key={feature} className="px-3 py-2 text-sm text-foreground">
							{feature}
						</Panel>
					))}
				</div>
			</div>
		</HeroBanner>
	);
}
```

- [ ] **Step 3: Create `src/hooks/useIsClient.ts`**

```ts
import { useSyncExternalStore } from "react";

function subscribe(): () => void {
	return () => {};
}

/**
 * `true` after hydration, `false` during server render. Replaces the
 * `useEffect(() => setMounted(true))` pattern that React 19 lint rejects.
 */
export function useIsClient(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
}
```

- [ ] **Step 4: Rewrite `src/components/ui/loader.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { useIsClient } from "@/hooks/useIsClient";

/** Three pulsing dots. */
function Dots({ className }: { className?: string }) {
	return (
		<div className={cn("flex items-center justify-center gap-1.5", className)}>
			{[0, 1, 2].map((index) => (
				<motion.span
					key={index}
					className="size-2 rounded-full bg-primary"
					animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
					transition={{ duration: 1, repeat: Infinity, delay: index * 0.15 }}
				/>
			))}
		</div>
	);
}

/** Page-covering loader with the logo, rendered into `document.body`. */
function FullScreenLoader() {
	const isClient = useIsClient();
	if (!isClient) return null;

	return createPortal(
		<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background">
			<Logo className="text-4xl" />
			<Dots />
		</div>,
		document.body,
	);
}

/** Inline dots loader, or a full-screen one with `fullScreen`. */
export default function Loader({
	fullScreen,
	className,
}: {
	fullScreen?: boolean;
	className?: string;
}) {
	if (fullScreen) return <FullScreenLoader />;
	return <Dots className={cn("[&>span]:bg-muted-foreground", className)} />;
}
```

- [ ] **Step 5: Update `src/app/layout.tsx`**

- Remove the `import AuroraBackground from "@/components/ui/aurora-background";` line.
- Remove both `<AuroraBackground />` elements.
- Replace `<main className="flex-1 pt-14 pb-12">{children}</main>` with `<main className="flex-1 pt-14">{children}</main>`.

The maintenance branch becomes:
```tsx
					{maintenance ? (
						<MaintenanceScreen />
					) : (
```
and the non-maintenance fragment starts directly with `<QueryProvider>`. Keep the `maintenance` check, `Toaster`, `Navbar`, `Analytics` and `Footer` as they are.

- [ ] **Step 6: Verify in the browser**

- `http://localhost:3000/summoner/Skaikru-HEAVN`: the full-screen loader shows the logo and dots, then the page renders. The footer sits at the bottom of the content, not fixed, with the Riot notice. There is no aurora background.
- To check the maintenance screen without touching the database, temporarily change `{maintenance ? (` to `{true ? (` in `layout.tsx`, reload `/`, confirm the Heimerdinger screen in dark and light mode, then **revert the change** and confirm `git diff src/app/layout.tsx` shows no `true ? (`.

- [ ] **Step 7: Typecheck and lint**

Run: `npm run typecheck` → no errors.
Run: `npx eslint src/components/layout src/components/ui/loader.tsx src/hooks/useIsClient.ts src/app/layout.tsx`
Expected: 0 errors. The `loader.tsx` `setState`-in-effect error is gone.

---

### Task 7: Remove the aurora layer, page transition and dead code

**Files:**
- Delete: `src/components/Aurora.jsx`, `src/components/Aurora.css`, `src/components/SoftAurora.jsx`, `src/components/SoftAurora.css`, `src/components/ui/aurora-background.tsx`, `src/components/ui/aurora-backgorund-2.tsx`, `src/providers/lenis-provider.tsx`, `src/components/ui/loader-mini.tsx`, `src/components/summoner/sidebar-skeleton.tsx`, `src/components/ui/page-transition.tsx`, `src/app/template.tsx`
- Modify: `package.json`, `package-lock.json`, `pnpm-lock.yaml`

The root `template.tsx` re-mounts and slides the whole page on every navigation, including the tab switches coming in Phase 2. It is removed to fit the calmer design.

- [ ] **Step 1: Confirm nothing else imports the files**

Use the Grep tool on `src` with this pattern:
```
Aurora|SoftAurora|aurora-background|aurora-backgorund-2|lenis-provider|LenisProvider|loader-mini|sidebar-skeleton|SidebarSkeleton|page-transition|PageTransition
```
Expected: matches only inside the files being deleted (and `src/app/template.tsx`). If anything else matches, stop and report it.

- [ ] **Step 2: Delete the files**

```bash
git rm src/components/Aurora.jsx src/components/Aurora.css src/components/SoftAurora.jsx src/components/SoftAurora.css src/components/ui/aurora-background.tsx src/components/ui/aurora-backgorund-2.tsx src/providers/lenis-provider.tsx src/components/ui/loader-mini.tsx src/components/summoner/sidebar-skeleton.tsx src/components/ui/page-transition.tsx src/app/template.tsx
```

- [ ] **Step 3: Remove unused dependencies and move `shadcn` to dev**

`ogl` was only used by the two aurora files. `motion` duplicates `framer-motion`. `lenis` was only used by the deleted provider. `shadcn` is needed only at build time for `@import "shadcn/tailwind.css"`; the Docker build stage installs dev dependencies.

```bash
npm uninstall motion lenis ogl shadcn
npm install -D shadcn@^4.1.0
```

Then confirm none of the removed packages is still imported:
```
from "motion|from 'motion|from "lenis|from "ogl
```
(Grep tool on `src`). Expected: no matches.

- [ ] **Step 4: Sync the pnpm lockfile**

```bash
pnpm install --lockfile-only
```
Expected: `pnpm-lock.yaml` updated; `git diff --stat pnpm-lock.yaml` shows changes. It must list `vitest` and no longer list `ogl`, `lenis` or `motion`.

- [ ] **Step 5: Typecheck, test and lint**

Run: `npm run typecheck` → no errors.
Run: `npm test` → all green.
Run: `npm run lint`

Expected: **6 errors**, all in files outside Phase 0 that later phases rewrite:

| File | Errors |
|---|---|
| `src/app/api/matches/[id]/route.ts` | 1 × no-explicit-any |
| `src/app/api/matches/[id]/timeline/route.ts` | 1 × no-explicit-any |
| `src/app/api/matches/route.ts` | 2 × no-explicit-any |
| `src/app/summoner/[name]/live/page.tsx` | 1 × setState-in-effect |
| `src/components/summoner/live-game-banner.tsx` | 1 × setState-in-effect |

Any other error means a regression introduced in this phase; fix it before continuing.

---

### Task 8: Phase verification and the phase commit

**Files:** none new.

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: build succeeds, and `/dev/ui` is listed as a dynamic route. Use `npm run start` to confirm `http://localhost:3000/dev/ui` returns 404 in production. Stop the server afterwards.

- [ ] **Step 2: Manual check in the Browser pane — dark mode**

With `npm run dev`, visit each page and confirm there is no aurora/glow, the new tokens apply, the navbar and footer render, and the console has no errors. Pages:
- `/`
- `/summoner/Skaikru-HEAVN`
- `/match/<any id from the profile>`
- `/changelog`
- `/policy`
- `/dev/ui`
- a bad URL such as `/nope`

Old page bodies looking rough is expected; they are redesigned in Phases 2–6.

- [ ] **Step 3: Manual check — light mode and mobile**

- Toggle to light mode and repeat the same page list. The navbar, footer, `/dev/ui` primitives and chips must stay legible.
- Resize to 375px wide: the navbar fits without horizontal scroll, the search trigger shrinks, and the footer wraps.

- [ ] **Step 4: Commit the phase (single commit)**

```bash
git add -A
git status
git commit -m "$(cat <<'EOF'
feat(ui): redesign foundation — tokens, primitives, shell

- Palette A design tokens for dark and light mode; drop aurora and glow
- UI primitives: Panel, Chip, EmptyState, StatRing, TabsNav, HeroBanner,
  RankEmblem, ChampionIcon, ItemSlots, SpellRuneStack, dev gallery
- Restyled navbar with search spotlight and "/" shortcut, static footer,
  splash maintenance screen and loader
- Search history via useSyncExternalStore; fixes React 19 lint errors in
  navbar, search history and loader
- Remove dead aurora, lenis, page transition and skeleton code; drop
  motion, lenis and ogl; shadcn moved to devDependencies
- Add Vitest with tests for the new pure helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```
Before committing, check that `git status` shows no `.superpowers/`, `.env` or `test_matches.json` changes being added. If any appear, unstage them with `git restore --staged <path>`.
