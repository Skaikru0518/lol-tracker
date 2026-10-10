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
			description: "The home page shows recently searched summoners, the free rotation, the latest changes and the skins released this patch; the changelog and policy pages use the new style.",
		},
		{
			category: "feature",
			title: "Search as you type",
			description: "The summoner search suggests stored summoners with their rank while you type, and offers a lookup for any full Riot ID it does not know yet.",
		},
		{
			category: "improvement",
			title: "Ranked-only achievements",
			description:
				"Achievements and match badges now come from Ranked Solo, Flex and 5s games only, with remakes ignored. Ties no longer hand out a badge, 5s Enjoyer replaces Normal Enjoyer, and Objective Hunter counts dragons and barons.",
		},
	],
};

export default changelog;
