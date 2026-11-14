import { formatRankLabel } from "@/lib/game/rank-calculator";
import { dayKeyIn, groupChangesByDay, lpChangeRows } from "@/lib/lp-history/summary";
import { type LPSnapshot } from "@/lib/validators/lp-history";

const QUEUE_LABEL: Record<string, string> = { RANKED_SOLO_5x5: "Ranked Solo", RANKED_FLEX_SR: "Ranked Flex" };
const CARD_TIME_ZONE = "Europe/Budapest";

export interface PromoCard {
	tier: string;
	label: string;
	from: string;
	queue: string;
	day: string;
	wins: number;
	losses: number;
	netLp: number;
	avgScore: number | null;
	riotId: string;
}

/** The promotion at `snapshotId` with its day's W/L and net LP; null unless that snapshot is a promotion. */
export function buildPromoCard(snapshots: LPSnapshot[], snapshotId: string, riotId: string, queueType: string, avgScore: number | null, timeZone = CARD_TIME_ZONE): PromoCard | null {
	const rows = lpChangeRows(snapshots);
	const i = rows.findIndex((r) => r.id === snapshotId);
	const row = rows[i];
	const older = rows[i + 1];
	if (!row || row.kind !== "promotion" || !older) return null;

	const group = groupChangesByDay(rows, (iso) => dayKeyIn(iso, timeZone)).find((g) => g.rows.includes(row));
	return {
		tier: row.tier,
		label: formatRankLabel(row.tier, row.rank),
		from: formatRankLabel(older.tier, older.rank),
		queue: QUEUE_LABEL[queueType] ?? queueType,
		day: group?.day ?? dayKeyIn(row.createdAt, timeZone),
		wins: group?.wins ?? 0,
		losses: group?.losses ?? 0,
		netLp: group?.delta ?? 0,
		avgScore,
		riotId,
	};
}

export function promoMetadata(card: PromoCard): { title: string; description: string } {
	return { title: `${card.riotId} promoted to ${card.label}`, description: `${card.from} → ${card.label} · ${card.queue}` };
}
