const REMAKE_SECONDS = 300;

/** Games shorter than five minutes are remakes. */
export function isRemake(durationSeconds: number): boolean {
	return durationSeconds < REMAKE_SECONDS;
}
