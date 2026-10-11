import { z } from "zod";

export const heatmapCellSchema = z.object({
	day: z.number(),
	slot: z.number(),
	wins: z.number(),
	games: z.number(),
});

export const winrateHeatmapSchema = z.object({
	cells: z.array(heatmapCellSchema),
	games: z.number(),
});

export type HeatmapCell = z.infer<typeof heatmapCellSchema>;
export type WinrateHeatmap = z.infer<typeof winrateHeatmapSchema>;
