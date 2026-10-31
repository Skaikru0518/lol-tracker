import type { Metadata } from "next";
import { LiveWidget } from "@/components/widget/live-widget";
import { getDDragonVersion } from "@/lib/game/icon-helpers";
import { isMaintenanceMode } from "@/lib/server/app-settings";
import { parseWidgetOptions } from "@/lib/widget/options";

export const metadata: Metadata = { title: "Stream widget", robots: { index: false, follow: false } };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function WidgetPage({ params, searchParams }: Props) {
	// During maintenance the widget simply disappears from the stream instead of showing a maintenance screen
	if (await isMaintenanceMode()) return null;

	const [{ slug }, query, version] = await Promise.all([params, searchParams, getDDragonVersion()]);
	return <LiveWidget slug={slug} options={parseWidgetOptions(query)} version={version} />;
}
