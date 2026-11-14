import { describe, expect, it } from "vitest";
import { ogCacheControl } from "./response";

describe("ogCacheControl", () => {
	it("caches finished cards for a year, incomplete ones for an hour, misses for five minutes", () => {
		expect(ogCacheControl("complete")).toBe("public, max-age=31536000, immutable");
		expect(ogCacheControl("incomplete")).toBe("public, max-age=3600");
		expect(ogCacheControl("missing")).toBe("public, max-age=300");
	});
});
