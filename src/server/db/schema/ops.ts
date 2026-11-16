import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tstz } from "./_shared";
import { moderationReportStatus, moderationTarget, outboxStatus } from "./enums";
import { users } from "./identity";

export const moderationReports = pgTable(
  "moderation_reports",
  {
    id: id(),
    reporterId: uuid()
      .notNull()
      .references(() => users.id),
    targetKind: moderationTarget().notNull(),
    targetId: uuid().notNull(),
    category: text().notNull(),
    description: text(),
    status: moderationReportStatus().notNull().default("open"),
    moderatorId: uuid().references(() => users.id),
    decisionReason: text(),
    decidedAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [index("moderation_reports_queue_idx").on(t.status, t.createdAt).where(sql`${t.status} IN ('open', 'reviewing')`)],
);

/** Append-only; changes are redacted before insert (no contact or private text). */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: uuid().references(() => users.id),
    action: text().notNull(),
    resourceKind: text().notNull(),
    resourceId: uuid(),
    requestId: text(),
    changes: jsonb().notNull().default({}),
    occurredAt: createdAt(),
  },
  (t) => [index("audit_logs_resource_idx").on(t.resourceKind, t.resourceId, t.occurredAt)],
);

/** Written in the same transaction as the domain change; a worker publishes it (docs/05). */
export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: id(),
    type: text().notNull(),
    eventVersion: integer().notNull().default(1),
    aggregateId: uuid().notNull(),
    payload: jsonb().notNull().default({}),
    status: outboxStatus().notNull().default("pending"),
    attempts: integer().notNull().default(0),
    occurredAt: createdAt(),
    publishedAt: tstz(),
  },
  (t) => [index("outbox_events_pending_idx").on(t.occurredAt).where(sql`${t.status} = 'pending'`)],
);

/** Idempotency-Key scoped to actor + endpoint; a different body for the same key is a 409 (docs/07). */
export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: id(),
    actorId: uuid()
      .notNull()
      .references(() => users.id),
    endpoint: text().notNull(),
    key: text().notNull(),
    requestHash: text().notNull(),
    responseStatus: integer(),
    responseBody: jsonb(),
    createdAt: createdAt(),
    expiresAt: tstz().notNull(),
  },
  (t) => [uniqueIndex("idempotency_keys_scope_key").on(t.actorId, t.endpoint, t.key)],
);
