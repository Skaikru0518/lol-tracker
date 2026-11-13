import { z } from "zod";
import { seasonFor } from "../seasons";

export const ACHIEVEMENT_RUN_KEY = "achievement-cron-run";
// Catches what the change query cannot see: new or changed achievement definitions
export const FULL_RUN_EVERY_MS = 7 * 24 * 60 * 60 * 1000;

const runStateSchema = z.object({ at: z.number(), fullAt: z.number() });
export type RunState = z.infer<typeof runStateSchema>;
export interface RunPlan {
	full: boolean;
	since: Date | null;
}

export function parseRunState(raw: string | null): RunState | null {
	if (!raw) return null;
	try {
		return runStateSchema.parse(JSON.parse(raw));
	} catch {
		return null;
	}
}

export function planAchievementRun(state: RunState | null, now: Date, force: boolean): RunPlan {
	const full =
		force ||
		!state ||
		now.getTime() - state.fullAt >= FULL_RUN_EVERY_MS ||
		seasonFor(new Date(state.at))?.id !== seasonFor(now)?.id;
	return { full, since: full || !state ? null : new Date(state.at) };
}

export function nextRunState(state: RunState | null, plan: RunPlan, startedAt: Date): RunState {
	const at = startedAt.getTime();
	return { at, fullAt: plan.full || !state ? at : state.fullAt };
}
