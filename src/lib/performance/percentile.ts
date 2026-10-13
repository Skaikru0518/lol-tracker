export const QUANTILE_STEPS = Array.from({ length: 21 }, (_, i) => i / 20);

export function percentileOf(value: number, quantiles: number[]): number {
	const last = quantiles.length - 1;
	const step = 100 / last;
	if (value < quantiles[0]) return 0;
	if (value > quantiles[last]) return 100;

	// A value matching a run of equal quantiles (e.g. most players have 0 steals) sits in the run's middle
	const first = quantiles.indexOf(value);
	if (first !== -1) return ((first + quantiles.lastIndexOf(value)) / 2) * step;

	const i = quantiles.findIndex((q, idx) => idx < last && q < value && value < quantiles[idx + 1]);
	return (i + (value - quantiles[i]) / (quantiles[i + 1] - quantiles[i])) * step;
}
