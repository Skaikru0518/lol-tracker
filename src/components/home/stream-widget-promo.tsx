import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { StreamWidget } from "@/components/widget/stream-widget";
import { CHECKERBOARD } from "@/components/widget/checkerboard";
import { getDDragonVersion } from "@/lib/game/icon-helpers";
import { DEFAULT_WIDGET_OPTIONS } from "@/lib/widget/options";
import { SAMPLE_WIDGET } from "@/lib/widget/sample";

/** Shows streamers that the widget exists and where to make one. */
export async function StreamWidgetPromo() {
	const version = await getDDragonVersion();
	return (
		<Panel>
			<PanelHeader title="Stream widget" />
			<PanelBody className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
				<div className="space-y-2">
					<p className="font-semibold text-foreground">Your rank and session on stream</p>
					<p className="text-sm text-muted-foreground">
						Rank, LP and today&apos;s wins and losses as an OBS Browser Source, refreshed every minute. Four styles, with or without a background.
					</p>
					<p className="text-sm text-muted-foreground">
						Search your summoner, then press <span className="font-medium text-foreground">Stream widget</span> on the profile to copy your URL.
					</p>
				</div>
				<div className="grid justify-items-center gap-3 overflow-hidden rounded-lg p-4" style={CHECKERBOARD}>
					<StreamWidget data={SAMPLE_WIDGET} options={{ ...DEFAULT_WIDGET_OPTIONS, fx: ["smoke"] }} version={version} />
					<StreamWidget data={SAMPLE_WIDGET} options={{ ...DEFAULT_WIDGET_OPTIONS, style: "pill", theme: "clear" }} version={version} />
				</div>
			</PanelBody>
		</Panel>
	);
}
