/** SVG `points` for a sparkline; min maps to the bottom, max to the top, non-finite values are dropped. */
export function sparklinePoints(values: number[], width: number, height: number): string {
	const finite = values.filter((v) => Number.isFinite(v));
	if (finite.length === 0) return "";
	if (finite.length === 1) return `0,${height / 2} ${width},${height / 2}`;

	const min = Math.min(...finite);
	const max = Math.max(...finite);
	const span = max - min;
	const step = width / (finite.length - 1);

	return finite
		.map((value, index) => {
			const y = span === 0 ? height / 2 : height - ((value - min) / span) * height;
			return `${Math.round(index * step * 100) / 100},${Math.round(y * 100) / 100}`;
		})
		.join(" ");
}
