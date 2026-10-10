/** Fetch failure that keeps the HTTP status, so "not found" can be told apart from "try again". */
export class HttpError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = "HttpError";
	}
}

const NO_RETRY_STATUSES = new Set([400, 404]);
const MAX_RETRIES = 3;

/** TanStack `retry` callback: up to three retries, none for 400 or 404. */
export function retryUnlessNotFound(failureCount: number, error: unknown): boolean {
	if (error instanceof HttpError && NO_RETRY_STATUSES.has(error.status)) return false;
	return failureCount < MAX_RETRIES;
}
