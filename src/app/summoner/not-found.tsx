import SummonerSearch from "@/components/search/summoner-search";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";

/** Shown when a Riot ID does not exist or has no EUNE summoner. */
export default function SummonerNotFound() {
	return (
		<div className="mx-auto max-w-lg px-4 py-20">
			<Panel className="p-4">
				<EmptyState
					title="Summoner not found"
					description="Check the Riot ID (GameName#TAG). Summon.gg only tracks EUNE accounts."
				/>
				<SummonerSearch />
			</Panel>
		</div>
	);
}
