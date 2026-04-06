import { type ChangelogEntry } from "../../changelog-type";

const changelog: ChangelogEntry = {
	slug: "2026-04-07",
	title: "Match Cards Redesign",
	date: "2026-04-07",
	summary:
		"Complete match history card redesign with sectioned layout, LP tracking, new match badges, and refined achievement system.",
	changes: [
		{
			category: "feature",
			title: "New Match Card Layout",
			description:
				"Match history cards redesigned with a sectioned layout — Victory/Defeat result block, champion identity, KDA, items, CS/min and damage stats, all separated by vertical dividers. Cleaner, more informative at a glance.",
		},
		{
			category: "feature",
			title: "LP Change Tracking",
			description:
				"Ranked match cards now display LP gained or lost per match, calculated from LP history snapshots. Shows +/- values with color coding — green for gains, red for losses.",
		},
		{
			category: "feature",
			title: "Badge Overflow",
			description:
				"When a player earns more than 2 badges in a match, the collapsed card shows the first 2 and a +X indicator. Expand the card to see all badges.",
		},
		{
			category: "feature",
			title: "New Match Badges",
			description: "Added new per-match performance badges.",
			table: [
				{ name: "Quadrakill", requirement: "Got a quadrakill" },
				{ name: "Solo Carry", requirement: "Most kills + fewest deaths on the team (5+ kills)" },
				{ name: "Healer", requirement: "Most healing on teammates (10k+)" },
				{ name: "Tower Destroyer", requirement: "Most turret kills (2+)" },
				{ name: "Bad Luck", requirement: "Best performer on the losing team" },
				{ name: "Honorable", requirement: "MVP of the losing team (5+ K+A)" },
				{ name: "Soulless", requirement: "Picked Teemo" },
				{ name: "Glass Cannon", requirement: "Most damage dealt AND most deaths" },
				{ name: "AFK Farmer", requirement: "200+ CS but 0 kills and 0 assists" },
			],
		},
		{
			category: "improvement",
			title: "Achievement Tuning",
			description: "Refined achievement detection windows and thresholds for better balance.",
			table: [
				{ name: "Untouchable", requirement: "Now checks last 5 matches (was 10)" },
				{ name: "CS Machine", requirement: "Average 8+ CS/min in 25+ min games (was single match)" },
				{ name: "Damage Dealer", requirement: "Average 40k+ damage (was single match)" },
				{ name: "Vision Pro", requirement: "Average 60+ vision score over last 10 (was 100+ single)" },
				{ name: "Meatshield", requirement: "Renamed from Tank to avoid confusion with role" },
				{ name: "One Trick", requirement: "Now checks last 20 matches (was 10)" },
				{ name: "Diverse Player", requirement: "5+ champions (was 7)" },
				{ name: "Objective Hunter", requirement: "Average 3+ dragon kills (was single match)" },
				{ name: "Queue Enjoyers", requirement: "13+ games in last 25 (was 12)" },
			],
		},
		{
			category: "improvement",
			title: "Match Detail Header",
			description:
				"Queue name, average lobby rank, and game duration now displayed in a single row on the match detail page. Unranked placeholder shown while rank data loads.",
		},
		{
			category: "improvement",
			title: "Stats Filtering",
			description:
				"Overview stats (last 50 games) now exclude ARAM and Arena matches for more relevant ranked/normal statistics.",
		},
	],
};

export default changelog;
