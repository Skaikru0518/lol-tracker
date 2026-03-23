import { type ChangelogEntry } from "../../changelog-type";

const changelog: ChangelogEntry = {
	slug: "2026-03-24",
	title: "Speed & Smarts",
	date: "2026-03-24",
	summary:
		"Major performance upgrade — pages now load almost instantly thanks to stale-while-revalidate caching and batch queries. Plus automated LP tracking runs in the background every 5 minutes.",
	changes: [
		{
			category: "feature",
			title: "Stale-While-Revalidate Caching",
			description:
				"All API routes now return cached data instantly from the database, even if slightly outdated. Fresh data is fetched from Riot in the background. Removed the Next.js fetch cache layer — Prisma DB is now the sole cache, simpler and more predictable.",
		},
		{
			category: "feature",
			title: "Automated LP Tracking",
			description:
				"An external cron job pings our API every 5 minutes to check ranked data for all tracked summoners. LP snapshots are saved automatically whenever LP changes — no need to have the page open.",
		},
		{
			category: "feature",
			title: "Dual LP History Charts",
			description:
				"The LP History section now shows separate charts for Solo/Duo and Flex queues. Shows \"Not enough data yet\" when there aren't enough snapshots. LP change indicator shows the difference between the last two snapshots.",
		},
		{
			category: "feature",
			title: "Live Game — Avg Lobby Rank",
			description:
				"The live game page now shows the average lobby rank in the header and individual rank badges next to each player's champion icon.",
		},
		{
			category: "feature",
			title: "Privacy & Data Policy",
			description:
				"Added a /policy page explaining what data we collect (all from Riot API, publicly available), how we store it, and what we don't collect. Linked from the footer.",
		},
		{
			category: "improvement",
			title: "10x Faster Match Loading",
			description:
				"Match lookups went from 50 individual DB queries to a single batch query, and new matches are now fetched 10 at a time in parallel. First-time load dropped from ~20s to ~2s.",
		},
		{
			category: "improvement",
			title: "Live Game Polish",
			description:
				"Champ Select (yellow) / In Game (green) status with pulsing dot. Timer no longer shows negative values. Mobile-friendly banner with evenly spaced status, queue type, and timer.",
		},
		{
			category: "improvement",
			title: "Mobile Layout Fixes",
			description:
				"Match detail header reorganized for mobile — queue name top-left, duration top-right, avg rank centered below. Team table CS column hides on small screens. Fixed sidebar spacing issues.",
		},
		{
			category: "improvement",
			title: "SEO & Metadata",
			description:
				"Open Graph, Twitter cards, keywords, author info, title templates, favicons (SVG + ICO), and Apple touch icon.",
		},
		{
			category: "fix",
			title: "Ranked & Display Fixes",
			description:
				"Solo/Duo always appears above Flex. MonkeyKing displays as Wukong. Match timestamps now show granular times (5m ago, 10m ago) instead of just \"Just now\" for anything under an hour.",
		},
	],
};

export default changelog;
