import ObjectivesTimeline from "@/components/match/objectives-timeline";
import { type PlayerTabProps } from "./player-tabs";

/** The match's objective, tower and kill events. */
export function ObjectivesTab({ match, timeline, version }: PlayerTabProps) {
	return <ObjectivesTimeline timeline={timeline} participants={match.info.participants} version={version} />;
}
