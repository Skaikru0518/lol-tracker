import { useSyncExternalStore } from "react";

function subscribe(): () => void {
	return () => {};
}

/** `true` after hydration, `false` on the server — no effect-driven setState. */
export function useIsClient(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
}
