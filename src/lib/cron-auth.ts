import { timingSafeEqual } from "node:crypto";

/**
 * Verifies the `Authorization: Bearer <CRON_SECRET>` header on a cron request.
 *
 * The secret is only accepted from the header — never from the query string,
 * because query params end up in access logs, referrers and proxy logs.
 */
export function isAuthorizedCronRequest(req: Request): boolean {
	const secret = process.env.CRON_SECRET;
	if (!secret) return false;

	const header = req.headers.get("authorization");
	if (!header) return false;

	const expected = Buffer.from(`Bearer ${secret}`);
	const received = Buffer.from(header);

	// timingSafeEqual throws on length mismatch, so compare lengths first
	if (expected.length !== received.length) return false;

	return timingSafeEqual(expected, received);
}
