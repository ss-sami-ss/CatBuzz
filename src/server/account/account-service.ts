import { and, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import type { Capability, UpdateMeRequest } from "@/shared/contracts/users";
import { loadMe } from "../auth/auth-service";
import type { Db } from "../db/client";
import { userPrivate, users, volunteerCapabilities } from "../db/schema";
import { ApiError } from "../http/api-error";

const USERNAME_TAKEN = "این نام کاربری قبلاً گرفته شده است. نام دیگری انتخاب کنید.";

function isUniqueViolation(error: unknown, constraint: string) {
  const e = ((error as { cause?: unknown }).cause ?? error) as { code?: string; constraint_name?: string };
  return e.code === "23505" && e.constraint_name === constraint;
}

/**
 * Edits the caller's own profile with optimistic concurrency. The username is public and unique
 * (case-insensitive); first and last name stay private (R01).
 */
export async function updateMe(db: Db, userId: string, input: z.output<typeof UpdateMeRequest>) {
  try {
    await db.transaction(async (tx) => {
      const userChanges =
        input.username === undefined ? {} : { username: input.username, normalizedUsername: input.username.toLowerCase() };
      const [updated] = await tx
        .update(users)
        .set({ ...userChanges, version: sql`${users.version} + 1`, updatedAt: new Date() })
        .where(and(eq(users.id, userId), eq(users.version, input.version)))
        .returning({ id: users.id });
      if (!updated) throw new ApiError("VERSION_CONFLICT");

      const privateChanges = {
        ...(input.firstName === undefined ? {} : { firstName: input.firstName }),
        ...(input.lastName === undefined ? {} : { lastName: input.lastName }),
      };
      if (Object.keys(privateChanges).length) {
        await tx
          .insert(userPrivate)
          .values({ userId, ...privateChanges })
          .onConflictDoUpdate({ target: userPrivate.userId, set: { ...privateChanges, updatedAt: new Date() } });
      }
    });
  } catch (error) {
    if (isUniqueViolation(error, "users_normalized_username_key")) {
      throw new ApiError("VALIDATION_FAILED", { message: USERNAME_TAKEN, fieldErrors: { username: [USERNAME_TAKEN] } });
    }
    throw error;
  }
  return (await loadMe(db, userId))!;
}

export async function getCapabilities(db: Db, userId: string): Promise<Capability[]> {
  const rows = await db
    .select({ capability: volunteerCapabilities.capability })
    .from(volunteerCapabilities)
    .where(eq(volunteerCapabilities.userId, userId))
    .orderBy(volunteerCapabilities.capability);
  return rows.map((row) => row.capability as Capability);
}

/** Replaces the whole set; keeps rows (and their capacity/area) for capabilities that stay. */
export async function setCapabilities(db: Db, userId: string, next: Capability[]): Promise<Capability[]> {
  await db.transaction(async (tx) => {
    // Serialize replacements for this account, including when it has no capability rows.
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
    const current = new Set(
      (await tx.select({ capability: volunteerCapabilities.capability }).from(volunteerCapabilities).where(eq(volunteerCapabilities.userId, userId))).map(
        (row) => row.capability as Capability,
      ),
    );
    const wanted = new Set(next);
    const removed = [...current].filter((c) => !wanted.has(c));
    const added = next.filter((c) => !current.has(c));
    for (const capability of removed) {
      await tx.delete(volunteerCapabilities).where(and(eq(volunteerCapabilities.userId, userId), eq(volunteerCapabilities.capability, capability)));
    }
    if (added.length) {
      await tx.insert(volunteerCapabilities).values(added.map((capability) => ({ userId, capability }))).onConflictDoNothing();
    }
  });
  return getCapabilities(db, userId);
}
