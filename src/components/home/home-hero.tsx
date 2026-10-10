import { HeroBanner } from "@/components/ui/hero-banner";
import { Logo } from "@/components/layout/logo";
import SearchHistory from "@/components/search/search-history";
import SummonerSearch from "@/components/search/summoner-search";
import { getChampionSplash } from "@/lib/icon-helpers";

/** Ahri splash with the large logo, the summoner search and the local search history chips. */
export function HomeHero() {
	return (
		<HeroBanner splashUrl={getChampionSplash("Ahri")} objectPosition="center 25%" className="border-b">
			<div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 py-16 text-center sm:py-24">
				<Logo className="text-5xl sm:text-6xl" />
				<p className="text-sm text-muted-foreground">League of Legends summoner tracker · EUNE</p>
				<div className="w-full max-w-xl space-y-3 rounded-xl border border-primary/30 bg-background/85 p-3 shadow-2xl backdrop-blur-md">
					<SummonerSearch />
					<div className="flex justify-center">
						<SearchHistory />
					</div>
				</div>
			</div>
		</HeroBanner>
	);
}
