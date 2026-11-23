import { and, eq } from "drizzle-orm";
import type { CredentialReviewInput } from "@/shared/contracts/users";
import type { Db } from "../db/client";
import { auditLogs, media, professionalCredentials, users } from "../db/schema";
import { ApiError } from "../http/api-error";

export async function reviewCredential(
  db: Db,
  actorId: string,
  credentialId: string,
  input: CredentialReviewInput,
  now: Date,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [actor] = await tx.select({ status: users.status }).from(users).where(eq(users.id, actorId)).for("share");
    if (actor?.status !== "active") throw new ApiError("FORBIDDEN");

    const [credential] = await tx
      .select()
      .from(professionalCredentials)
      .where(eq(professionalCredentials.id, credentialId))
      .for("update");

    if (!credential) throw new ApiError("NOT_FOUND");
    if (credential.userId === actorId) throw new ApiError("FORBIDDEN");

    const expectedStatus = input.status === "revoked" ? "verified" : "pending";
    if (credential.status !== expectedStatus) throw new ApiError("CONFLICT");

    const expiresAt = input.status === "verified" ? new Date(input.expiresAt) : credential.expiresAt;
    if (input.status === "verified" && expiresAt && expiresAt <= now) {
      throw new ApiError("VALIDATION_FAILED", { fieldErrors: { expiresAt: ["تاریخ انقضا باید در آینده باشد."] } });
    }
    if (input.status === "verified") {
      const [evidence] = credential.evidenceMediaId
        ? await tx.select({ id: media.id }).from(media).where(and(
          eq(media.id, credential.evidenceMediaId),
          eq(media.ownerId, credential.userId),
          eq(media.status, "ready"),
          eq(media.visibility, "private"),
        )).for("share")
        : [];
      if (!evidence) {
        throw new ApiError("CONFLICT", { message: "برای تأیید صلاحیت، مدرک خصوصی باید آماده باشد." });
      }
    }

    await tx.update(professionalCredentials).set({
      status: input.status,
      ...(input.status === "verified" && { verifiedBy: actorId, verifiedAt: now, expiresAt }),
    }).where(eq(professionalCredentials.id, credentialId));

    await tx.insert(auditLogs).values({
      actorId,
      action: "credential.review",
      resourceKind: "professional_credential",
      resourceId: credentialId,
      requestId,
      changes: { from: credential.status, to: input.status, reason: input.reason },
      occurredAt: now,
    });

    return {
      id: credentialId,
      profession: credential.profession,
      status: input.status,
      expiresAt: expiresAt?.toISOString() ?? null,
    };
  });
}
