import { z } from "zod";
import { platformSchema } from "./platform";

export const locateResultSchema = z.object({ slug: z.string(), platform: platformSchema });
export type LocateResult = z.infer<typeof locateResultSchema>;
