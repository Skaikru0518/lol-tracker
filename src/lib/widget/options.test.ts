import { describe, expect, it } from "vitest";
import { parseWidgetOptions, widgetOptionsQuery } from "./options";

describe("parseWidgetOptions", () => {
	it("uses the defaults when nothing is set", () => {
		expect(parseWidgetOptions({})).toEqual({ style: "bar", theme: "card", queue: "solo", session: "auto", show: ["id", "server", "lp", "wr"], anim: "on", fx: [] });
	});

	it("reads every option", () => {
		expect(parseWidgetOptions({ style: "strip", theme: "clear", queue: "flex", session: "today", show: "lp,wr", anim: "off", fx: "smoke,rotate,sparkles" })).toEqual({
			style: "strip",
			theme: "clear",
			queue: "flex",
			session: "today",
			show: ["lp", "wr"],
			anim: "off",
			fx: ["smoke", "rotate"],
		});
	});

	it("falls back per option on bad values", () => {
		expect(parseWidgetOptions({ style: "huge", theme: "pink", queue: "aram", session: "week" })).toEqual(parseWidgetOptions({}));
		expect(parseWidgetOptions({ session: "season" }).session).toBe("season");
	});

	it("drops unknown show parts and keeps an explicit empty list", () => {
		expect(parseWidgetOptions({ show: "lp,banana" }).show).toEqual(["lp"]);
		expect(parseWidgetOptions({ show: "" }).show).toEqual([]);
	});

	it("takes the first value of a repeated param", () => {
		expect(parseWidgetOptions({ style: ["pill", "bar"] }).style).toBe("pill");
	});
});

describe("widgetOptionsQuery", () => {
	it("round-trips through parseWidgetOptions", () => {
		const options = { style: "square", theme: "clear", queue: "flex", session: "load", show: ["id", "wr"], anim: "off", fx: ["smoke"] } as const;
		const params = Object.fromEntries(new URLSearchParams(widgetOptionsQuery({ ...options, show: [...options.show], fx: [...options.fx] })));
		expect(parseWidgetOptions(params)).toEqual(options);
	});
});
