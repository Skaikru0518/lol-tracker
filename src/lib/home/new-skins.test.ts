import { describe, expect, it } from "vitest";
import { cdragonAsset, newSkinsBetween, patchOf, previousPatch, rarityLabel, skinsCacheState } from "./new-skins";

const skin = (id: number, name: string, extra: Partial<{ isBase: boolean; rarity: string; splashPath: string }> = {}) => ({
	id,
	name,
	isBase: false,
	rarity: "kEpic",
	splashPath: `/lol-game-data/assets/ASSETS/Characters/Kayn/Skins/Skin${id}/Images/kayn_splash_centered.jpg`,
	...extra,
});

describe("patchOf / previousPatch", () => {
	it("reads major.minor from the CommunityDragon content version", () => {
		expect(patchOf("16.20.8248524+branch.releases-16-20.content.release")).toBe("16.20");
		expect(previousPatch("16.20")).toBe("16.19");
	});

	it("has no previous patch for the first patch of a season", () => {
		expect(previousPatch("17.1")).toBeNull();
	});
});

describe("cdragonAsset", () => {
	it("maps a game-data path to the lower-cased raw CommunityDragon URL", () => {
		expect(cdragonAsset("/lol-game-data/assets/ASSETS/Characters/Kayn/Skins/Skin32/Images/Kayn_Splash.jpg")).toBe(
			"https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/characters/kayn/skins/skin32/images/kayn_splash.jpg",
		);
	});
});

describe("newSkinsBetween", () => {
	it("keeps non-base skins missing from the previous patch, skipping mode variants, by id", () => {
		const previous = { "141001": skin(141001, "Old Kayn") };
		const current = {
			"141001": skin(141001, "Old Kayn"),
			"141032": skin(141032, "HEARTSTEEL Kayn"),
			"81078": skin(81078, "HEARTSTEEL Ezreal"),
			"141000": skin(141000, "Kayn", { isBase: true }),
			"60039301": skin(60039301, "Classic Irelia", { rarity: "kNoRarity" }),
		};
		expect(newSkinsBetween(current, previous).map((s) => s.name)).toEqual(["HEARTSTEEL Ezreal", "HEARTSTEEL Kayn"]);
	});
});

describe("rarityLabel", () => {
	it("drops the k prefix and hides no rarity", () => {
		expect(rarityLabel("kMythic")).toBe("Mythic");
		expect(rarityLabel("kNoRarity")).toBeNull();
	});
});

describe("skinsCacheState", () => {
	const now = new Date("2026-10-10T12:00:00Z");
	const cached = (iso: string) => ({ patch: "16.20", fetchedAt: iso, skins: [] });

	it("is fresh for seven days", () => {
		expect(skinsCacheState(cached("2026-10-04T13:00:00Z"), now)).toBe("fresh");
		expect(skinsCacheState(cached("2026-10-03T11:00:00Z"), now)).toBe("stale");
	});

	it("is missing without a cache and stale for a future timestamp", () => {
		expect(skinsCacheState(null, now)).toBe("missing");
		expect(skinsCacheState(cached("2026-10-11T00:00:00Z"), now)).toBe("stale");
	});
});
