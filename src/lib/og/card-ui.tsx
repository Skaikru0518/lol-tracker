/* eslint-disable @next/next/no-img-element -- next/og renders plain <img>, next/image does not exist there */
// Building blocks for next/og cards: Satori only lays out flexbox, so every multi-child box sets display: flex
export const OG = {
	bg: "#0b0d17",
	fg: "#d4d7e6",
	muted: "#7d829c",
	primary: "#b05ad6",
	win: "#34c38f",
	loss: "#ef5350",
	gold: "#e9b949",
	chip: "rgba(255,255,255,0.08)",
};

export function Wordmark() {
	return (
		<div style={{ display: "flex", marginLeft: "auto", fontSize: 30, fontWeight: 700, color: "#fff" }}>
			summon<span style={{ color: OG.primary }}>.gg</span>
		</div>
	);
}

/** Bottom line of every card: optional emblem, a caption and the wordmark. */
export function Footer({ emblem, caption }: { emblem?: string | null; caption: string }) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: "auto", fontSize: 26, color: OG.muted }}>
			{emblem && <img src={emblem} width={52} height={52} alt="" />}
			<span>{caption}</span>
			<Wordmark />
		</div>
	);
}

export function Tag({ color, children }: { color: string; children: string }) {
	return <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 4, color }}>{children}</span>;
}
