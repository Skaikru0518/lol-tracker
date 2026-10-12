import { type ChangelogEntry } from "../../changelog-type";

const changelog: ChangelogEntry = {
	slug: "2026-10-13",
	title: "Performance Scores",
	date: "2026-10-13",
	summary: "Every ranked game now gets a 0–100 performance score with a grade, compared with players in the same role.",
	changes: [
		{
			category: "feature",
			title: "Performance score",
			description:
				"Ranked games show a score on the match list. The match page has a Performance tab with grades for laning, farming, combat, teamfight, objectives and vision, the stats behind each, and how you did against your lane opponent.",
		},
	],
};

export default changelog;
