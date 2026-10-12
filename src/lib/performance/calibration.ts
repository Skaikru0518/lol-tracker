import { type Baselines, type RoleBaseline } from "@/lib/validators/performance";
import { type MetricValues } from "./metrics";
import { quantiles } from "./quantiles";
import { type Role } from "./roles";
import { rawScores } from "./score";
import { type CategoryId } from "./weights";

type Calibration = NonNullable<RoleBaseline["calibration"]>;

export function calibrate(rows: { role: Role; values: MetricValues }[], roles: Baselines["roles"]): Partial<Record<Role, Calibration>> {
	const collected: Partial<Record<Role, { overall: number[]; categories: Partial<Record<CategoryId, number[]>> }>> = {};
	for (const { role, values } of rows) {
		const baseline = roles[role];
		const raw = baseline && rawScores(values, baseline, role);
		if (!raw) continue;
		const bucket = (collected[role] ??= { overall: [], categories: {} });
		bucket.overall.push(raw.overall);
		for (const c of raw.categories) (bucket.categories[c.id] ??= []).push(c.raw);
	}

	const result: Partial<Record<Role, Calibration>> = {};
	for (const [role, bucket] of Object.entries(collected) as [Role, NonNullable<(typeof collected)[Role]>][]) {
		const overall = quantiles(bucket.overall);
		if (!overall) continue;
		const categories = Object.fromEntries(
			Object.entries(bucket.categories).flatMap(([id, values]) => {
				const q = quantiles(values);
				return q ? [[id, q]] : [];
			}),
		) as Calibration["categories"];
		result[role] = { overall, categories };
	}
	return result;
}
