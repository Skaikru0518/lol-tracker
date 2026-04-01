import { type ChangelogEntry } from "../../changelog-type";

const changelog: ChangelogEntry = {
	slug: "2026-04-02",
	title: "Filter & Polish",
	date: "2026-04-02",
	summary:
		"Match history now supports champion filtering alongside queue type filters. Plus UI refinements across the board.",
	changes: [
		{
			category: "feature",
			title: "Champion Filter in Match History",
			description:
				"A new dropdown next to the queue filters lets you narrow matches by champion. It auto-detects which champions you played and shows the game count for each. Both filters combine — e.g. Ranked Solo + Jinx.",
		},
		{
			category: "improvement",
			title: "New Select Dropdown",
			description:
				"Replaced the native dropdown with a custom select component for a consistent look — rounded corners, smooth animations, and a scrollable list that matches the rest of the UI.",
		},
		{
			category: "fix",
			title: "Mastery List Links Removed",
			description:
				"Top Champions entries are no longer clickable links since the champion detail page isn't ready yet. Prevents navigating to a broken route.",
		},
	],
};

export default changelog;
