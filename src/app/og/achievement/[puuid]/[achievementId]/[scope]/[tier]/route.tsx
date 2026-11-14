/* eslint-disable @next/next/no-img-element -- next/og renders plain <img>, next/image does not exist there */
import { rarityLine } from "@/lib/og/achievement-card";
import { loadAchievementCard } from "@/lib/og/achievement-card-data";
import { Footer, OG, Tag } from "@/lib/og/card-ui";
import { ogImage, ogNotFound, publicDataUrl } from "@/lib/og/response";

export async function GET(_req: Request, { params }: { params: Promise<{ puuid: string; achievementId: string; scope: string; tier: string }> }) {
	const { puuid, achievementId, scope, tier } = await params;
	const tierNumber = Number(tier);
	if (!Number.isInteger(tierNumber)) return ogNotFound();
	const loaded = await loadAchievementCard(puuid, achievementId, scope, tierNumber);
	if (!loaded) return ogNotFound();
	const { card, complete } = loaded;
	const icon = await publicDataUrl(`achi/${card.icon}.svg`, "image/svg+xml").catch(() => null);
	const subtitle = [card.tierName && `${card.tierName} tier`, card.description].filter(Boolean).join(" · ");

	return ogImage(
		<div style={{ display: "flex", width: "100%", height: "100%", background: `radial-gradient(ellipse at 22% 45%, ${card.color}47, ${OG.bg} 60%)`, color: OG.fg, fontFamily: "Geist", padding: "48px 56px", gap: 52, alignItems: "center" }}>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 340, height: 340, borderRadius: 60, flexShrink: 0, border: `4px solid ${card.color}`, background: `${card.color}22` }}>
				{icon && <img src={icon} width={220} height={220} alt="" />}
			</div>
			<div style={{ display: "flex", flexDirection: "column", height: "100%", paddingTop: 12, flex: 1 }}>
				<Tag color={card.color}>ACHIEVEMENT UNLOCKED</Tag>
				<span style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1, marginTop: 12 }}>{card.name}</span>
				<span style={{ fontSize: 28, color: OG.muted, marginTop: 6 }}>{subtitle}</span>
				{card.maxTier > 1 && (
					<div style={{ display: "flex", gap: 12, marginTop: 28 }}>
						{Array.from({ length: card.maxTier }, (_, i) => (
							<div key={i} style={{ display: "flex", width: 92, height: 16, borderRadius: 8, background: i < card.tier ? card.color : "#2a2e45" }} />
						))}
					</div>
				)}
				{card.rarity && <span style={{ fontSize: 30, marginTop: 28 }}>{rarityLine(card.rarity, card.rarityShare)}</span>}
				<Footer caption={card.riotId} />
			</div>
		</div>,
		complete,
	);
}
