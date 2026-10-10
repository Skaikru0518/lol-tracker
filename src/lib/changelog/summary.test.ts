import { describe, expect, it } from "vitest";
import { type ChangelogEntry } from "@/components/changelog/changelog-type";
import { categoryCounts, groupChanges } from "./summary";

const entry: ChangelogEntry = {
	slug: "x",
	title: "X",
	date: "2026-10-10",
	summary: "",
	changes: [
		{ category: "fix", title: "f1", description: "" },
		{ category: "feature", title: "a1", description: "" },
		{ category: "fix", title: "f2", description: "" },
		{ category: "feature", title: "a2", description: "" },
	],
};

describe("categoryCounts", () => {
	it("counts only present categories in feature, improvement, design, fix order", () => {
		expect(categoryCounts(entry)).toEqual([
			{ category: "feature", count: 2 },
			{ category: "fix", count: 2 },
		]);
	});
});

describe("groupChanges", () => {
	it("groups in the same order and keeps item order inside a group", () => {
		expect(groupChanges(entry).map((g) => [g.category, g.items.map((i) => i.title)])).toEqual([
			["feature", ["a1", "a2"]],
			["fix", ["f1", "f2"]],
		]);
	});
});
