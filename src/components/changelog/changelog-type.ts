export interface ChangelogEntry {
	slug: string;
	title: string;
	date: string;
	summary: string;
	changes: {
		category: "feature" | "improvement" | "fix" | "design";
		title: string;
		description: string;
		img?: string;
	}[];
}
