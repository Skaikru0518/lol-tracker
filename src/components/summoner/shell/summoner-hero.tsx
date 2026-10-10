import { HeroBanner } from "@/components/ui/hero-banner";
import { Chip } from "@/components/ui/chip";
import { getChampionSplash, getSummonerIcon } from "@/lib/game/icon-helpers";
import { rankPills } from "@/lib/summoner/profile/rank-pills";
import { type SummonerProfile } from "@/lib/summoner/profile/get-profile";
import { CopyRiotId } from "./copy-riot-id";
import { RefreshButton } from "./refresh-button";

/** Profile header: splash art, icon with level, Riot ID, rank chips and the update button. */
export function SummonerHero({
	profile,
	version,
	splashChampion,
}: {
	profile: SummonerProfile;
	version: string;
	splashChampion: string | null;
}) {
	const { account, summoner, ranked } = profile;
	const riotId = `${account.gameName}#${account.tagLine}`;

	return (
		<HeroBanner
			splashUrl={splashChampion ? getChampionSplash(splashChampion) : null}
			objectPosition="center 25%"
			className="border-b"
		>
			<div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pb-5 pt-14 sm:flex-row sm:items-end sm:px-6 sm:pt-20">
				<div className="relative shrink-0 self-start">
					<img
						src={getSummonerIcon(version, summoner.profileIconId)}
						alt={account.gameName}
						width={80}
						height={80}
						className="size-20 rounded-xl border-2 border-primary/70"
					/>
					<span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border bg-nav px-2 text-2xs font-medium text-foreground">
						{summoner.summonerLevel}
					</span>
				</div>

				<div className="min-w-0 flex-1">
					<h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						<span className="truncate">{account.gameName}</span>
						<span className="text-base font-medium text-muted-foreground sm:text-lg">#{account.tagLine}</span>
						<CopyRiotId riotId={riotId} />
					</h1>
					<p className="text-sm text-muted-foreground">EUNE</p>
					<div className="mt-2 flex flex-wrap gap-1.5">
						{rankPills(ranked).map((pill) => (
							<Chip key={pill.queueType} color={pill.color}>
								{pill.label}
							</Chip>
						))}
					</div>
				</div>

				<RefreshButton puuid={account.puuid} />
			</div>
		</HeroBanner>
	);
}
