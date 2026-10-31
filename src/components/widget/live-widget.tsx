"use client";

import { useEffect, useRef, useState } from "react";
import { widgetDataSchema, type WidgetData, type WidgetOptions } from "@/lib/validators/widget";
import { widgetEvents } from "@/lib/widget/events";
import { sessionSince } from "@/lib/widget/format";
import { StreamWidget, WidgetNotFound } from "./stream-widget";
import { type WidgetEventsState } from "./widget-parts";

const REFRESH_MS = 60_000;
const EVENT_MS = 3500;

export function widgetApiUrl(slug: string, options: WidgetOptions, loadedAt: number): string {
	const params = new URLSearchParams({ queue: options.queue });
	const since = sessionSince(options.session, loadedAt);
	if (since !== undefined) params.set("since", String(since));
	if (options.session === "season") params.set("scope", "season");
	if (options.style === "strip" || options.anim === "on") params.set("live", "1");
	return `/api/widget/${slug}?${params}`;
}

export function LiveWidget({ slug, options, version }: { slug: string; options: WidgetOptions; version: string }) {
	const [data, setData] = useState<WidgetData | null>(null);
	const [missing, setMissing] = useState(false);
	const [events, setEvents] = useState<WidgetEventsState | null>(null);
	const previous = useRef<WidgetData | null>(null);

	useEffect(() => {
		const loadedAt = Date.now();
		let alive = true;
		let clearEvents: ReturnType<typeof setTimeout> | undefined;
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
					const happened = widgetEvents(previous.current, parsed.data);
					previous.current = parsed.data;
					if (happened.newGames.length || happened.lpDelta !== null || happened.rank) {
						setEvents({ ...happened, nonce: Date.now() });
						clearTimeout(clearEvents);
						clearEvents = setTimeout(() => setEvents(null), EVENT_MS);
					}
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
			clearTimeout(clearEvents);
		};
	}, [slug, options]);

	if (missing && !data) return <WidgetNotFound theme={options.theme} />;
	if (!data) return null;
	return <StreamWidget data={data} options={options} version={version} events={events} />;
}
