import { describe, expect, it } from "vitest";
import { earnedForm, resolveFormAchievement } from "./form-id";

describe("resolveFormAchievement", () => {
	it("names a one trick after its champion", () => {
		expect(resolveFormAchievement("one-trick:MonkeyKing")).toMatchObject({ id: "one-trick", name: "Wukong OTP", icon: "one-trick" });
	});

	it("names the main role with its share and icon", () => {
		expect(resolveFormAchievement("role-main:MIDDLE:64")).toMatchObject({ id: "role-main", name: "Mid Main · 64%", icon: "mid-main" });
	});

	it("drops ids no definition knows, like the old per-role mains", () => {
		expect(resolveFormAchievement("mid-main")).toBeUndefined();
		expect(resolveFormAchievement("role-main:ARENA:50")).toBeUndefined();
	});
});

describe("earnedForm", () => {
	it("keys earned achievements by definition, in definition order", () => {
		const earned = earnedForm(["role-main:TOP:50", "win-streak", "one-trick:Nami", "top-main"]);
		expect([...earned.keys()]).toEqual(["one-trick", "win-streak", "role-main"]);
	});
});
