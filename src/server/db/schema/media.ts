import { sql } from "drizzle-orm";
import { bigint, check, index, pgTable, text, uniqueIndex, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createdAt, id } from "./_shared";
import { mediaStatus, mediaVisibility } from "./enums";
import { users } from "./identity";

/** Uploaded object metadata (docs/05 upload flow). The storage key is never an access grant. */
export const media = pgTable(
  "media",
  {
    id: id(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id),
    storageKey: text().notNull(),
    mime: text().notNull(),
    sizeBytes: bigint({ mode: "number" }).notNull(),
    checksumSha256: text(),
    status: mediaStatus().notNull().default("quarantine"),
    visibility: mediaVisibility().notNull().default("private"),
    derivedFrom: uuid().references((): AnyPgColumn => media.id),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("media_storage_key_key").on(t.storageKey),
    index("media_owner_idx").on(t.ownerId),
    check("media_size_positive", sql`${t.sizeBytes} > 0`),
  ],
);
