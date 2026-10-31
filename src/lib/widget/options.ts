import {
	widgetQueueSchema,
	widgetSessionSchema,
	widgetShowSchema,
	widgetStyleSchema,
	widgetThemeSchema,
	type WidgetOptions,
	type WidgetShow,
} from "@/lib/validators/widget";

type Params = Record<string, string | string[] | undefined>;

export const DEFAULT_SHOW: WidgetShow[] = ["id", "server", "lp", "wr"];

function first(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

function parseShow(raw: string | undefined): WidgetShow[] {
	if (raw === undefined) return DEFAULT_SHOW;
	return raw.split(",").flatMap((part) => {
		const parsed = widgetShowSchema.safeParse(part.trim());
		return parsed.success ? [parsed.data] : [];
	});
}

export function parseWidgetOptions(params: Params): WidgetOptions {
	return {
		style: widgetStyleSchema.catch("bar").parse(first(params.style)),
		theme: widgetThemeSchema.catch("card").parse(first(params.theme)),
		queue: widgetQueueSchema.catch("solo").parse(first(params.queue)),
		session: widgetSessionSchema.catch("auto").parse(first(params.session)),
		show: parseShow(first(params.show)),
	};
}

export function widgetOptionsQuery(options: WidgetOptions): string {
	return new URLSearchParams({ ...options, show: options.show.join(",") }).toString();
}
