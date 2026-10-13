import { formatMetric } from "@/lib/performance/format";
import { type CategoryScore } from "@/lib/performance/score";
import { METRIC_LABELS } from "@/lib/performance/weights";

export function MetricTable({ metrics, roleLabel }: { metrics: CategoryScore["metrics"]; roleLabel: string }) {
	return (
		<table className="w-full text-xs">
			<tbody>
				{metrics.map((m) => (
					<tr key={m.id} className="border-t">
						<td className="py-1.5 text-muted-foreground">{METRIC_LABELS[m.id]}</td>
						<td className="py-1.5 text-right font-semibold text-foreground">{formatMetric(m.id, m.value)}</td>
						<td className="py-1.5 pl-3 text-right text-muted-foreground">
							better than {Math.round(m.percentile)}% of {roleLabel}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
