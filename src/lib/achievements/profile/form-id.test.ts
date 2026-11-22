import { describe, expect, it } from "vitest";
import { earnedForm, resolveFormAchievement, withRoleWinRate } from "./form-id";

describe("resolveFormAchievement", () => {
	it("names a one trick after its champion", () => {
		expect(resolveFormAchievement("one-trick:MonkeyKing")).toMatchObject({ id: "one-trick", name: "Wukong OTP", icon: "one-trick" });
	});

	it("names the main role with its season win rate and icon", () => {
		expect(resolveFormAchievement("role-main:MIDDLE:64")).toMatchObject({ id: "role-main", name: "Mid Main · 64% WR", icon: "mid-main" });
		expect(resolveFormAchievement("role-main:MIDDLE")).toMatchObject({ name: "Mid Main" });
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

describe("withRoleWinRate", () => {
	const game = (teamPosition: string, win: boolean) => ({ teamPosition, win });

	it("appends the season win rate on the main role", () => {
		expect(withRoleWinRate("role-main:UTILITY", [game("UTILITY", true), game("UTILITY", false), game("UTILITY", true), game("MIDDLE", false)])).toBe("role-main:UTILITY:67");
	});

	it("leaves the id alone without season games on that role, and other ids untouched", () => {
		expect(withRoleWinRate("role-main:UTILITY", [game("MIDDLE", true)])).toBe("role-main:UTILITY");
		expect(withRoleWinRate("win-streak", [game("UTILITY", true)])).toBe("win-streak");
	});
});
