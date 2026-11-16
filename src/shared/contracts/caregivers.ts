import { z } from "zod";
import { IsoDate, PageQuery, PublicArea, Uuid } from "./common";

export const ServiceKind = z.enum(["foster", "sitting"]).meta({ id: "ServiceKind" });
export const CareMode = z.enum(["host_home", "home_visit"]).meta({ id: "CareMode" });

export const Pricing = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("free") }),
    z.object({
      type: z.literal("paid"),
      priceMinor: z.int().positive(),
      currency: z.string().regex(/^[A-Z]{3}$/),
      unit: z.enum(["per_day", "per_visit"]),
    }),
  ])
  .meta({ id: "Pricing" });

/** Minimum published reviews before an average is shown (docs/07). */
export const MIN_REVIEWS_FOR_AVERAGE = 3;

/**
 * D21: trust comes only from previous requesters' reviews. The platform never verifies
 * caregivers, so platformVerified is the literal false and no "verified" badge exists.
 */
export const CaregiverTrust = z
  .object({
    source: z.literal("user_reviews"),
    platformVerified: z.literal(false),
    reviewsCount: z.int().min(0),
    averageRating: z.number().min(1).max(5).nullable(),
    completedPlacements: z.int().min(0),
  })
  .refine((t) => (t.reviewsCount < MIN_REVIEWS_FOR_AVERAGE ? t.averageRating === null : true), {
    message: `averageRating تا ${MIN_REVIEWS_FOR_AVERAGE} نظر باید null باشد.`,
    path: ["averageRating"],
  })
  .meta({ id: "CaregiverTrust" });

/** Public caregiver DTO (docs/07): no address, phone, real name, private geography or distance. */
export const PublicCaregiverSummary = z
  .object({
    id: Uuid,
    username: z.string(),
    publicArea: PublicArea,
    serviceKinds: z.array(ServiceKind).min(1),
    modes: z.array(CareMode).min(1),
    capacity: z.int().min(1).max(10),
    pricing: Pricing,
    home: z.object({
      otherPets: z.boolean(),
      children: z.boolean(),
      postOpCare: z.boolean(),
      medication: z.array(z.enum(["oral", "injection", "topical"])),
    }),
    trust: CaregiverTrust,
  })
  .meta({ id: "PublicCaregiverSummary" });

export const CaregiverListQuery = PageQuery.extend({
  area: z.string().min(1).optional(),
  from: IsoDate.optional(),
  to: IsoDate.optional(),
  kind: ServiceKind.optional(),
  mode: CareMode.optional(),
  postOp: z.stringbool().optional(),
  pricing: z.enum(["free", "paid"]).optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
});

export type PublicCaregiverSummary = z.infer<typeof PublicCaregiverSummary>;
