import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, privatePoint, tstz, updatedAt, version } from "./_shared";
import { capability, credentialStatus, groupScope, groupVisibility, memberRole, membershipStatus, profession, userStatus } from "./enums";

/** Public identity only; real name and contact live in user_private (R01). */
export const users = pgTable(
  "users",
  {
    id: id(),
    username: text(),
    normalizedUsername: text(),
    status: userStatus().notNull().default("pending_activation"),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_normalized_username_key").on(t.normalizedUsername),
    check("users_username_normalized", sql`${t.normalizedUsername} IS NULL OR ${t.normalizedUsername} = lower(${t.username})`),
  ],
);

export const userPrivate = pgTable("user_private", {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: text(),
  lastName: text(),
  verifiedEmail: text(),
  verifiedPhone: text(),
  consentVersion: text(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("user_private_verified_email_key").on(sql`lower(${t.verifiedEmail})`)]);

export const professionalCredentials = pgTable(
  "professional_credentials",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    profession: profession().notNull(),
    evidenceMediaId: uuid(),
    status: credentialStatus().notNull().default("pending"),
    verifiedBy: uuid().references(() => users.id),
    verifiedAt: tstz(),
    expiresAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    index("professional_credentials_user_idx").on(t.userId),
    check("credential_verified_has_verifier", sql`${t.status} <> 'verified' OR (${t.verifiedBy} IS NOT NULL AND ${t.verifiedAt} IS NOT NULL)`),
  ],
);

export const volunteerCapabilities = pgTable(
  "volunteer_capabilities",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    capability: capability().notNull(),
    availability: text(),
    areaCellId: text(),
    areaCenter: privatePoint(),
    capacity: integer().notNull().default(1),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("volunteer_capabilities_user_capability_key").on(t.userId, t.capability),
    check("volunteer_capacity_positive", sql`${t.capacity} > 0`),
  ],
);

export const groups = pgTable("groups", {
  id: id(),
  name: text().notNull(),
  description: text(),
  scope: groupScope().notNull(),
  visibility: groupVisibility().notNull().default("open"),
  areaCellId: text(),
  createdBy: uuid()
    .notNull()
    .references(() => users.id),
  version: version(),
  createdAt: createdAt(),
});

export const groupMemberships = pgTable(
  "group_memberships",
  {
    id: id(),
    groupId: uuid()
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    role: memberRole().notNull().default("member"),
    status: membershipStatus().notNull().default("requested"),
    joinedAt: tstz(),
    leftAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    // One live membership per user and group; history rows (left/removed/rejected) may repeat.
    uniqueIndex("group_memberships_live_key").on(t.groupId, t.userId).where(sql`${t.status} IN ('requested', 'active')`),
  ],
);
