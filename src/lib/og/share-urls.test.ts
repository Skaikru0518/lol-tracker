import { describe, expect, it } from "vitest";
import { achievementShareUrl, matchShareUrl, promoShareUrl } from "./share-urls";

describe("share urls", () => {
	it("builds the page links the previews are attached to", () => {
		expect(matchShareUrl("EUN1_1", "p/1")).toBe("/match/EUN1_1?puuid=p%2F1");
		expect(promoShareUrl("Cool Guy", "EUNE", "s1")).toBe("/summoner/Cool%20Guy-EUNE/lp?promo=s1");
		expect(achievementShareUrl("Árvíz", "HUN", "season-penta", "2026")).toBe("/summoner/%C3%81rv%C3%ADz-HUN/achievements?a=season-penta&s=2026");
	});
});
