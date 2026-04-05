import { type ChangelogEntry } from "../../changelog-type";

const changelog: ChangelogEntry = {
	slug: "2026-04-03",
	title: "Achievement System",
	date: "2026-04-03",
	summary:
		"Players now earn dynamic achievement badges based on their recent performance, and individual match badges highlight standout plays. Layout reworked with ranked in the header and reorganized sidebars.",
	changes: [
		{
			category: "feature",
			title: "Dynamic Achievement Badges",
			description:
				"A new badge system that evaluates your recent matches and awards achievements in real-time. Badges are displayed on your profile between the header and match history. They update every time your profile loads, and a background cron job keeps them fresh.",
		},
		{
			category: "feature",
			title: "Combat Achievements",
			description: "Achievements based on in-game combat performance (last 10 matches).",
			table: [
				{ name: "Pentakill", requirement: "Got a pentakill" },
				{ name: "Untouchable", requirement: "0 deaths with 3+ K+A" },
				{ name: "KDA God", requirement: "Average KDA of 5+" },
				{ name: "First Blood Hunter", requirement: "First blood in 5+ matches" },
				{ name: "Feeder", requirement: "Averaging 10+ deaths per game" },
			],
		},
		{
			category: "feature",
			title: "Mastery Achievements",
			description: "Achievements rewarding mechanical skill and game knowledge.",
			table: [
				{ name: "CS Machine", requirement: "Avg 8+ CS/min in 25+ min games (last 10)" },
				{ name: "Vision Pro", requirement: "100+ vision score in a match (last 5)" },
				{ name: "Damage Dealer", requirement: "Avg 40k+ damage to champions (last 10)" },
				{ name: "Carry", requirement: "50%+ of team damage in a match (last 10)" },
				{ name: "Tank", requirement: "50k+ damage taken in a match (last 10)" },
				{ name: "Objective Hunter", requirement: "Avg 3+ dragon kills (last 10)" },
			],
		},
		{
			category: "feature",
			title: "Playstyle Achievements",
			description: "Achievements reflecting your playstyle and champion pool.",
			table: [
				{ name: "One Trick", requirement: "70%+ of last 10 on one champion" },
				{ name: "Diverse Player", requirement: "5+ different champions in last 10" },
				{ name: "On Fire", requirement: "Won all of last 5 matches" },
				{ name: "Tilted", requirement: "Lost all of last 5 matches" },
			],
		},
		{
			category: "feature",
			title: "Role Achievements",
			description: "Awarded based on your most played role across last 50 matches (30%+ required).",
			table: [
				{ name: "Top Main", requirement: "Most played role is Top" },
				{ name: "Jungle Main", requirement: "Most played role is Jungle" },
				{ name: "Mid Main", requirement: "Most played role is Mid" },
				{ name: "ADC Main", requirement: "Most played role is ADC" },
				{ name: "Support Main", requirement: "Most played role is Support" },
			],
		},
		{
			category: "feature",
			title: "Queue Enjoyer Achievements",
			description: "Achievements based on your preferred queue type (last 25 matches).",
			table: [
				{ name: "Solo/Duo Enjoyer", requirement: "12+ Solo/Duo games" },
				{ name: "Flex Enjoyer", requirement: "12+ Flex games" },
				{ name: "Normal Enjoyer", requirement: "12+ non-ranked games" },
			],
		},
		{
			category: "feature",
			title: "Rank Achievements",
			description: "Based on your current ranked tier.",
			table: [
				{ name: "Diamond+", requirement: "Diamond rank or above" },
				{ name: "Master+", requirement: "Master, Grandmaster, or Challenger" },
				{ name: "Challenger", requirement: "Challenger rank" },
			],
		},
		{
			category: "feature",
			title: "Match Performance Badges",
			description: "Per-match badges awarded to standout players. Shown on collapsed match cards and in the expanded scoreboard next to each player.",
			table: [
				{ name: "MVP", requirement: "Most kills + assists on the winning team" },
				{ name: "Damage King", requirement: "Most damage to champions" },
				{ name: "Tank God", requirement: "Most damage taken" },
				{ name: "Vision King", requirement: "Highest vision score" },
				{ name: "CS King", requirement: "Most CS" },
				{ name: "Gold Lead", requirement: "Most gold earned" },
				{ name: "CC Machine", requirement: "Most crowd control time" },
				{ name: "First Blood", requirement: "Got the first kill" },
				{ name: "Pentakill", requirement: "Got a pentakill" },
				{ name: "Quadrakill", requirement: "Got a quadrakill" },
				{ name: "Unkillable", requirement: "0 deaths with 3+ K+A" },
				{ name: "Solo Carry", requirement: "Most kills + fewest deaths on the team (5+ kills)" },
				{ name: "Healer", requirement: "Most healing on teammates (5k+)" },
				{ name: "Tower Destroyer", requirement: "Most turret kills (2+)" },
				{ name: "Bad Luck", requirement: "Best performer on the losing team" },
			],
		},
		{
			category: "feature",
			title: "Expandable Match Cards",
			description:
				"Click any match card to expand a mini scoreboard showing all 10 players with champion, rank, summoner spells, runes, items, badges, KDA, CS/min, gold, and damage. A link at the bottom takes you to the full match detail page.",
		},
		{
			category: "improvement",
			title: "Layout Rework",
			description:
				"Ranked cards moved to the profile header. Left sidebar now shows Stats overview and Champion Mastery. Right sidebar has LP History, Roles, and Recently Played.",
		},
		{
			category: "improvement",
			title: "SEO & Policy Updates",
			description:
				"Added robots.ts and dynamic sitemap.ts for better search engine indexing. Updated privacy policy with free-to-use disclaimer and GitHub contact link. Improved metadata with more keywords and OG image.",
		},
	],
};

export default changelog;
