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

/** Volunteer capabilities (R02). Veterinary competence is never self-declared here; it needs a verified credential (T09). */
export const Capability = z
  .enum(["feeding", "transport", "trapping", "foster", "medication", "fundraising", "photography"])
  .meta({ id: "Capability" });

export const CapabilitiesDto = z.object({ capabilities: z.array(Capability) }).meta({ id: "CapabilitiesDto" });

export const PutCapabilitiesRequest = z
  .object({ capabilities: z.array(Capability).max(7) })
  .refine((r) => new Set(r.capabilities).size === r.capabilities.length, { message: "توانمندی تکراری است.", path: ["capabilities"] })
  .meta({ id: "PutCapabilitiesRequest" });

export type Capability = z.infer<typeof Capability>;
export type MeDto = z.infer<typeof MeDto>;

export const CredentialStatusDto = z
  .object({
    id: Uuid,
    profession: z.enum(["veterinarian", "vet_technician", "counselor"]),
    status: z.enum(["pending", "verified", "rejected", "expired", "revoked"]),
    expiresAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .meta({ id: "CredentialStatusDto" });
