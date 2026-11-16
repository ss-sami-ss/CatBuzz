import { z } from "zod";
import { IsoDate, Uuid, Version } from "./common";
import { CareMode, ServiceKind } from "./caregivers";

/** POST /placement-requests (docs/07, docs/08). Requires an Idempotency-Key header. */
export const CreatePlacementRequest = z
  .object({
    catIds: z.array(Uuid).min(1).max(5),
    caregiverId: Uuid,
    kind: ServiceKind,
    mode: CareMode,
    from: IsoDate,
    to: IsoDate,
    note: z.string().trim().max(1000).optional(),
  })
  .refine((r) => r.from < r.to, { message: "تاریخ پایان باید بعد از تاریخ شروع باشد.", path: ["to"] })
  .refine((r) => new Set(r.catIds).size === r.catIds.length, { message: "گربهٔ تکراری انتخاب شده است.", path: ["catIds"] })
  .meta({ id: "CreatePlacementRequest" });

/** POST /placement-requests/{id}/decision — caregiver only. Decline reason stays private. */
export const PlacementDecisionRequest = z
  .discriminatedUnion("decision", [
    z.object({ decision: z.literal("accept"), version: Version }),
    z.object({ decision: z.literal("decline"), version: Version, declineReason: z.string().trim().min(1).max(500) }),
  ])
  .meta({ id: "PlacementDecisionRequest" });

export const PlacementRequestStatus = z
  .enum(["pending", "accepted", "declined", "cancelled", "expired"])
  .meta({ id: "PlacementRequestStatus" });
