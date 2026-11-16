import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, time, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tstz, version } from "./_shared";
import { deliveryStatus, notificationChannel, occurrenceStatus } from "./enums";
import { users } from "./identity";

/** Recurrence is stored in local time plus IANA timezone so DST and Tehran offsets stay correct (Q12). */
export const schedules = pgTable("schedules", {
  id: id(),
  targetKind: text().notNull(),
  targetId: uuid().notNull(),
  ownerId: uuid()
    .notNull()
    .references(() => users.id),
  title: text().notNull(),
  timezone: text().notNull().default("Asia/Tehran"),
  recurrence: text().notNull(),
  localTime: time().notNull(),
  startsOn: tstz().notNull(),
  endsOn: tstz(),
  version: version(),
  createdAt: createdAt(),
});

export const occurrences = pgTable(
  "occurrences",
  {
    id: id(),
    scheduleId: uuid()
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),
    scheduledAt: tstz().notNull(),
    status: occurrenceStatus().notNull().default("scheduled"),
    assigneeId: uuid().references(() => users.id),
    completedAt: tstz(),
    version: version(),
  },
  (t) => [
    uniqueIndex("occurrences_schedule_time_key").on(t.scheduleId, t.scheduledAt),
    index("occurrences_due_idx").on(t.scheduledAt).where(sql`${t.status} = 'scheduled'`),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    recipientId: uuid()
      .notNull()
      .references(() => users.id),
    eventType: text().notNull(),
    /** event id + recipient: the same event never notifies one person twice (Q13). */
    dedupeKey: text().notNull(),
    payload: jsonb().notNull().default({}),
    readAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("notifications_dedupe_key").on(t.recipientId, t.dedupeKey),
    index("notifications_inbox_idx").on(t.recipientId, t.createdAt.desc(), t.id),
  ],
);

export const notificationDeliveries = pgTable(
  "notification_deliveries",
  {
    id: id(),
    notificationId: uuid()
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    channel: notificationChannel().notNull(),
    status: deliveryStatus().notNull().default("pending"),
    attempts: integer().notNull().default(0),
    lastError: text(),
    nextAttemptAt: tstz(),
    sentAt: tstz(),
  },
  (t) => [
    uniqueIndex("notification_deliveries_channel_key").on(t.notificationId, t.channel),
    check("delivery_attempts_non_negative", sql`${t.attempts} >= 0`),
  ],
);
