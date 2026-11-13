import { beforeEach, describe, expect, it } from "vitest";
import { allowRequest, rateLimited, resetRateLimit } from "./ip-rate-limit";

describe("allowRequest", () => {
	beforeEach(() => resetRateLimit());

	it("allows 30 requests a minute per key and blocks the 31st", () => {
		for (let i = 0; i < 30; i++) expect(allowRequest("1.2.3.4", 1_000 + i)).toBe(true);
		expect(allowRequest("1.2.3.4", 1_100)).toBe(false);
	});

	it("frees the key after the window passes", () => {
		for (let i = 0; i < 31; i++) allowRequest("1.2.3.4", 1_000);
		expect(allowRequest("1.2.3.4", 61_001)).toBe(true);
	});

	it("keeps keys independent", () => {
		for (let i = 0; i < 31; i++) allowRequest("1.2.3.4", 1_000);
		expect(allowRequest("5.6.7.8", 1_000)).toBe(true);
	});
});

describe("rateLimited", () => {
	beforeEach(() => resetRateLimit());
	const req = (ip: string) => new Request("https://summon.gg/api/x", { headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } });

	it("limits by the client IP and keeps each route's budget separate", () => {
		for (let i = 0; i < 30; i++) expect(rateLimited(req("1.2.3.4"), "matches")).toBe(false);
		expect(rateLimited(req("1.2.3.4"), "matches")).toBe(true);
		expect(rateLimited(req("1.2.3.4"), "ranked")).toBe(false);
		expect(rateLimited(req("5.6.7.8"), "matches")).toBe(false);
	});

	it("trusts Cloudflare's client IP over a forwarded header the client can set", () => {
		const viaCloudflare = (spoofed: string) => new Request("https://summon.gg/api/x", { headers: { "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": spoofed } });
		for (let i = 0; i < 30; i++) expect(rateLimited(viaCloudflare(`10.0.0.${i}`), "matches")).toBe(false);
		expect(rateLimited(viaCloudflare("10.0.0.99"), "matches")).toBe(true);
	});
});
