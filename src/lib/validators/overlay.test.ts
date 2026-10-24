import { describe, expect, it } from "vitest";
import { overlayQuerySchema, overlayResponseSchema } from "./overlay";

describe("overlay schemas", () => {
	it("rejects a query without a platform or with a non-numeric since", () => {
		expect(overlayQuerySchema.safeParse({ gameName: "Skaikru", tagLine: "HEAVN", since: "x" }).success).toBe(false);
	});

	it("coerces since from the query string", () => {
		const parsed = overlayQuerySchema.parse({ gameName: "Skaikru", tagLine: "HEAVN", platform: "euw", since: "1761343200000" });
		expect(parsed.since).toBe(1761343200000);
	});

	it("accepts a not-in-game response", () => {
		expect(overlayResponseSchema.parse({ inGame: false })).toEqual({ inGame: false });
	});
});
