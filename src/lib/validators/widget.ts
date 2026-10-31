import { z } from "zod";

export const WIDGET_STYLES = ["bar", "square", "strip", "pill"] as const;
export const WIDGET_THEMES = ["card", "clear"] as const;
export const WIDGET_QUEUES = ["solo", "flex"] as const;
export const WIDGET_SESSIONS = ["auto", "today", "load", "season"] as const;
export const WIDGET_SHOW = ["id", "server", "lp", "wr"] as const;
export const WIDGET_ANIMS = ["on", "off"] as const;
export const WIDGET_FX = ["rotate", "smoke"] as const;

export const widgetStyleSchema = z.enum(WIDGET_STYLES);
export const widgetThemeSchema = z.enum(WIDGET_THEMES);
export const widgetQueueSchema = z.enum(WIDGET_QUEUES);
export const widgetSessionSchema = z.enum(WIDGET_SESSIONS);
export const widgetShowSchema = z.enum(WIDGET_SHOW);
export const widgetAnimSchema = z.enum(WIDGET_ANIMS);
export const widgetFxSchema = z.enum(WIDGET_FX);

export const widgetOptionsSchema = z.object({
	style: widgetStyleSchema,
	theme: widgetThemeSchema,
	queue: widgetQueueSchema,
	session: widgetSessionSchema,
	show: z.array(widgetShowSchema),
	anim: widgetAnimSchema,
	fx: z.array(widgetFxSchema),
});

export const widgetGameSchema = z.object({
	matchId: z.string(),
	championName: z.string(),
	win: z.boolean(),
	kills: z.number(),
	deaths: z.number(),
	assists: z.number(),
	start: z.number(),
	end: z.number(),
});

export const widgetRankSchema = z.object({
	tier: z.string(),
	division: z.string(),
	leaguePoints: z.number(),
});

export const widgetDataSchema = z.object({
	gameName: z.string(),
	tagLine: z.string(),
	platform: z.enum(["eune", "euw"]),
	rank: widgetRankSchema.nullable(),
	scope: z.enum(["session", "season"]),
	record: z.object({ wins: z.number(), losses: z.number() }),
	season: z.object({ wins: z.number(), losses: z.number() }).nullable(),
	games: z.array(widgetGameSchema),
	lpChange: z.number().nullable(),
	liveChampion: z.string().nullable(),
	liveStartedAt: z.number().nullable(),
});

export const widgetQuerySchema = z.object({
	queue: widgetQueueSchema.catch("solo"),
	since: z.coerce.number().int().nonnegative().optional().catch(undefined),
	scope: z.enum(["session", "season"]).optional().catch(undefined),
	live: z
		.enum(["1", "0"])
		.optional()
		.transform((v) => v === "1")
		.catch(false),
});

export type WidgetStyle = z.infer<typeof widgetStyleSchema>;
export type WidgetTheme = z.infer<typeof widgetThemeSchema>;
export type WidgetQueue = z.infer<typeof widgetQueueSchema>;
export type WidgetSession = z.infer<typeof widgetSessionSchema>;
export type WidgetShow = z.infer<typeof widgetShowSchema>;
export type WidgetFx = z.infer<typeof widgetFxSchema>;
export type WidgetOptions = z.infer<typeof widgetOptionsSchema>;
export type WidgetGame = z.infer<typeof widgetGameSchema>;
export type WidgetRank = z.infer<typeof widgetRankSchema>;
export type WidgetData = z.infer<typeof widgetDataSchema>;
export type WidgetQuery = z.infer<typeof widgetQuerySchema>;
