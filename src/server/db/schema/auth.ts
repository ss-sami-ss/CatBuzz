import { sql } from "drizzle-orm";
import { check, index, integer, pgEnum, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tstz } from "./_shared";
import { users } from "./identity";

export const challengePurpose = pgEnum("challenge_purpose", ["sign_up", "sign_in"]);

/**
 * One-time activation codes (R01, docs/09). Only an HMAC of the code is stored; attempts are
 * counted atomically and a consumed or expired row can never verify again.
 */
export const authChallenges = pgTable(
  "auth_challenges",
  {
    id: id(),
    purpose: challengePurpose().notNull(),
    contactKind: text().notNull().default("email"),
    contactValue: text().notNull(),
    codeHash: text().notNull(),
    attempts: integer().notNull().default(0),
    maxAttempts: integer().notNull().default(5),
    expiresAt: tstz().notNull(),
    consumedAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    check("auth_challenge_attempts_range", sql`${t.attempts} >= 0 AND ${t.attempts} <= ${t.maxAttempts}`),
    index("auth_challenges_contact_idx").on(t.contactValue, t.createdAt),
  ],
);

/** Server-side sessions; the cookie holds a random token and only its SHA-256 is stored. */
export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text().notNull(),
    userAgent: text(),
    createdAt: createdAt(),
    lastSeenAt: tstz().notNull().defaultNow(),
    expiresAt: tstz().notNull(),
    revokedAt: tstz(),
  },
  (t) => [uniqueIndex("sessions_token_hash_key").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);
