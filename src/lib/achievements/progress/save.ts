import { prisma } from "@/lib/server/db";
import { MILESTONES } from "../milestones/definitions";
import { evaluateMilestones } from "../milestones/evaluate";
import { SEASONAL } from "../seasonal/definitions";
import { evaluateSeasonal } from "../seasonal/evaluate";
import { seasonRange } from "../seasons";
import { championTotals, seasonRanks, winSequence } from "./aggregate";
import { hasSeasonData, seasonsToCompute } from "./backfill";
import { mergeProgress } from "./merge";
import { loadCurrentRanks, loadGameRows, loadMasteries, loadTierSnapshots } from "./query";
import { type ProgressResult, type StoredProgress } from "./types";

const key = (r: { achievementId: string; scope: string }) => `${r.achievementId}:${r.scope}`;

/** Peaks keep their highest value, so a later derank cannot make the card contradict the tier. */
const PEAK_IDS = new Set([...MILESTONES, ...SEASONAL].filter((d) => d.display === "rank").map((d) => d.id));

/** Recomputes milestones and seasons for one account and upserts the merged rows. */
export async function recomputeProgress(puuid: string, now: Date = new Date()): Promise<void> {
	const [stored, games, snapshots, ranked, masteries] = await Promise.all([
		prisma.achievementProgress.findMany({ where: { puuid } }),
		loadGameRows(puuid),
		loadTierSnapshots(puuid),
		loadCurrentRanks(puuid),
		loadMasteries(puuid),
	]);
	const byKey = new Map<string, StoredProgress>(stored.map((s) => [key(s), s]));
	const computed: ProgressResult[] = evaluateMilestones({ champions: championTotals(games), snapshots, ranked, masteries });

	for (const { season, closed } of seasonsToCompute(new Set(stored.map((s) => s.scope)), now)) {
		const range = seasonRange(season);
		const inputs = {
			champions: championTotals(games, range),
			wins: winSequence(games, range),
			snapshots: snapshots.filter((s) => s.createdAt >= range.from && (!range.to || s.createdAt < range.to)),
			ranked: closed ? null : seasonRanks(ranked, range.from),
		};
		if (closed && !hasSeasonData(inputs)) continue;
		computed.push(...evaluateSeasonal(season.id, inputs));
	}

	await prisma.$transaction(
		computed.map((result) => {
			const merged = mergeProgress(byKey.get(key(result)), result, now, { keepHighestValue: PEAK_IDS.has(result.achievementId) });
			const data = { value: merged.value, tier: merged.tier, reachedAt: merged.reachedAt };
			return prisma.achievementProgress.upsert({
				where: { puuid_achievementId_scope: { puuid, achievementId: result.achievementId, scope: result.scope } },
				update: data,
				create: { puuid, achievementId: result.achievementId, scope: result.scope, ...data },
			});
		}),
	);
}
