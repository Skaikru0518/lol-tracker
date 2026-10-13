import { prisma } from "@/lib/server/db";
import { baselinesSchema, type Baselines } from "@/lib/validators/performance";
import { loadMetricRows, loadRoleQuantiles } from "./baselines-query";
import { calibrate } from "./calibration";
import { asRole } from "./roles";
import { type MetricId } from "./weights";

const WINDOW_DAYS = 60;
const KEEP = 30;

export async function computeAndSaveBaselines(now: Date = new Date()): Promise<{ sampleSize: number }> {
	const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
	const rows = await loadRoleQuantiles(since);
	const roles: Baselines["roles"] = {};
	for (const row of rows) {
		const role = asRole(row.role);
		if (!role) continue;
		const metrics = Object.fromEntries(Object.entries(row.metrics).filter(([, q]) => q !== null)) as Partial<Record<MetricId, number[]>>;
		roles[role] = { games: row.games, metrics };
	}
	const sampleSize = rows.reduce((s, r) => s + r.games, 0);

	const metricRows = (await loadMetricRows(since)).flatMap((r) => {
		const role = asRole(r.role);
		return role ? [{ role, values: r.values }] : [];
	});
	for (const [role, calibration] of Object.entries(calibrate(metricRows, roles))) {
		const baseline = roles[role as keyof typeof roles];
		if (baseline) baseline.calibration = calibration;
	}

	await prisma.performanceBaseline.create({ data: { sampleSize, data: { roles } } });
	const stale = await prisma.performanceBaseline.findMany({ orderBy: { computedAt: "desc" }, skip: KEEP, select: { id: true } });
	if (stale.length > 0) await prisma.performanceBaseline.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
	cached = null;
	return { sampleSize };
}

export interface StoredBaselines {
	id: string;
	baselines: Baselines;
}

const CACHE_MS = 10 * 60 * 1000;
const MISSING_CACHE_MS = 60 * 1000;
let cached: { at: number; value: StoredBaselines | null } | null = null;

export async function latestBaselines(): Promise<StoredBaselines | null> {
	// "No baseline yet" is cached briefly so scores appear soon after the first cron run
	if (cached && Date.now() - cached.at < (cached.value ? CACHE_MS : MISSING_CACHE_MS)) return cached.value;
	const row = await prisma.performanceBaseline.findFirst({ orderBy: { computedAt: "desc" } });
	const data = row?.data as { roles?: unknown } | undefined;
	const value = row
		? { id: row.id, baselines: baselinesSchema.parse({ computedAt: row.computedAt.toISOString(), sampleSize: row.sampleSize, roles: data?.roles ?? {} }) }
		: null;
	cached = { at: Date.now(), value };
	return value;
}
