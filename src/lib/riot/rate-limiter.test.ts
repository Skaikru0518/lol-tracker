import { afterEach, describe, expect, it, vi } from "vitest";
import { RateLimiter } from "./rate-limiter";

function limiter(windows = [{ limit: 2, ms: 1000 }, { limit: 3, ms: 10_000 }]) {
	let now = 0;
	const clock = { advance: (ms: number) => (now += ms) };
	return { limiter: new RateLimiter(windows, () => now), clock };
}

describe("RateLimiter.waitTime", () => {
	it("is free until a window is full", () => {
		const { limiter: l } = limiter();
		expect(l.waitTime()).toBe(0);
		l.record();
		expect(l.waitTime()).toBe(0);
	});

	it("waits until the oldest call leaves the full short window", () => {
		const { limiter: l, clock } = limiter();
		l.record();
		clock.advance(300);
		l.record();
		expect(l.waitTime()).toBe(700);
		clock.advance(700);
		expect(l.waitTime()).toBe(0);
	});

	it("respects the long window too", () => {
		const { limiter: l, clock } = limiter();
		l.record();
		clock.advance(1000);
		l.record();
		clock.advance(1000);
		l.record();
		expect(l.waitTime()).toBe(8000);
	});

	it("holds every call back until a Retry-After block ends", () => {
		const { limiter: l, clock } = limiter();
		l.block(39);
		expect(l.waitTime()).toBe(39_000);
		clock.advance(39_000);
		expect(l.waitTime()).toBe(0);
	});
});

describe("RateLimiter.acquire", () => {
	afterEach(() => vi.useRealTimers());

	it("takes a free slot at once", async () => {
		const { limiter: l } = limiter();
		expect(await l.acquire(5000)).toBe(true);
	});

	it("gives up without waiting when the wait is longer than allowed", async () => {
		const { limiter: l } = limiter();
		l.block(30);
		expect(await l.acquire(5000)).toBe(false);
	});

	it("waits for a slot that frees up in time", async () => {
		vi.useFakeTimers();
		let now = 0;
		const l = new RateLimiter([{ limit: 1, ms: 1000 }], () => now);
		l.record();
		const pending = l.acquire(5000);
		now = 1000;
		await vi.advanceTimersByTimeAsync(1000);
		expect(await pending).toBe(true);
	});
});
