import { QUANTILE_STEPS } from "./percentile";

/** The 21 quantiles of `values`, interpolated the same way as Postgres `percentile_cont`; null when empty. */
export function quantiles(values: number[]): number[] | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	return QUANTILE_STEPS.map((step) => {
		const pos = step * (sorted.length - 1);
		const lo = Math.floor(pos);
		const hi = Math.ceil(pos);
		return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
	});
}
