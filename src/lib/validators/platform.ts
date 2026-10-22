import { z } from "zod";
import { PLATFORM_LIST, type Platform } from "@/lib/game/platforms";

export const platformSchema = z.enum(PLATFORM_LIST as [Platform, ...Platform[]]);
