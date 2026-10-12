import { z } from "zod";
import { GRADES } from "@/lib/performance/grades";
import { ROLES } from "@/lib/performance/roles";
import { CATEGORIES, METRIC_IDS } from "@/lib/performance/weights";

const quantilesSchema = z.array(z.number()).length(21);

const roleBaselineSchema = z.object({
	games: z.number(),
	metrics: z.partialRecord(z.enum(METRIC_IDS), quantilesSchema),
	calibration: z.object({ overall: quantilesSchema, categories: z.partialRecord(z.enum(CATEGORIES), quantilesSchema) }).optional(),
});

export const baselinesSchema = z.object({
	computedAt: z.string(),
	sampleSize: z.number(),
	roles: z.partialRecord(z.enum(ROLES), roleBaselineSchema),
});

export type Baselines = z.infer<typeof baselinesSchema>;
export type RoleBaseline = z.infer<typeof roleBaselineSchema>;

const gradeSchema = z.enum(GRADES);

export const performanceScoreSchema = z.object({
	role: z.enum(ROLES),
	score: z.number(),
	grade: gradeSchema,
	baselineGames: z.number(),
	categories: z.array(
		z.object({
			id: z.enum(CATEGORIES),
			score: z.number(),
			grade: gradeSchema,
			metrics: z.array(z.object({ id: z.enum(METRIC_IDS), value: z.number(), percentile: z.number() })),
		}),
	),
	opponent: z
		.object({ championName: z.string(), goldDiff: z.number(), xpDiff: z.number().nullable(), csDiff: z.number(), damageDiff: z.number() })
		.nullable(),
});

export const matchPerformanceSchema = z.record(z.string(), performanceScoreSchema);
export type MatchPerformance = z.infer<typeof matchPerformanceSchema>;

export const performanceSummariesSchema = z.record(z.string(), z.object({ score: z.number(), grade: gradeSchema }).nullable());
export type PerformanceSummaries = z.infer<typeof performanceSummariesSchema>;
