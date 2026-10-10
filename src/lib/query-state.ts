/** A query has failed for the user only when it errored and has no earlier data to keep showing. */
export function queryFailed({ isError, data }: { isError: boolean; data: unknown }): boolean {
	return isError && data === undefined;
}
