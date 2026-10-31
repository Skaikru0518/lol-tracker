import {
	widgetAnimSchema,
	widgetFxSchema,
	widgetQueueSchema,
	widgetSessionSchema,
	widgetShowSchema,
	widgetStyleSchema,
	widgetThemeSchema,
	type WidgetFx,
	type WidgetOptions,
	type WidgetShow,
} from "@/lib/validators/widget";

type Params = Record<string, string | string[] | undefined>;

export const DEFAULT_SHOW: WidgetShow[] = ["id", "server", "lp", "wr"];

function first(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

function parseList<T>(raw: string | undefined, fallback: T[], schema: { safeParse: (v: unknown) => { success: boolean; data?: T } }): T[] {
	if (raw === undefined) return fallback;
	return raw.split(",").flatMap((part) => {
		const parsed = schema.safeParse(part.trim());
		return parsed.success ? [parsed.data as T] : [];
	});
}

export function parseWidgetOptions(params: Params): WidgetOptions {
	return {
		style: widgetStyleSchema.catch("bar").parse(first(params.style)),
		theme: widgetThemeSchema.catch("card").parse(first(params.theme)),
		queue: widgetQueueSchema.catch("solo").parse(first(params.queue)),
		session: widgetSessionSchema.catch("auto").parse(first(params.session)),
		show: parseList<WidgetShow>(first(params.show), DEFAULT_SHOW, widgetShowSchema),
		anim: widgetAnimSchema.catch("on").parse(first(params.anim)),
		fx: parseList<WidgetFx>(first(params.fx), [], widgetFxSchema),
	};
}

export function widgetOptionsQuery(options: WidgetOptions): string {
	return new URLSearchParams({ ...options, show: options.show.join(","), fx: options.fx.join(",") }).toString();
}

export const DEFAULT_WIDGET_OPTIONS: WidgetOptions = parseWidgetOptions({});
