import { and, eq, gt, isNull, or } from "drizzle-orm";
import type { Db } from "../db/client";
import { groupMemberships, professionalCredentials, users } from "../db/schema";
import { ApiError } from "../http/api-error";

type Profession = typeof professionalCredentials.$inferSelect.profession;
type GroupRole = typeof groupMemberships.$inferSelect.role;
type PolicyDb = Pick<Db, "select">;

function activeGroupMembership(userId: string, groupId: string) {
  return and(
    eq(groupMemberships.userId, userId),
    eq(groupMemberships.groupId, groupId),
    eq(groupMemberships.status, "active"),
    eq(users.status, "active"),
  );
}

/** Resolve the actor's current role for this group. Call again after any access change. */
export async function requireGroupRole(db: PolicyDb, userId: string, groupId: string, allowed: readonly GroupRole[]) {
  const [membership] = await db
    .select({ role: groupMemberships.role })
    .from(groupMemberships)
    .innerJoin(users, eq(users.id, groupMemberships.userId))
    .where(activeGroupMembership(userId, groupId))
    .limit(1);
  if (!membership || !allowed.includes(membership.role)) throw new ApiError("FORBIDDEN");
}

/** A credential is one gate. The caller must still check access to its specific resource. */
export async function requireProfessionalCredential(db: PolicyDb, userId: string, profession: Profession, now: Date) {
  const [credential] = await db
    .select({ id: professionalCredentials.id })
    .from(professionalCredentials)
    .innerJoin(users, eq(users.id, professionalCredentials.userId))
    .where(and(
      eq(users.status, "active"),
      eq(professionalCredentials.userId, userId),
      eq(professionalCredentials.profession, profession),
      eq(professionalCredentials.status, "verified"),
      or(isNull(professionalCredentials.expiresAt), gt(professionalCredentials.expiresAt, now)),
    ))
    .limit(1);
  if (!credential) throw new ApiError("FORBIDDEN");
  return credential.id;
}

export async function listOwnCredentials(db: PolicyDb, userId: string, now: Date) {
  const rows = await db
    .select({
      id: professionalCredentials.id,
      profession: professionalCredentials.profession,
      status: professionalCredentials.status,
      expiresAt: professionalCredentials.expiresAt,
    })
    .from(professionalCredentials)
    .where(eq(professionalCredentials.userId, userId))
    .orderBy(professionalCredentials.createdAt, professionalCredentials.id);

  return rows.map(({ expiresAt, ...row }) => ({
    ...row,
    status: row.status === "verified" && expiresAt && expiresAt <= now ? "expired" as const : row.status,
    expiresAt: expiresAt?.toISOString() ?? null,
  }));
}
