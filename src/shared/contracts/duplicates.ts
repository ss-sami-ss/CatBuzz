import { z } from "zod";
import { Uuid } from "./common";

export const MergeRequest = z.strictObject({ candidateId: Uuid, reason: z.string().trim().min(1).max(500) }).meta({ id: "MergeRequest" });
export const MergeReceipt = z.object({ id: Uuid, status: z.literal("open") }).meta({ id: "MergeReceipt" });
export const SimilarCat = z.object({ id: Uuid, name: z.string().nullable(), areaLabel: z.string().nullable() }).meta({ id: "SimilarCat" });
