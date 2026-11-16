import { z } from "zod";
import { IsoDateTime, PageQuery, PrivatePoint, PublicArea, Uuid } from "./common";

/** Needs shown on public cat summaries (docs/04 home filters). */
export const CatNeed = z.enum(["urgent", "medical", "food_water", "adoption"]).meta({ id: "CatNeed" });

export const CareStatus = z.enum(["has_caretaker", "no_caretaker", "unknown"]);

/**
 * Public map/list DTO (docs/07). Street cats only: owned cats never appear publicly (docs/06).
 * No exact location, owner contact, real names or raw EXIF.
 */
export const PublicCatSummary = z
  .object({
    id: Uuid,
    name: z.string().nullable(),
    needs: z.array(CatNeed),
    lastSeenAt: IsoDateTime,
    publicArea: PublicArea,
    careStatus: CareStatus,
    thumbnailUrl: z.url().nullable(),
  })
  .meta({ id: "PublicCatSummary" });

export const CatListQuery = PageQuery.extend({
  needs: z
    .string()
    .transform((v) => v.split(",").filter(Boolean))
    .pipe(z.array(CatNeed))
    .optional(),
});

export const CreateCatRequest = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    sex: z.enum(["female", "male", "unknown"]).default("unknown"),
    ageEstimate: z.enum(["kitten", "young", "adult", "senior", "unknown"]).default("unknown"),
    markings: z.string().trim().max(200).optional(),
    mediaIds: z.array(Uuid).max(10).default([]),
    observation: z.object({
      observedAt: IsoDateTime,
      location: PrivatePoint,
      precision: z.enum(["exact", "approximate"]),
    }),
  })
  .meta({ id: "CreateCatRequest" });

export type CatNeed = z.infer<typeof CatNeed>;
export type PublicCatSummary = z.infer<typeof PublicCatSummary>;
