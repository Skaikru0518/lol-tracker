import { describe, expect, it } from "vitest";
import { reconcileOpenedOn } from "./spotlight";

describe("reconcileOpenedOn", () => {
	it("keeps the spotlight open on the path it was opened on", () => {
		expect(reconcileOpenedOn("/summoner/A", "/summoner/A")).toBe("/summoner/A");
	});

	it("clears the opened path after navigating away", () => {
		expect(reconcileOpenedOn("/summoner/A", "/summoner/B")).toBeNull();
	});

	it("stays closed when nothing was opened", () => {
		expect(reconcileOpenedOn(null, "/summoner/A")).toBeNull();
	});
});
