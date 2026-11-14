import { getMatchBadgeById } from "@/lib/achievements/badges/definitions";
import { getChampionIcon, getChampionSplash, getDDragonVersion, getRankEmblem } from "@/lib/game/icon-helpers";
import { formatRankLabel } from "@/lib/game/rank-calculator";
import { Footer, OG, Tag } from "@/lib/og/card-ui";
import { loadMatchCard } from "@/lib/og/match-card-data";
import { ogImage, ogNotFound, publicDataUrl } from "@/lib/og/response";
import { GRADE_COLORS } from "@/lib/performance/grades";
import { CATEGORY_LABELS } from "@/lib/performance/weights";

const RESULT = { win: { label: "VICTORY", color: OG.win }, loss: { label: "DEFEAT", color: OG.loss }, remake: { label: "REMAKE", color: OG.muted } } as const;

export async function GET(_req: Request, { params }: { params: Promise<{ matchId: string; puuid: string }> }) {
	const { matchId, puuid } = await params;
	const loaded = await loadMatchCard(matchId, puuid);
	if (!loaded) return ogNotFound();
	const { card, complete } = loaded;

	const [version, emblem] = await Promise.all([
		getDDragonVersion().catch(() => null),
		card.rank ? publicDataUrl(getRankEmblem(card.rank.tier).slice(1), "image/png") : Promise.resolve(null),
	]);
	const result = RESULT[card.result];
	const caption = card.rank ? `${card.riotId} · ${formatRankLabel(card.rank.tier, card.rank.division)} ${card.rank.lp} LP` : card.riotId;
	const gradeColor = card.score ? GRADE_COLORS[card.score.grade] : OG.muted;

	return ogImage(
		<div style={{ display: "flex", width: "100%", height: "100%", background: OG.bg, color: OG.fg, fontFamily: "Geist", position: "relative" }}>
			<img src={getChampionSplash(card.championName)} width={1200} height={630} alt="" style={{ position: "absolute", inset: 0, objectFit: "cover", opacity: 0.3 }} />
			<div style={{ position: "absolute", inset: 0, display: "flex", background: `linear-gradient(90deg, ${OG.bg} 30%, rgba(11,13,23,0.55) 70%, rgba(11,13,23,0.2))` }} />
			<div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "48px 56px", position: "relative" }}>
				<div style={{ display: "flex", alignItems: "center", gap: 20 }}>
					<Tag color={result.color}>{result.label}</Tag>
					<span style={{ fontSize: 26, color: OG.muted }}>{[card.queue, card.duration, card.role].filter(Boolean).join(" · ")}</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 36, marginTop: 28 }}>
					{version && <img src={getChampionIcon(version, card.championName)} width={168} height={168} alt="" style={{ borderRadius: 32, border: "4px solid rgba(255,255,255,0.15)" }} />}
					<div style={{ display: "flex", flexDirection: "column" }}>
						<div style={{ display: "flex", fontSize: 80, fontWeight: 700, gap: 18 }}>
							<span>{card.kills}</span>
							<span style={{ color: OG.muted }}>/</span>
							<span style={{ color: OG.loss }}>{card.deaths}</span>
							<span style={{ color: OG.muted }}>/</span>
							<span>{card.assists}</span>
						</div>
						<span style={{ fontSize: 28, color: OG.muted }}>{`${card.kda} KDA · ${card.csPerMin} CS/min · ${Math.round(card.killShare * 100)}% kill share`}</span>
					</div>
					{card.score && (
						<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginLeft: "auto", width: 184, height: 184, borderRadius: 92, border: `12px solid ${gradeColor}`, color: gradeColor }}>
							<span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1 }}>{card.score.value}</span>
							<span style={{ fontSize: 26, fontWeight: 700 }}>{card.score.grade}</span>
						</div>
					)}
				</div>
				<div style={{ display: "flex", gap: 44, marginTop: 32, alignItems: "flex-end" }}>
					{card.score && (
						<div style={{ display: "flex", flexWrap: "wrap", width: 650, rowGap: 8, columnGap: 36, fontSize: 24 }}>
							{card.score.categories.map((c) => (
								<div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, width: 190 }}>
									<span>{CATEGORY_LABELS[c.id]}</span>
									<span style={{ fontWeight: 700, color: GRADE_COLORS[c.grade] }}>{c.score}</span>
								</div>
							))}
						</div>
					)}
					<div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
						{card.badgeIds.slice(0, 4).map((id) => {
							const def = getMatchBadgeById(id);
							return def ? (
								<span key={id} style={{ fontSize: 22, padding: "6px 16px", borderRadius: 999, background: OG.chip, border: `2px solid ${def.color ?? OG.muted}`, color: def.color ?? OG.fg }}>
									{def.name}
								</span>
							) : null;
						})}
					</div>
				</div>
				<Footer emblem={emblem} caption={caption} />
			</div>
		</div>,
		complete,
	);
}
