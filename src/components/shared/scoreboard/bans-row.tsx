import { getChampionIcon, type Champion } from "@/lib/icon-helpers";

function BanIcons({ bans, version, champions }: { bans: number[]; version: string; champions?: Record<number, Champion> }) {
	return (
		<span className="flex items-center gap-1">
			{bans.map((id) => {
				const champ = champions?.[id];
				return champ ? (
					<img
						key={id}
						src={getChampionIcon(version, champ.id)}
						alt={champ.name}
						title={champ.name}
						width={18}
						height={18}
						className="size-[18px] rounded-full opacity-70 grayscale"
					/>
				) : null;
			})}
		</span>
	);
}

/** Both teams' bans with an optional centered slot (e.g. a link to the full match). */
export function BansRow({
	blueBans,
	redBans,
	version,
	champions,
	children,
}: {
	blueBans: number[];
	redBans: number[];
	version: string;
	champions?: Record<number, Champion>;
	children?: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
			<span className="flex items-center gap-1.5">
				Bans <BanIcons bans={blueBans} version={version} champions={champions} />
			</span>
			{children}
			<span className="flex items-center gap-1.5">
				<BanIcons bans={redBans} version={version} champions={champions} /> Bans
			</span>
		</div>
	);
}
