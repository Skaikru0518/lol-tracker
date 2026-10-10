import { getRuneIcon } from "@/lib/game/icon-helpers";
import { type PerkInfo, plainText, runeStatLines } from "@/lib/match/runes";
import { type RuneMaps } from "@/lib/summoner/matches/match-row";
import { type Participant } from "@/lib/validators/match";

/** Primary and secondary trees; each rune shows what it did this game, hovering shows its short description. Shards below. */
export function RunePage({ player, runeData, perks }: { player: Participant; runeData?: RuneMaps; perks?: Map<number, PerkInfo> }) {
	if (!runeData) return null;
	const trees = ["primaryStyle", "subStyle"]
		.map((description) => player.perks.styles.find((s) => s.description === description))
		.filter((style) => style !== undefined);
	const shards = [player.perks.statPerks.offense, player.perks.statPerks.flex, player.perks.statPerks.defense]
		.map((id) => perks?.get(id)?.name)
		.filter((name): name is string => !!name);

	return (
		<div className="space-y-4">
			<div className="grid gap-4 sm:grid-cols-2">
				{trees.map((style) => (
					<div key={style.description}>
						<p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{runeData.styles.get(style.style)?.name ?? "Runes"}</p>
						<ul className="space-y-2">
							{style.selections.map((selection) => {
								const rune = runeData.runes.get(selection.perk);
								if (!rune) return null;
								const perk = perks?.get(selection.perk);
								const stats = runeStatLines(perk, [selection.var1, selection.var2, selection.var3]);
								return (
									<li key={selection.perk} className="flex items-start gap-2.5" title={perk ? plainText(perk.shortDesc) : undefined}>
										<img src={getRuneIcon(rune.icon)} alt="" width={28} height={28} className="size-7 shrink-0" />
										<div className="min-w-0">
											<p className="text-sm font-medium text-foreground">{rune.name}</p>
											{stats.map((line) => (
												<p key={line} className="text-xs text-muted-foreground">
													{line}
												</p>
											))}
										</div>
									</li>
								);
							})}
						</ul>
					</div>
				))}
			</div>
			{shards.length > 0 && <p className="text-xs text-muted-foreground">Shards: {shards.join(" · ")}</p>}
		</div>
	);
}
