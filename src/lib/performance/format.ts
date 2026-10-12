import { type MetricId } from "./weights";

const PERCENT: ReadonlySet<MetricId> = new Set(["killParticipation", "damageShare", "damageTakenShare"]);
const COUNT: ReadonlySet<MetricId> = new Set(["epicKills", "structureKills", "steals", "controlWards"]);

export function formatMetric(id: MetricId, value: number): string {
	if (PERCENT.has(id)) return `${Math.round(value * 100)}%`;
	if (COUNT.has(id)) return `${Math.round(value)}`;
	if (id === "kda") return value.toFixed(2);
	return value.toFixed(1);
}

export function formatDiff(value: number): string {
	const rounded = Math.round(value);
	return `${rounded > 0 ? "+" : ""}${rounded.toLocaleString("en-US")}`;
}
