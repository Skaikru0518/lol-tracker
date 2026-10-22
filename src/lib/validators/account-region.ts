import { z } from "zod";

export const accountRegionSchema = z.object({ puuid: z.string(), game: z.string(), region: z.string() });
export type AccountRegion = z.infer<typeof accountRegionSchema>;
