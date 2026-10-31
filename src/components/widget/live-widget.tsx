"use client";

import { useEffect, useState } from "react";
import { widgetDataSchema, type WidgetData, type WidgetOptions } from "@/lib/validators/widget";
import { sessionSince } from "@/lib/widget/format";
import { StreamWidget, WidgetNotFound } from "./stream-widget";

const REFRESH_MS = 60_000;

export function widgetApiUrl(slug: string, options: WidgetOptions, loadedAt: number): string {
	const params = new URLSearchParams({ queue: options.queue });
	const since = sessionSince(options.session, loadedAt);
	if (since !== undefined) params.set("since", String(since));
	if (options.session === "season") params.set("scope", "season");
	if (options.style === "strip") params.set("live", "1");
	return `/api/widget/${slug}?${params}`;
}

export function LiveWidget({ slug, options, version }: { slug: string; options: WidgetOptions; version: string }) {
	const [data, setData] = useState<WidgetData | null>(null);
	const [missing, setMissing] = useState(false);

	useEffect(() => {
		const loadedAt = Date.now();
		let alive = true;
		async function load() {
			try {
				const res = await fetch(widgetApiUrl(slug, options, loadedAt), { cache: "no-store" });
				if (res.status === 404) {
					if (alive) setMissing(true);
					return;
				}
				if (!res.ok) return;
				const parsed = widgetDataSchema.safeParse(await res.json());
				if (alive && parsed.success) {
					setData(parsed.data);
					setMissing(false);
				}
			} catch {
				// keep showing the last data on a failed refresh
			}
		}
		load();
		const timer = setInterval(load, REFRESH_MS);
		return () => {
			alive = false;
			clearInterval(timer);
		};
	}, [slug, options]);

	if (missing && !data) return <WidgetNotFound theme={options.theme} />;
	if (!data) return null;
	return <StreamWidget data={data} options={options} version={version} />;
}
