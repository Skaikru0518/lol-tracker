/** `stroke-dashoffset` for a progress ring, ratio clamped to 0–1. */
export function ringOffset(
	value: number,
	max: number,
	circumference: number,
): number {
	const ratio =
		max > 0 && Number.isFinite(value)
			? Math.min(Math.max(value / max, 0), 1)
			: 0;

	return circumference * (1 - ratio);
}
