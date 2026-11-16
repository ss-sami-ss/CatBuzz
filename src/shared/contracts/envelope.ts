import { z } from "zod";

export const Meta = z
  .object({
    requestId: z.string(),
    /** Opaque; null on the last page. Present only on list responses. */
    nextCursor: z.string().nullable().optional(),
  })
  .meta({ id: "Meta" });

/** Success body: {"data": ..., "meta": {...}} (docs/07). */
export function dataEnvelope<T extends z.ZodType>(data: T) {
  return z.object({ data, meta: Meta });
}

export type Meta = z.infer<typeof Meta>;
