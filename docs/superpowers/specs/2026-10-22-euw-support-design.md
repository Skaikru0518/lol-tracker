# EUW support — design

Add EUW next to EUNE. A platform picker sits in front of the search input and the search looks on the chosen platform first; when the Riot ID has no summoner there, the app uses the platform where the account is active.

## Decisions (agreed)

- Platforms: EUNE and EUW only. Both use the `europe` regional routing for accounts and matches, so only platform-host calls change. Adding a platform later is one entry in a list.
- Detection: picker + auto. The picked platform is tried first; on a summoner 404 the Riot "active region" endpoint names the account's platform.
- **No platform in the URL.** Profiles stay at `/summoner/{Name-TAG}/…`. The platform is a property of the account (Riot IDs and puuids are global), stored on `Account`.
- One tracked platform per account. A player who has summoners on both is shown on the platform last resolved.
- Free rotation stays on EUNE (rotation is region-independent).

## Platform model

`src/lib/game/platforms.ts`:

```ts
export const PLATFORMS = {
	eune: { host: "eun1", label: "EUNE" },
	euw: { host: "euw1", label: "EUW" },
} as const;
export type Platform = keyof typeof PLATFORMS;
export const DEFAULT_PLATFORM: Platform = "eune";
```

Pure helpers:

- `isPlatform(value): value is Platform`
- `platformUrl(platform)` → `https://{host}.api.riotgames.com`
- `platformFromRiotRegion(region)` → maps the active-region answer (`"eun1"`, `"euw1"`) to a platform, `null` for unsupported regions

The rate limiter already keeps one limiter per host, so euw1 gets its own budget automatically.

## Riot wrappers

Every platform-host wrapper takes the platform first: `getSummonerByPuuid(platform, puuid)`, `getRankedByPuuid(platform, puuid)`, `getTopMasteries(platform, puuid, count)`, `getAllMasteries(platform, puuid)`, `getLiveGame(platform, puuid)`, `getApexLeague(platform, tier, queue)`. `getChampionRotation()` keeps EUNE. `BASE_URL` is removed; `EURPOE_URL` is renamed `EUROPE_URL`.

New `getActiveRegion(puuid)` → `GET {EUROPE_URL}/riot/account/v1/region/by-game/lol/by-puuid/{puuid}` → `{ puuid, game, region }` (Zod-validated). Verify the path against the Riot developer docs before implementing; if it differs, use the documented one.

## Database

- `Account.platform String?` — **one migration, applied by the user**. The migration backfills existing rows with `'eune'` (they were all resolved on EUNE). `null` means "not resolved yet".
- No other table changes: Summoner, RankedEntry, ChampionMastery, LPHistory, Match and achievements stay keyed by puuid / match id.
- Platform switch (an account resolved on another platform than stored): `Account.platform` is updated and its `Summoner`, `RankedEntry` and `ChampionMastery` rows are replaced by the new platform's data. LP history is kept (rare case; documented limitation).
- Server code reads an account's platform with `platformOf(puuid)` (Account row; `DEFAULT_PLATFORM` when missing or null), so client hooks keep passing only puuid. The exception is `/api/ranked/batch` (live-game participants who may have no Account): it takes `platform` explicitly and stores it on the placeholder accounts it creates.

## Resolving an account's platform

`locatePlatform({ hint, stored }, { trySummoner, activeRegion })` drives both entry points. Riot access is injected (`trySummoner(platform)` → summoner or `null` on 404, `activeRegion()` → region string or `null`), so the order is tested without Riot. Order:

1. **Hint** (search picker), if given: try it; a summoner there wins.
2. **Stored** `Account.platform`, if set: try it.
3. **Active region** (`getActiveRegion`): if it maps to a supported platform not tried yet, try it.
4. Nothing found → not found.

Entry points:

- **Profile page** (`getSummonerProfile(slug)`, no hint): stored platform first, else active region. Shared links and scoreboard links therefore resolve without any platform in the URL. At most one active-region call per new account; afterwards the stored platform is used.
- **Search** (`GET /api/summoner/locate?gameName=&tagLine=&platform=`): runs the order above with the picked platform as hint, stores the result on the account, and answers `{ slug }` or 404. `SummonerSearch.go()` calls it, then navigates to `/summoner/{slug}`; a 404 navigates to the not-found page as today.

## Search UI

- `PlatformPicker` (small select: EUNE / EUW) before the input in `SummonerSearch` — hero, header spotlight, both not-found pages. The choice is remembered in localStorage (`summon-gg-platform`, default EUNE; reads/writes in try/catch).
- While `locate` runs, the input shows the existing loading state.
- Suggestions (`/api/summoner-search`) and server-wide recent searches (`RecentSearch`) gain `platform` and show a small platform label; links are unchanged.
- Local search history stores `{ riotId, platform }` objects; old plain `"Name#TAG"` strings are read with platform EUNE. History chips go through `locate` with their platform as hint.

## Platform-scoped features

- **Profile shell:** `SummonerProvider` gains `platform`; the hero shows its label instead of the hard-coded "EUNE"; metadata says `(EUW)` / `(EUNE)`.
- **Ranked:** `resolveRankedEntries`, the ranked cron and `/api/ranked` use `platformOf(puuid)`. Same cron budget and cursor.
- **Mastery:** `resolveTopMasteries` / `resolveAllMasteries` use `platformOf(puuid)`.
- **Live game:** spectator call on the account's platform; participant ranks via `/api/ranked/batch?platform=` with the viewed profile's platform.
- **Apex cut-offs:** cached per platform (AppSettings key `apex-cutoffs:{platform}`; the old `apex-cutoffs` key is ignored and re-fetched as `apex-cutoffs:eune`). In-flight and back-off state per platform. `/api/ranked/apex-cutoffs?platform=` (default EUNE); `useApexCutoffs(platform)`. The cron refreshes every platform (8 Riot calls a day). EUW's ladder update time may differ; one cron run after the later of the two covers both.
- **MMR:** uses the account's platform for cut-offs; the LP and lobby signals are platform-agnostic.

## Copy

"EUNE" in the hero and profile metadata becomes the profile's platform label. The home tagline says "EUNE & EUW". The summoner not-found text drops "only tracks EUNE accounts".

## Testing (TDD, Vitest)

- `platforms.ts`: `isPlatform`, `platformUrl`, `platformFromRiotRegion` (eun1, euw1, unsupported).
- `locatePlatform`: hint found; hint missing → stored; stored missing → active region; active region unsupported → not found; a platform is never tried twice; no hint + no stored → active region; the active-region call is skipped when an earlier try succeeds.
- Search history parsing: legacy strings → EUNE entries; objects kept; invalid entries dropped.
- Apex cut-off cache key per platform.
- Browser check: one EUW profile opened once via search with the EUW picker, one EUW profile opened by URL with no stored platform, one EUNE profile. No reload loops (shared dev key).

## Out of scope

- Regions outside Europe (different routing for accounts/matches).
- Tracking both platforms of the same puuid at once.
- Platform in profile URLs.
- Per-platform leaderboards or rotation.
