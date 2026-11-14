/* eslint-disable @next/next/no-img-element -- next/og renders plain <img>, next/image does not exist there */
import { getRankEmblem, RANK_COLORS } from "@/lib/game/icon-helpers";
import { dayKeyToDate } from "@/lib/lp-history/summary";
import { Footer, OG, Tag } from "@/lib/og/card-ui";
import { loadPromoCard } from "@/lib/og/promo-card-data";
import { ogImage, ogNotFound, publicDataUrl } from "@/lib/og/response";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
			<span style={{ fontSize: 22, letterSpacing: 3, color: OG.muted }}>{label}</span>
			<div style={{ display: "flex", gap: 12, fontSize: 32, fontWeight: 700 }}>{children}</div>
		</div>
	);
}

export async function GET(_req: Request, { params }: { params: Promise<{ snapshotId: string }> }) {
	const loaded = await loadPromoCard((await params).snapshotId);
	if (!loaded) return ogNotFound();
	const { card } = loaded;
	const color = RANK_COLORS[card.tier] ?? OG.primary;
	const emblem = await publicDataUrl(getRankEmblem(card.tier).slice(1), "image/png");
	const date = dayKeyToDate(card.day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

	return ogImage(
		<div style={{ display: "flex", width: "100%", height: "100%", background: `radial-gradient(ellipse at 28% 50%, ${color}59, ${OG.bg} 62%)`, color: OG.fg, fontFamily: "Geist", padding: "48px 56px", gap: 52, alignItems: "center" }}>
			<div style={{ display: "flex", position: "relative", width: 400, height: 400, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
				<div style={{ position: "absolute", inset: 12, borderRadius: 200, border: `4px solid ${color}80`, display: "flex" }} />
				<div style={{ position: "absolute", inset: -16, borderRadius: 216, border: `2px solid ${color}40`, display: "flex" }} />
				<img src={emblem} width={380} height={380} alt="" />
			</div>
			<div style={{ display: "flex", flexDirection: "column", height: "100%", paddingTop: 12, flex: 1 }}>
				<Tag color={color}>PROMOTED</Tag>
				<span style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05, marginTop: 12 }}>{card.label}</span>
				<span style={{ fontSize: 30, color: OG.muted, marginTop: 8 }}>{`${card.from} → ${card.label} · ${card.queue}`}</span>
				<div style={{ display: "flex", gap: 44, marginTop: 40 }}>
					<Stat label="THAT DAY">
						<span style={{ color: OG.win }}>{`${card.wins}W`}</span>
						<span style={{ color: OG.loss }}>{`${card.losses}L`}</span>
					</Stat>
					<Stat label="LP">
						<span style={{ color: card.netLp < 0 ? OG.loss : OG.win }}>{`${card.netLp > 0 ? "+" : ""}${card.netLp} LP`}</span>
					</Stat>
					{card.avgScore !== null && (
						<Stat label="AVG SCORE">
							<span>{card.avgScore}</span>
						</Stat>
					)}
				</div>
				<Footer caption={`${card.riotId} · ${date}`} />
			</div>
		</div>,
		true,
	);
}
