import { z } from "zod";
import { IsoDateTime, PageQuery, PrivatePoint, PublicArea, Uuid, Version } from "./common";

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
    .max(128)
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
    publishPhotos: z.boolean().optional(),
    observation: z.object({
      observedAt: IsoDateTime,
      location: PrivatePoint,
      precision: z.enum(["exact", "approximate"]),
    }),
  })
  .meta({ id: "CreateCatRequest" });

export type CatNeed = z.infer<typeof CatNeed>;
export type PublicCatSummary = z.infer<typeof PublicCatSummary>;

export const CreateSightingRequest = z.strictObject({
  observedAt: IsoDateTime,
  location: PrivatePoint,
  precision: z.enum(["exact", "approximate"]),
  note: z.string().trim().max(500).optional(),
}).meta({ id: "CreateSightingRequest" });

export const UpdateCatRequest = z.strictObject({
  version: Version,
  name: z.string().trim().min(1).max(40).nullable().optional(),
  sex: CreateCatRequest.shape.sex.unwrap().optional(),
  ageEstimate: CreateCatRequest.shape.ageEstimate.unwrap().optional(),
  markings: z.string().trim().max(200).nullable().optional(),
}).refine(({ name, sex, ageEstimate, markings }) => [name, sex, ageEstimate, markings].some((value) => value !== undefined))
  .meta({ id: "UpdateCatRequest" });

export const PublicCatDetail = PublicCatSummary.extend({
  photoIds: z.array(Uuid),
  sex: CreateCatRequest.shape.sex.unwrap(),
  ageEstimate: CreateCatRequest.shape.ageEstimate.unwrap(),
  markings: z.string().nullable(),
  version: Version,
}).meta({ id: "PublicCatDetail" });

export const SightingReceipt = z.object({ id: Uuid }).meta({ id: "SightingReceipt" });
