import { type ChangelogEntry } from "../../changelog-type";

const changelog: ChangelogEntry = {
	slug: "2026-10-11",
	title: "Milestones and Seasons",
	date: "2026-10-11",
	summary:
		"Achievements now come in three layers: permanent milestones with Bronze to Platinum tiers, a list for each ranked season, and the Current form from your latest games.",
	changes: [
		{
			category: "feature",
			title: "Milestones",
			description:
				"Fourteen all-time milestones such as Veteran, Pentakiller, Champion Pool and Peak Rank, each with four tiers, a progress bar, the date you reached each tier and how rare it is among tracked players.",
		},
		{
			category: "feature",
			title: "Season achievements",
			description:
				"Eight achievements per ranked season, from Season Grinder to Hot Streak and Season Peak. Earned ones stay for the season, and past seasons are kept.",
		},
		{
			category: "improvement",
			title: "Profile highlights",
			description: "The profile overview shows your three best milestones next to your current form.",
		},
	],
};

export default changelog;
