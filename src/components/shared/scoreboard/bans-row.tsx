import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getChampionIcon, type Champion } from "@/lib/icon-helpers";

function BanIcons({ bans, version, champions }: { bans: number[]; version: string; champions?: Record<number, Champion> }) {
	return (
		<span className="flex items-center gap-1">
			{bans.map((id) => {
				const champ = champions?.[id];
				return champ ? (
					<Tooltip key={id}>
						<TooltipTrigger asChild>
							<img
								src={getChampionIcon(version, champ.id)}
								alt={champ.name}
								width={18}
								height={18}
								className="size-4.5 cursor-pointer rounded-full opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
							/>
						</TooltipTrigger>
						<TooltipContent>{champ.name}</TooltipContent>
					</Tooltip>
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
