import { ObjectivesPanel } from "@/components/match/objectives-panel";
import { type PlayerTabProps } from "./player-tabs";

/** The match's objectives timeline; `PlayerTabs` only renders this tab once the timeline is ready. */
export function ObjectivesTab({ timeline }: PlayerTabProps) {
	return timeline ? <ObjectivesPanel timeline={timeline} /> : null;
}
