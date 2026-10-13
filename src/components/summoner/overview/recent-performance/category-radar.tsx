import { useId } from "react";
import { GRADE_COLORS, type Grade } from "@/lib/performance/grades";
import { CATEGORY_LABELS, CATEGORY_SHORT_LABELS } from "@/lib/performance/weights";
import { radarLabelAnchor, radarPoint } from "@/lib/ui/radar";
import { type RecentSummaryPayload } from "@/lib/validators/performance";

const WIDTH = 200;
const HEIGHT = 180;
const RADIUS = 58;
const RINGS = [100, 66, 33];

export function CategoryRadar({ categories, grade }: { categories: RecentSummaryPayload["categories"]; grade: Grade }) {
	const fillId = useId();
	const color = GRADE_COLORS[grade];
	const count = categories.length;
	const at = (i: number, value: number) => {
		const p = radarPoint(i, count, value, RADIUS);
		return { x: WIDTH / 2 + p.x, y: HEIGHT / 2 + p.y };
	};
	const polygon = (value: (i: number) => number) =>
		categories
			.map((_, i) => at(i, value(i)))
			.map(({ x, y }) => `${x},${y}`)
			.join(" ");

	return (
		<svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-50 shrink-0 overflow-visible" role="img" aria-label="Category scores">
			<defs>
				<radialGradient id={fillId}>
					<stop offset="0" stopColor={color} stopOpacity={0.05} />
					<stop offset="1" stopColor={color} stopOpacity={0.35} />
				</radialGradient>
			</defs>
			{RINGS.map((ring) => (
				<polygon key={ring} points={polygon(() => ring)} fill={ring === 100 ? "var(--muted)" : "none"} fillOpacity={0.5} stroke="var(--border)" />
			))}
			<polygon points={polygon((i) => categories[i].score)} fill={`url(#${fillId})`} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
			{categories.map((c, i) => {
				const dot = at(i, c.score);
				const edge = at(i, 100);
				const anchor = radarLabelAnchor(i, count);
				const x = edge.x + (anchor === "start" ? 8 : anchor === "end" ? -8 : 0);
				const y = edge.y + (anchor !== "middle" ? 0 : edge.y < HEIGHT / 2 ? -18 : 16);
				return (
					<g key={c.id}>
						<title>{`${CATEGORY_LABELS[c.id]} ${c.score} · ${c.grade}`}</title>
						<circle cx={dot.x} cy={dot.y} r={3} fill={GRADE_COLORS[c.grade]} />
						<text x={x} y={y - 5} textAnchor={anchor} dominantBaseline="middle" fontSize={9.5} fontWeight={600} fill="var(--muted-foreground)">
							{CATEGORY_SHORT_LABELS[c.id]}
						</text>
						<text x={x} y={y + 6} textAnchor={anchor} dominantBaseline="middle" fontSize={10.5} fontWeight={800} fill={GRADE_COLORS[c.grade]}>
							{c.score}
						</text>
					</g>
				);
			})}
		</svg>
	);
}
