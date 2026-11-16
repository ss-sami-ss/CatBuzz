import { sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createdAt, id, privatePoint, tstz, version } from "./_shared";
import { cats, colonies } from "./cats";
import { careCategory, recordSource, recordVisibility, verificationStatus } from "./enums";
import { users } from "./identity";

export const careLogs = pgTable(
  "care_logs",
  {
    id: id(),
    catId: uuid().references(() => cats.id),
    colonyId: uuid().references(() => colonies.id),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    occurredAt: tstz().notNull(),
    category: careCategory().notNull(),
    note: text(),
    visibility: recordVisibility().notNull().default("private"),
    createdAt: createdAt(),
  },
  (t) => [
    check("care_log_has_target", sql`${t.catId} IS NOT NULL OR ${t.colonyId} IS NOT NULL`),
    index("care_logs_cat_idx").on(t.catId, t.occurredAt.desc()),
  ],
);

/** Report origin and vet confirmation are separate (T15); corrections are new rows pointing at the original. */
export const healthRecords = pgTable(
  "health_records",
  {
    id: id(),
    catId: uuid()
      .notNull()
      .references(() => cats.id),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    source: recordSource().notNull(),
    category: careCategory().notNull(),
    occurredAt: tstz().notNull(),
    details: jsonb().notNull().default({}),
    publicSummary: text(),
    visibility: recordVisibility().notNull().default("private"),
    vetConfirmedBy: uuid().references(() => users.id),
    vetConfirmedAt: tstz(),
    amendsRecordId: uuid().references((): AnyPgColumn => healthRecords.id),
    createdAt: createdAt(),
  },
  (t) => [
    check("health_record_confirmation_pair", sql`(${t.vetConfirmedBy} IS NULL) = (${t.vetConfirmedAt} IS NULL)`),
    check("health_record_not_self_amend", sql`${t.amendsRecordId} IS NULL OR ${t.amendsRecordId} <> ${t.id}`),
    index("health_records_cat_idx").on(t.catId, t.occurredAt.desc()),
  ],
);

export const clinics = pgTable(
  "clinics",
  {
    id: id(),
    name: text().notNull(),
    publicAddress: text().notNull(),
    location: privatePoint().notNull(),
    timezone: text().notNull().default("Asia/Tehran"),
    openingHours: jsonb().notNull().default([]),
    services: text().array().notNull().default(sql`'{}'::text[]`),
    publicPhone: text(),
    contactConsent: text(),
    verifiedStatus: verificationStatus().notNull().default("unverified"),
    version: version(),
    createdAt: createdAt(),
  },
  (t) => [index("clinics_location_gist").using("gist", t.location)],
);

export const clinicStaff = pgTable("clinic_staff", {
  id: id(),
  clinicId: uuid()
    .notNull()
    .references(() => clinics.id, { onDelete: "cascade" }),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  role: text().notNull(),
  createdAt: createdAt(),
});
