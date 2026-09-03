import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);

	// timingSafeEqual throws on length mismatch, so compare lengths first
	if (bufA.length !== bufB.length) return false;

	return timingSafeEqual(bufA, bufB);
}

/**
 * Verifies the cron secret, accepted either as an
 * `Authorization: Bearer <CRON_SECRET>` header or as a `?secret=` query param.
 *
 * The query param is convenient for cron providers that cannot send custom
 * headers, but it leaks the secret into access logs, proxy logs and the
 * provider's own job history — prefer the header where it is supported.
 */
export function isAuthorizedCronRequest(req: Request): boolean {
	const secret = process.env.CRON_SECRET;
	if (!secret) return false;

	const header = req.headers.get("authorization");
	if (header && safeEqual(header, `Bearer ${secret}`)) return true;

	const querySecret = new URL(req.url).searchParams.get("secret");
	return querySecret !== null && safeEqual(querySecret, secret);
}
