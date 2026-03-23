import { type ChangelogEntry } from "../../changelog-type";

const changelog: ChangelogEntry = {
	slug: "2026-03-22",
	title: "Launch Day",
	date: "2026-03-22",
	summary:
		"Summon.gg is live! The first version includes summoner profiles, match history with detailed breakdowns, live game tracking, and a whole bunch of charts and analytics.",
	changes: [
		{
			category: "feature",
			title: "Summoner Profiles",
			description:
				"Search any summoner by Riot ID and view their profile — ranked stats with emblem badges, top champion mastery with animated point counters, and a list of recently played teammates.",
		},
		{
			category: "feature",
			title: "Match History",
			description:
				"Browse up to 50 recent matches with a three-section card layout showing champion, KDA, items, runes, summoner spells, and team compositions. Filter by queue type (Solo, Flex, ARAM, Normal) and load more as you scroll.",
		},
		{
			category: "feature",
			title: "Match Detail Page",
			description:
				"Click any match to see the full breakdown — both team tables with expandable player stats, skill order grids, item build timelines, kill maps on Summoner's Rift, and ban displays. Every player name links to their profile.",
		},
		{
			category: "feature",
			title: "Charts & Analytics",
			description:
				"Gold advantage over time, damage dealt per player, vision score comparison, kill timeline, CS & gold progression, and a team stats face-off — all powered by Recharts.",
		},
		{
			category: "feature",
			title: "Objectives & Events Timeline",
			description:
				"Horizontal timeline bar showing dragon, baron, herald, and void grub takes with real icons. Expandable event log with kills, towers, and objectives — filterable by type.",
		},
		{
			category: "feature",
			title: "Live Game Detection",
			description:
				"If a summoner is currently in a game, a banner shows up with team compositions, bans, game mode, and a real-time timer. Champ select shows a yellow pulsing indicator, in-game shows green. Click through to a dedicated live game page.",
		},
		{
			category: "feature",
			title: "Champion Detail Page",
			description:
				"View champion-specific stats for any summoner — filtered match history, win rate, average KDA, and mastery data for that champion.",
		},
		{
			category: "design",
			title: "Dark Theme with Aurora Background",
			description:
				"Custom dark theme with cyan and magenta accents. Animated aurora background (WebGL) with automatic fallback to a static CSS gradient for lower-end devices. GPU performance check runs on first load.",
		},
		{
			category: "design",
			title: "Spotlight Search",
			description:
				"Click the search bar in the navbar to open a centered spotlight overlay — Mac Spotlight style. Escape to close, auto-focuses the input, locks background scroll.",
		},
		{
			category: "design",
			title: "Branded Loading Experience",
			description:
				"Full-screen Summon.gg splash screen with pulsing dots while data loads. Shimmer skeleton animations for every component. Page transitions with framer-motion on every route change.",
		},
		{
			category: "improvement",
			title: "Mobile Responsive",
			description:
				"Every page and component is optimized for mobile — match cards adapt, table columns hide on small screens, charts resize, grids collapse to single column.",
		},
	],
};

export default changelog;
