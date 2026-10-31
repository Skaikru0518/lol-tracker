"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	WIDGET_QUEUES,
	WIDGET_SESSIONS,
	WIDGET_STYLES,
	WIDGET_THEMES,
	widgetDataSchema,
	type WidgetOptions,
	type WidgetShow,
} from "@/lib/validators/widget";
import { STYLE_SIZES, styleParts } from "@/lib/widget/format";
import { DEFAULT_SHOW, widgetOptionsQuery } from "@/lib/widget/options";
import { withSampleSession } from "@/lib/widget/sample";
import { CHECKERBOARD } from "./checkerboard";
import { widgetApiUrl } from "./live-widget";
import { StreamWidget } from "./stream-widget";

const LABELS: Record<string, string> = {
	bar: "Bar",
	square: "Square",
	strip: "Strip",
	pill: "Pill",
	card: "Card",
	clear: "Clear",
	solo: "Solo/Duo",
	flex: "Flex",
	auto: "Auto",
	today: "Today",
	load: "On load",
	id: "Riot ID",
	server: "Server",
	lp: "LP change",
	wr: "Win rate %",
};

function Segmented<T extends string>({ label, values, value, onChange }: { label: string; values: readonly T[]; value: T; onChange: (v: T) => void }) {
	return (
		<div className="grid gap-1.5">
			<span className="text-xs font-medium text-muted-foreground">{label}</span>
			<div className="flex gap-0.5 rounded-lg bg-secondary p-0.5">
				{values.map((v) => (
					<button
						key={v}
						type="button"
						onClick={() => onChange(v)}
						className={cn(
							"flex-1 rounded-md py-1 text-xs font-medium text-muted-foreground transition-colors",
							v === value && "bg-card text-foreground shadow-sm ring-1 ring-border",
						)}
					>
						{LABELS[v]}
					</button>
				))}
			</div>
		</div>
	);
}

export function WidgetGenerator({ slug, version }: { slug: string; version: string }) {
	const [options, setOptions] = useState<WidgetOptions>({ style: "bar", theme: "card", queue: "solo", session: "auto", show: DEFAULT_SHOW });

	const set = <K extends keyof WidgetOptions>(key: K, value: WidgetOptions[K]) => setOptions((o) => ({ ...o, [key]: value }));
	const toggle = (part: WidgetShow) => set("show", options.show.includes(part) ? options.show.filter((p) => p !== part) : [...options.show, part]);

	const { data: real } = useQuery({
		queryKey: ["widget", slug, options.queue, options.session],
		queryFn: async () => {
			const res = await fetch(widgetApiUrl(slug, { ...options, style: "strip" }, Date.now()));
			if (!res.ok) throw new Error("Widget data unavailable");
			return widgetDataSchema.parse(await res.json());
		},
		staleTime: 60_000,
	});
	const preview = useMemo(() => (real ? withSampleSession(real) : null), [real]);

	// Only rendered inside the opened dialog, never on the server
	const url = `${window.location.origin}/widget/${slug}?${widgetOptionsQuery(options)}`;
	const size = STYLE_SIZES[options.style];

	async function copy() {
		await navigator.clipboard.writeText(url);
		toast.success("Widget URL copied");
	}

	return (
		<div className="grid gap-5 md:grid-cols-[16rem_minmax(0,1fr)]">
			<div className="grid content-start gap-4">
				<Segmented label="Style" values={WIDGET_STYLES} value={options.style} onChange={(v) => set("style", v)} />
				<Segmented label="Theme" values={WIDGET_THEMES} value={options.theme} onChange={(v) => set("theme", v)} />
				<Segmented label="Queue" values={WIDGET_QUEUES} value={options.queue} onChange={(v) => set("queue", v)} />
				<div className="grid gap-1.5">
					<Segmented label="Session starts" values={WIDGET_SESSIONS} value={options.session} onChange={(v) => set("session", v)} />
					<span className="text-xs text-muted-foreground">
						{options.session === "auto" && "A new session starts after 3 hours without a game."}
						{options.session === "today" && "Counts from your local midnight."}
						{options.session === "load" && "Counts from when OBS loads the widget."}
					</span>
				</div>
				<div className="grid gap-1.5">
					<span className="text-xs font-medium text-muted-foreground">Show</span>
					{styleParts(options.style).map((part) => (
						<label key={part} className="flex items-center gap-2 text-sm">
							<input type="checkbox" className="accent-primary" checked={options.show.includes(part)} onChange={() => toggle(part)} />
							{LABELS[part]}
						</label>
					))}
				</div>
			</div>

			<div className="grid min-w-0 content-start gap-3">
				<div className="relative grid min-h-48 place-items-center overflow-hidden rounded-lg p-4" style={CHECKERBOARD}>
					{preview ? <StreamWidget data={preview.data} options={options} version={version} /> : <span className="text-xs text-muted-foreground">Loading preview…</span>}
					{preview?.sample && <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-2xs text-white">Sample session</span>}
				</div>
				<div className="flex min-w-0 gap-2">
					<code className="min-w-0 flex-1 truncate rounded-md border bg-secondary px-2.5 py-1.5 text-xs">{url}</code>
					<Button size="lg" onClick={copy}>
						Copy URL
					</Button>
					<Button size="lg" variant="outline" asChild>
						<a href={url} target="_blank" rel="noreferrer">
							Open
						</a>
					</Button>
				</div>
				<p className="text-xs leading-relaxed text-muted-foreground">
					<span className="font-medium text-foreground">OBS:</span> Sources → + → Browser, paste the URL, width {size.width}, height {size.height}. The background
					is transparent, no custom CSS needed. It refreshes itself every minute.
				</p>
			</div>
		</div>
	);
}
