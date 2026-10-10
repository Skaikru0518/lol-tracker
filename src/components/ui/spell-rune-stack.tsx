import { cn } from "@/lib/utils";
import { remSize } from "@/lib/ui/size";
import { getSummonerSpellIcon, getSummonerSpellName } from "@/lib/game/icon-helpers";

/** 2x2 grid: summoner spells left, keystone + secondary tree right. */
export function SpellRuneStack({
	version,
	spells,
	runes,
	size = 18,
	className,
}: {
	version: string;
	spells: readonly [number, number];
	runes: readonly [string | null, string | null];
	size?: number;
	className?: string;
}) {
	return (
		<div className={cn("grid shrink-0 grid-flow-col grid-rows-2 gap-0.5", className)}>
			{spells.map((spellId, index) => {
				const src = getSummonerSpellIcon(version, spellId);
				const name = getSummonerSpellName(spellId) ?? "Summoner spell";
				return src ? (
					<img
						key={`spell-${index}`}
						src={src}
						alt={name}
						title={name}
						width={size}
						height={size}
						style={{ width: remSize(size), height: remSize(size) }}
						className="rounded"
					/>
				) : (
					<span key={`spell-${index}`} title={name} className="rounded bg-muted" style={{ width: remSize(size), height: remSize(size) }} />
				);
			})}
			{runes.map((src, index) =>
				src ? (
					<img
						key={`rune-${index}`}
						src={src}
						alt=""
						width={size}
						height={size}
						style={{ width: remSize(size), height: remSize(size) }}
						className="rounded-full bg-black/40 p-px"
					/>
				) : (
					<span
						key={`rune-${index}`}
						className="rounded-full bg-muted"
						style={{ width: remSize(size), height: remSize(size) }}
					/>
				),
			)}
		</div>
	);
}
