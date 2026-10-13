import { z } from "zod";

export const apexCutoffSchema = z.object({ grandmaster: z.number(), challenger: z.number() });
export type ApexCutoff = z.infer<typeof apexCutoffSchema>;
