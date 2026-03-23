import { type ChangelogEntry } from "../../changelog-type";

const changelog: ChangelogEntry = {
	slug: "2026-03-23",
	title: "Database, LP Tracking & Polish",
	date: "2026-03-23",
	summary:
		"Big backend upgrade today — all data is now cached in PostgreSQL for near-instant loading. Plus LP history tracking, player ranks in match details, auto-refresh, and a bunch of visual improvements.",
	changes: [
		{
			category: "feature",
			title: "Prisma DB Cache Layer",
			description:
				"All Riot API responses are now cached in PostgreSQL via Prisma. Accounts (10min), summoner data (5min), ranked (2min), mastery (30min), and match data (forever). Second visits load almost instantly from the database.",
		},
		{
			category: "feature",
			title: "LP History Tracking",
			description:
				"Every time your ranked data is fetched and LP has changed, we save a snapshot. Over time this builds up an LP history chart on the right sidebar. The more you use the app, the more detailed it gets.",
		},
		{
			category: "feature",
			title: "Player Ranks in Match Details",
			description:
				"The match detail page now shows every player's ranked badge next to their name. Fetched via a batch API call, and the correct queue is shown — Solo rank for Solo games, Flex rank for Flex games. Unranked players get a dimmed badge.",
		},
		{
			category: "feature",
			title: "Average Lobby Rank",
			description:
				"Match headers now display the average rank of all 10 players, calculated with a point system from Iron IV (1) to Challenger (31). Shows the rank emblem and colored text.",
		},
		{
			category: "feature",
			title: "Auto-Refresh Timer",
			description:
				"The summoner page now auto-refreshes all data every 5 minutes with a visible countdown next to the summoner level. Manual refresh has a 3-minute cooldown so you don't accidentally spam the API.",
		},
		{
			category: "feature",
			title: "Changelog Page",
			description:
				"You're looking at it! A blog-style changelog where we post updates about new features and improvements.",
		},
		{
			category: "improvement",
			title: "Champion Name Fixes",
			description:
				"MonkeyKing now correctly displays as Wukong, and FiddleSticks as Fiddlesticks. Also fixed the FiddleSticks champion icon returning a 403 from Data Dragon.",
		},
		{
			category: "improvement",
			title: "Unified Type System",
			description:
				"Refactored the entire codebase to use Zod validators as the single source of truth for all API types. No more duplicate interfaces or unknown types floating around.",
		},
		{
			category: "design",
			title: "Dark/Light Theme Toggle",
			description:
				"Added a theme toggle in the navbar — switch between dark and light mode. Uses next-themes with system preference support.",
		},
		{
			category: "design",
			title: "Improved Splash Loading",
			description:
				"The full-screen loader now uses createPortal to render outside the page transition wrapper — no more flickering on page navigation. The splash stays until all core data is loaded.",
		},
		{
			category: "fix",
			title: "Rune & Spell Icon Sizes",
			description:
				"Fixed an issue where summoner spell and rune icons in the match detail table were inconsistently sized. Added fixed min-width/min-height to prevent flex compression.",
		},
		{
			category: "fix",
			title: "Duplicate Key Warning",
			description:
				"Fixed React 'duplicate key' warnings in the team table (Fragment key) and match card team icons (bot players with same puuid).",
		},
	],
};

export default changelog;
