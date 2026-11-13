import "dotenv/config";
import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/db";
import { latestBaselines } from "@/lib/performance/baselines";
import { loadScoringMatches } from "@/lib/performance/batch";
import { scoreMatch, summarize } from "@/lib/performance/score";

// Rescores every cached MatchPerformance row with the current weights and latest baseline.
// Usage: pnpm dlx tsx scripts/recompute-performance.ts [--dry]
const BATCH = 200;
const dry = process.argv.includes("--dry");

async function main() {
	const stored = await latestBaselines();
	if (!stored) throw new Error("No performance baseline in the database");

	const ids = (await prisma.matchPerformance.findMany({ select: { matchId: true }, orderBy: { matchId: "asc" } })).map((r) => r.matchId);
	console.log(`${ids.length} cached matches, baseline ${stored.id}${dry ? " (dry run)" : ""}`);

	let updated = 0;
	let dropped = 0;
	for (let i = 0; i < ids.length; i += BATCH) {
		const chunk = ids.slice(i, i + BATCH);
		const matches = await loadScoringMatches(chunk);
		const writes: Prisma.PrismaPromise<unknown>[] = [];
		const keep = new Set<string>();
		for (const match of matches) {
			const { scores, cacheable } = scoreMatch(match, stored.baselines);
			if (!cacheable || Object.keys(scores).length === 0) continue;
			keep.add(match.matchId);
			writes.push(
				prisma.matchPerformance.update({
					where: { matchId: match.matchId },
					data: {
						baselineId: stored.id,
						data: scores as unknown as Prisma.InputJsonValue,
						summary: summarize(scores) as unknown as Prisma.InputJsonValue,
					},
				}),
			);
		}
		// Rows that no longer score are removed so the site rescores them lazily instead of serving old numbers
		const stale = chunk.filter((id) => !keep.has(id));
		if (stale.length > 0) writes.push(prisma.matchPerformance.deleteMany({ where: { matchId: { in: stale } } }));
		if (!dry) await prisma.$transaction(writes);
		updated += keep.size;
		dropped += stale.length;
		console.log(`${Math.min(i + BATCH, ids.length)}/${ids.length}`);
	}
	console.log(`updated ${updated}, dropped ${dropped}`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
