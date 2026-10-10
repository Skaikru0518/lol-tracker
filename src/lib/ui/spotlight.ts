/** Opened-on path after a navigation: cleared once the path changes, so Back can't reopen it. */
export function reconcileOpenedOn(
	openedOn: string | null,
	pathname: string,
): string | null {
	return openedOn === pathname ? openedOn : null;
}
