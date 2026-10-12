import { afterEach, describe, expect, it, vi } from "vitest";
import { logPath, withApiLog } from "./log";

describe("logPath", () => {
	it("drops the query string", () => {
		expect(logPath("https://summon.gg/api/matches?puuid=abc&count=20")).toBe("/api/matches");
	});

	it("masks long id segments such as puuids", () => {
		const puuid = "a".repeat(78);
		expect(logPath(`https://eun1.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`)).toBe("/lol/league/v4/entries/by-puuid/:id");
		expect(logPath("https://summon.gg/api/matches/EUN1_4013711908")).toBe("/api/matches/EUN1_4013711908");
	});
});

describe("withApiLog", () => {
	afterEach(() => vi.restoreAllMocks());

	it("logs method, path, status and duration", async () => {
		const info = vi.spyOn(console, "log").mockImplementation(() => {});
		const handler = withApiLog(async () => new Response("ok", { status: 201 }));
		const res = await handler(new Request("https://summon.gg/api/ranked?puuid=secret"));
		expect(res.status).toBe(201);
		expect(info).toHaveBeenCalledOnce();
		expect(info.mock.calls[0][0]).toMatch(/^\[api\] GET \/api\/ranked 201 \d+ms$/);
	});

	it("logs the error and answers 500 when the handler throws", async () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const handler = withApiLog(async () => {
			throw new Error("boom");
		});
		const res = await handler(new Request("https://summon.gg/api/mastery?puuid=x", { method: "POST" }));
		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({ error: "Internal server error" });
		expect(error.mock.calls[0][0]).toMatch(/^\[api\] POST \/api\/mastery 500 \d+ms threw:$/);
		expect(error.mock.calls[0][1]).toBeInstanceOf(Error);
	});

	it("passes the route context through", async () => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		const handler = withApiLog(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => Response.json(await ctx.params));
		const res = await handler(new Request("https://summon.gg/api/matches/1"), { params: Promise.resolve({ id: "1" }) });
		expect(await res.json()).toEqual({ id: "1" });
	});
});
