import { SEASONS, currentSeason, type Season } from "../seasons";
import { type SeasonalInputs } from "./types";

/** The current season plus every closed season that has no rows yet; closed seasons are never rewritten. */
export function seasonsToCompute(existingScopes: Set<string>, now: Date): { season: Season; closed: boolean }[] {
	const current = currentSeason(now);
	return SEASONS.filter((s) => new Date(s.start) <= now)
		.filter((s) => s.id === current.id || !existingScopes.has(s.id))
		.map((season) => ({ season, closed: season.id !== current.id }));
}

/** Whether a season has anything to show; empty closed seasons get no rows. */
export function hasSeasonData(inputs: SeasonalInputs): boolean {
	return inputs.champions.some((c) => c.games > 0) || inputs.snapshots.length > 0;
}
