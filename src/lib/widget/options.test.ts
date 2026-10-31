import { describe, expect, it } from "vitest";
import { parseWidgetOptions, widgetOptionsQuery } from "./options";

describe("parseWidgetOptions", () => {
	it("uses the defaults when nothing is set", () => {
		expect(parseWidgetOptions({})).toEqual({ style: "bar", theme: "card", queue: "solo", session: "auto", show: ["id", "server", "lp", "wr"] });
	});

	it("reads every option", () => {
		expect(parseWidgetOptions({ style: "strip", theme: "clear", queue: "flex", session: "today", show: "lp,wr" })).toEqual({
			style: "strip",
			theme: "clear",
			queue: "flex",
			session: "today",
			show: ["lp", "wr"],
		});
	});

	it("falls back per option on bad values", () => {
		expect(parseWidgetOptions({ style: "huge", theme: "pink", queue: "aram", session: "week" })).toEqual(parseWidgetOptions({}));
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
		const options = { style: "square", theme: "clear", queue: "flex", session: "load", show: ["id", "wr"] } as const;
		const params = Object.fromEntries(new URLSearchParams(widgetOptionsQuery({ ...options, show: [...options.show] })));
		expect(parseWidgetOptions(params)).toEqual(options);
	});
});
