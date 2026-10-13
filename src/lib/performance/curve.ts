// Percentile → score; tuned so the average game is ~65 and S+ (90+) is the top 7%
const POINTS: [number, number][] = [
	[0, 20],
	[8, 40],
	[30, 55],
	[60, 70],
	[80, 80],
	[93, 90],
	[100, 100],
];

export function curveScore(percentile: number): number {
	const p = Math.min(Math.max(percentile, 0), 100);
	const i = POINTS.findIndex((_, idx) => idx < POINTS.length - 1 && p <= POINTS[idx + 1][0]);
	const [x0, y0] = POINTS[i];
	const [x1, y1] = POINTS[i + 1];
	return y0 + ((p - x0) / (x1 - x0)) * (y1 - y0);
}
