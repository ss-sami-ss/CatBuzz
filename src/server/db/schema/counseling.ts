import { sql } from "drizzle-orm";
import { check, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tstz, version } from "./_shared";
import { counselingStatus } from "./enums";
import { users } from "./identity";

/** Never shown publicly; contact happens only under a valid, unrevoked consent (R18, Q14). */
export const counselingRequests = pgTable("counseling_requests", {
  id: id(),
  requesterId: uuid()
    .notNull()
    .references(() => users.id),
  subjectUserId: uuid().references(() => users.id),
  topic: text().notNull(),
  descriptionPrivate: text(),
  status: counselingStatus().notNull().default("submitted"),
  version: version(),
  createdAt: createdAt(),
});

export const counselingConsents = pgTable(
  "counseling_consents",
  {
    id: id(),
    requestId: uuid()
      .notNull()
      .references(() => counselingRequests.id),
    subjectUserId: uuid()
      .notNull()
      .references(() => users.id),
    purpose: text().notNull(),
    policyVersion: text().notNull(),
    grantedAt: tstz().notNull(),
    revokedAt: tstz(),
    evidence: text(),
  },
  (t) => [check("consent_revoked_after_grant", sql`${t.revokedAt} IS NULL OR ${t.revokedAt} >= ${t.grantedAt}`)],
);

export const counselingAssignments = pgTable("counseling_assignments", {
  id: id(),
  requestId: uuid()
    .notNull()
    .references(() => counselingRequests.id),
  counselorId: uuid()
    .notNull()
    .references(() => users.id),
  consentId: uuid()
    .notNull()
    .references(() => counselingConsents.id),
  assignedAt: createdAt(),
  endedAt: tstz(),
});

export const contactAttempts = pgTable("contact_attempts", {
  id: id(),
  assignmentId: uuid()
    .notNull()
    .references(() => counselingAssignments.id),
  attemptedAt: tstz().notNull(),
  outcome: text().notNull(),
});
