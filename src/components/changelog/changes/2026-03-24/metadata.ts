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
				"All API routes now return cached data from the database immediately, even if it's slightly outdated. Fresh data is fetched from Riot in the background and will show up on the next visit or refresh. This means returning summoner pages load in milliseconds instead of seconds.",
		},
		{
			category: "feature",
			title: "Automated LP Tracking (Cron Job)",
			description:
				"An external cron job now pings our API every 5 minutes to check ranked data for all tracked summoners. LP snapshots are saved automatically whenever LP changes — no need to have the page open. The LP history graph will fill up on its own over time.",
		},
		{
			category: "feature",
			title: "Dual LP History Charts",
			description:
				"The LP History section now shows separate charts for Solo/Duo and Flex queues, each with their own rank badge, LP counter, and trend line. Both queues are tracked independently.",
		},
		{
			category: "feature",
			title: "Smoke Effect on Landing Page",
			description:
				"The Summon.gg title on the home page now has a subtle animated glow/smoke effect behind it — pulsing cyan and magenta gradients that breathe behind the text.",
		},
		{
			category: "feature",
			title: "Changelog System",
			description:
				"Added a /changelog page with a vertical timeline layout, and individual changelog entries with numbered accordion items, category badges, and expandable descriptions. You're reading it right now!",
		},
		{
			category: "improvement",
			title: "Batch Database Queries",
			description:
				"Match lookups went from 50 individual DB queries to a single batch query. Combined with parallel Riot API fetches (10 at a time), first-time match loading dropped from ~20 seconds to ~2 seconds.",
		},
		{
			category: "improvement",
			title: "Removed Next.js Fetch Cache",
			description:
				"Simplified the caching architecture by removing the Next.js server fetch cache layer. Prisma DB is now the sole cache — one cache to rule them all, fewer things to go wrong.",
		},
		{
			category: "improvement",
			title: "Parallel Match Fetching",
			description:
				"When loading matches for the first time, we now fetch 10 matches simultaneously instead of one by one. This cuts initial load time by roughly 10x for new summoners.",
		},
		{
			category: "design",
			title: "Category Badges",
			description:
				"New reusable badge components for feature categories — cyan for features, green for improvements, orange for fixes, fuchsia for design. Built on shadcn Badge with outlined tint style.",
		},
		{
			category: "fix",
			title: "External Cron Service Support",
			description:
				"The cron endpoint now accepts the secret via query parameter in addition to the Authorization header, making it compatible with free external cron services like cron-job.org.",
		},
	],
};

export default changelog;
