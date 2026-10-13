const angle = (index: number, count: number) => -Math.PI / 2 + (index * 2 * Math.PI) / count;

/** Offset from the chart center for `value` (0–100) on axis `index`, clockwise from the top. */
export function radarPoint(index: number, count: number, value: number, radius: number): { x: number; y: number } {
	const r = (radius * Math.min(Math.max(value, 0), 100)) / 100;
	const a = angle(index, count);
	return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

export function radarLabelAnchor(index: number, count: number): "start" | "middle" | "end" {
	const x = Math.cos(angle(index, count));
	if (Math.abs(x) < 1e-6) return "middle";
	return x > 0 ? "start" : "end";
}
