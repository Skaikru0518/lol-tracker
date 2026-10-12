export interface RateWindow {
	limit: number;
	ms: number;
}

/** In-process sliding-window limiter; `block` holds every call back, e.g. for a 429's Retry-After. */
export class RateLimiter {
	private stamps: number[] = [];
	private blockedUntil = 0;
	private readonly longest: number;

	constructor(
		private readonly windows: RateWindow[],
		private readonly now: () => number = Date.now,
	) {
		this.longest = Math.max(...windows.map((w) => w.ms));
	}

	waitTime(): number {
		const now = this.now();
		this.stamps = this.stamps.filter((t) => t > now - this.longest);
		let wait = Math.max(0, this.blockedUntil - now);
		for (const { limit, ms } of this.windows) {
			const inWindow = this.stamps.filter((t) => t > now - ms);
			if (inWindow.length >= limit) wait = Math.max(wait, inWindow[inWindow.length - limit] + ms - now);
		}
		return wait;
	}

	record(): void {
		this.stamps.push(this.now());
	}

	block(seconds: number): void {
		this.blockedUntil = Math.max(this.blockedUntil, this.now() + seconds * 1000);
	}

	/** False when no slot frees up within `maxWaitMs`. */
	async acquire(maxWaitMs: number): Promise<boolean> {
		const deadline = this.now() + maxWaitMs;
		for (;;) {
			const wait = this.waitTime();
			if (wait === 0) {
				this.record();
				return true;
			}
			if (this.now() + wait > deadline) return false;
			await new Promise((resolve) => setTimeout(resolve, wait));
		}
	}
}
