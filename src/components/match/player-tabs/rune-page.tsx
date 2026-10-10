import { getRuneIcon } from "@/lib/icon-helpers";
import { type RuneMaps } from "@/lib/summoner/match-row";
import { type Participant } from "@/lib/validators/match";

/** Primary and secondary rune trees with each selected rune. */
export function RunePage({ player, runeData }: { player: Participant; runeData?: RuneMaps }) {
	if (!runeData) return null;
	const trees = ["primaryStyle", "subStyle"]
		.map((description) => player.perks.styles.find((s) => s.description === description))
		.filter((style) => style !== undefined);

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			{trees.map((style) => (
				<div key={style.description}>
					<p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{runeData.styles.get(style.style)?.name ?? "Runes"}
					</p>
					<ul className="space-y-1.5">
						{style.selections.map((selection) => {
							const rune = runeData.runes.get(selection.perk);
							if (!rune) return null;
							return (
								<li key={selection.perk} className="flex items-center gap-2 text-sm">
									<img src={getRuneIcon(rune.icon)} alt="" width={24} height={24} className="size-6" />
									<span className="text-foreground">{rune.name}</span>
								</li>
							);
						})}
					</ul>
				</div>
			))}
		</div>
	);
}
