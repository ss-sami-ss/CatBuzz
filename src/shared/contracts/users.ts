import { z } from "zod";
import { Uuid, Version } from "./common";

export const Username = z
  .string()
  .trim()
  .regex(/^[a-z0-9_]{3,30}$/i, "نام کاربری ۳ تا ۳۰ حرف لاتین، عدد یا _ است.");

/** Public identity: username only. Real names and contact are never public (R01). */
export const PublicUserSummary = z
  .object({ id: Uuid, username: z.string() })
  .meta({ id: "PublicUserSummary" });

/** GET /me — private fields, returned only to the account owner. Never cached (no-store). */
export const MeDto = z
  .object({
    id: Uuid,
    username: z.string().nullable(),
    status: z.enum(["pending_activation", "active", "suspended"]),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    verifiedContact: z.object({ kind: z.literal("email"), value: z.string() }).nullable(),
    version: Version,
  })
  .meta({ id: "MeDto" });

export const UpdateMeRequest = z
  .object({
    username: Username.optional(),
    firstName: z.string().trim().min(1).max(60).optional(),
    lastName: z.string().trim().min(1).max(60).optional(),
    version: Version,
  })
  .meta({ id: "UpdateMeRequest" });
