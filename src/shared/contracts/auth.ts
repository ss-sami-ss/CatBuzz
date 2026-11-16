import { z } from "zod";
import { toAsciiDigits } from "../validation/digits";
import { Uuid } from "./common";

/** D04: email-first activation; SMS joins later behind the same adapter (contact stays a union then). */
export const AuthChallengeRequest = z
  .object({
    contact: z.object({ kind: z.literal("email"), value: z.email().transform((v) => v.trim().toLowerCase()) }),
    purpose: z.enum(["sign_up", "sign_in"]),
  })
  .meta({ id: "AuthChallengeRequest" });

/** Same answer whether or not an account exists (no account enumeration). */
export const AuthChallengeResponse = z
  .object({ challengeId: Uuid, expiresAt: z.iso.datetime({ offset: true }) })
  .meta({ id: "AuthChallengeResponse" });

export const AuthVerifyRequest = z
  .object({
    challengeId: Uuid,
    /** 6 digits; Persian keyboard digits are accepted. */
    code: z
      .string()
      .transform((v) => toAsciiDigits(v).replace(/\s/g, ""))
      .pipe(z.string().regex(/^\d{6}$/, "کد باید ۶ رقم باشد.")),
  })
  .meta({ id: "AuthVerifyRequest" });
