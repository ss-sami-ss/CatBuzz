import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, primaryKey, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tstz, version } from "./_shared";
import { cats, colonies } from "./cats";
import { assignmentStatus, capability, helpRequestStatus, missionStatus, missionType, urgency } from "./enums";
import { media } from "./media";
import { users } from "./identity";

export const helpRequests = pgTable(
  "help_requests",
  {
    id: id(),
    catId: uuid().references(() => cats.id),
    colonyId: uuid().references(() => colonies.id),
    reporterId: uuid()
      .notNull()
      .references(() => users.id),
    needType: text().notNull(),
    urgency: urgency().notNull().default("normal"),
    status: helpRequestStatus().notNull().default("open"),
    description: text(),
    triageOwnerId: uuid().references(() => users.id),
    deadlineAt: tstz(),
    resolvedAt: tstz(),
    resolutionNote: text(),
    version: version(),
    createdAt: createdAt(),
  },
  (t) => [
    check("help_request_has_target", sql`${t.catId} IS NOT NULL OR ${t.colonyId} IS NOT NULL`),
    // R09: a request is never resolved without a recorded answer.
    check("help_request_resolved_has_note", sql`${t.status} <> 'resolved' OR (${t.resolvedAt} IS NOT NULL AND ${t.resolutionNote} IS NOT NULL)`),
    index("help_requests_open_idx").on(t.urgency, t.createdAt).where(sql`${t.status} IN ('open', 'triaged', 'in_progress')`),
  ],
);

export const helpEvidence = pgTable("help_evidence", {
  reportId: uuid().notNull().references(() => helpRequests.id),
  mediaId: uuid().notNull().references(() => media.id),
}, (t) => [primaryKey({ columns: [t.reportId, t.mediaId] })]);

export const missions = pgTable(
  "missions",
  {
    id: id(),
    helpRequestId: uuid().references(() => helpRequests.id),
    type: missionType().notNull(),
    status: missionStatus().notNull().default("open"),
    capacity: integer().notNull().default(1),
    acceptedCount: integer().notNull().default(0),
    requiredCapability: capability(),
    areaCellId: text(),
    dueAt: tstz(),
    createdBy: uuid()
      .notNull()
      .references(() => users.id),
    version: version(),
    createdAt: createdAt(),
  },
  (t) => [
    check("mission_capacity_positive", sql`${t.capacity} > 0`),
    // Capacity is enforced in the database too: a race can never push accepted_count past capacity (Q06).
    check("mission_accepted_within_capacity", sql`${t.acceptedCount} >= 0 AND ${t.acceptedCount} <= ${t.capacity}`),
  ],
);

export const assignments = pgTable(
  "assignments",
  {
    id: id(),
    missionId: uuid()
      .notNull()
      .references(() => missions.id),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    role: text().notNull().default("volunteer"),
    status: assignmentStatus().notNull().default("accepted"),
    acceptedAt: createdAt(),
    endedAt: tstz(),
  },
  (t) => [uniqueIndex("assignments_active_key").on(t.missionId, t.userId).where(sql`${t.status} = 'accepted'`)],
);

/** Append-only history; rows are never updated (enforced by trigger in the custom migration). */
export const missionUpdates = pgTable(
  "mission_updates",
  {
    id: id(),
    missionId: uuid()
      .notNull()
      .references(() => missions.id),
    actorId: uuid()
      .notNull()
      .references(() => users.id),
    event: text().notNull(),
    note: text(),
    evidenceMediaIds: uuid().array().notNull().default(sql`'{}'::uuid[]`),
    occurredAt: createdAt(),
  },
  (t) => [index("mission_updates_mission_idx").on(t.missionId, t.occurredAt)],
);
