import { type ChangelogEntry } from "../../changelog-type";

const changelog: ChangelogEntry = {
	slug: "2026-04-03",
	title: "Achievement System",
	date: "2026-04-03",
	summary:
		"Players now earn dynamic achievement badges based on their recent performance. Badges appear on the profile and update automatically — earn them, lose them.",
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
				{ name: "CS Machine", requirement: "8+ CS/min in a 25+ min game (last 10)" },
				{ name: "Vision Pro", requirement: "100+ vision score (last 5)" },
				{ name: "Damage Dealer", requirement: "40k+ damage to champions (last 10)" },
				{ name: "Carry", requirement: "50%+ of team damage in a match (last 10)" },
				{ name: "Tank", requirement: "50k+ damage taken (last 10)" },
				{ name: "Objective Hunter", requirement: "3+ dragon kills in one game (last 10)" },
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
			title: "Expandable Match Cards",
			description:
				"Click any match card to expand a mini scoreboard showing all 10 players with champion, rank, summoner spells, runes, KDA, CS/min, gold, and damage. A link at the bottom takes you to the full match detail page.",
		},
	],
};

export default changelog;
