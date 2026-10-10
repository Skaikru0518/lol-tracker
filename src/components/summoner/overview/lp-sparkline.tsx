import { sparklinePoints } from "@/lib/summoner/sparkline";
import { toAbsoluteLp } from "@/lib/summoner/lp-change";
import { type LPSnapshot } from "@/lib/validators/lp-history";

const WIDTH = 240;
const HEIGHT = 36;

/** 30-day LP trend line; renders nothing with fewer than two snapshots. */
export function LpSparkline({ snapshots }: { snapshots?: LPSnapshot[] }) {
	if (!snapshots || snapshots.length < 2) return null;
	const points = sparklinePoints(snapshots.map((s) => toAbsoluteLp(s.tier, s.rank, s.lp)), WIDTH, HEIGHT);

	return (
		<svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="mt-3 h-9 w-full" aria-hidden>
			<polyline points={points} fill="none" stroke="var(--primary)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
		</svg>
	);
}
