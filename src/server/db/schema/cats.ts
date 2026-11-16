import { sql } from "drizzle-orm";
import { check, index, pgTable, primaryKey, text, uniqueIndex, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createdAt, id, privatePoint, tstz, updatedAt, version } from "./_shared";
import { catAge, catCustody, catLifecycle, catNeed, catSex, locationPrecision, relationshipType, verificationStatus } from "./enums";
import { users } from "./identity";
import { media } from "./media";

/** Owned cats never appear on the public map or lists (docs/06); street cats show only their public cell. */
export const cats = pgTable(
  "cats",
  {
    id: id(),
    currentName: text(),
    sex: catSex().notNull().default("unknown"),
    ageEstimate: catAge().notNull().default("unknown"),
    markings: text(),
    lifecycle: catLifecycle().notNull().default("active"),
    custody: catCustody().notNull().default("street"),
    ownerUserId: uuid().references(() => users.id),
    canonicalCatId: uuid().references((): AnyPgColumn => cats.id),
    needs: catNeed().array().notNull().default(sql`'{}'::cat_need[]`),
    publicCellId: text(),
    publicAreaLabel: text(),
    lastSeenAt: tstz(),
    createdBy: uuid()
      .notNull()
      .references(() => users.id),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("cats_owned_has_owner", sql`(${t.custody} = 'owned') = (${t.ownerUserId} IS NOT NULL)`),
    check("cats_merged_has_canonical", sql`(${t.lifecycle} = 'merged') = (${t.canonicalCatId} IS NOT NULL)`),
    check("cats_not_own_canonical", sql`${t.canonicalCatId} IS NULL OR ${t.canonicalCatId} <> ${t.id}`),
    index("cats_public_cell_idx").on(t.publicCellId).where(sql`${t.custody} = 'street' AND ${t.lifecycle} = 'active'`),
    index("cats_last_seen_idx").on(t.lastSeenAt.desc(), t.id),
  ],
);

export const catNames = pgTable("cat_names", {
  id: id(),
  catId: uuid()
    .notNull()
    .references(() => cats.id, { onDelete: "cascade" }),
  name: text().notNull(),
  chosenBy: uuid().references(() => users.id),
  validFrom: createdAt(),
  validTo: tstz(),
});

export const catMedia = pgTable(
  "cat_media",
  {
    catId: uuid()
      .notNull()
      .references(() => cats.id, { onDelete: "cascade" }),
    mediaId: uuid()
      .notNull()
      .references(() => media.id),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.catId, t.mediaId] })],
);

export const namePolls = pgTable("name_polls", {
  id: id(),
  catId: uuid()
    .notNull()
    .references(() => cats.id, { onDelete: "cascade" }),
  createdBy: uuid()
    .notNull()
    .references(() => users.id),
  closeAt: tstz().notNull(),
  chosenOptionId: uuid(),
  createdAt: createdAt(),
});

export const namePollOptions = pgTable(
  "name_poll_options",
  {
    id: id(),
    pollId: uuid()
      .notNull()
      .references(() => namePolls.id, { onDelete: "cascade" }),
    name: text().notNull(),
  },
  (t) => [uniqueIndex("name_poll_options_poll_name_key").on(t.pollId, t.name)],
);

export const namePollVotes = pgTable(
  "name_poll_votes",
  {
    id: id(),
    pollId: uuid()
      .notNull()
      .references(() => namePolls.id, { onDelete: "cascade" }),
    optionId: uuid()
      .notNull()
      .references(() => namePollOptions.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    votedAt: createdAt(),
  },
  (t) => [uniqueIndex("name_poll_votes_poll_user_key").on(t.pollId, t.userId)],
);

export const colonies = pgTable("colonies", {
  id: id(),
  name: text().notNull(),
  publicCellId: text(),
  publicAreaLabel: text(),
  location: privatePoint(),
  createdBy: uuid()
    .notNull()
    .references(() => users.id),
  version: version(),
  createdAt: createdAt(),
});

export const colonyCaretakers = pgTable(
  "colony_caretakers",
  {
    colonyId: uuid()
      .notNull()
      .references(() => colonies.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    since: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.colonyId, t.userId] })],
);

export const colonyMemberships = pgTable(
  "colony_memberships",
  {
    id: id(),
    colonyId: uuid()
      .notNull()
      .references(() => colonies.id, { onDelete: "cascade" }),
    catId: uuid()
      .notNull()
      .references(() => cats.id),
    validFrom: tstz().notNull(),
    validTo: tstz(),
    status: verificationStatus().notNull().default("pending"),
    createdBy: uuid()
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    check("colony_membership_range", sql`${t.validTo} IS NULL OR ${t.validTo} > ${t.validFrom}`),
    uniqueIndex("colony_memberships_open_key").on(t.colonyId, t.catId).where(sql`${t.validTo} IS NULL`),
  ],
);

export const sightings = pgTable(
  "sightings",
  {
    id: id(),
    catId: uuid().references(() => cats.id),
    observerId: uuid()
      .notNull()
      .references(() => users.id),
    observedAt: tstz().notNull(),
    precision: locationPrecision().notNull(),
    location: privatePoint().notNull(),
    publicCellId: text().notNull(),
    note: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index("sightings_location_gist").using("gist", t.location),
    index("sightings_cat_observed_idx").on(t.catId, t.observedAt.desc()),
  ],
);

export const catRelationships = pgTable(
  "cat_relationships",
  {
    id: id(),
    fromCatId: uuid()
      .notNull()
      .references(() => cats.id),
    toCatId: uuid()
      .notNull()
      .references(() => cats.id),
    type: relationshipType().notNull(),
    status: verificationStatus().notNull().default("pending"),
    createdBy: uuid()
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    check("cat_relationship_not_self", sql`${t.fromCatId} <> ${t.toCatId}`),
    uniqueIndex("cat_relationships_pair_key").on(t.fromCatId, t.toCatId, t.type),
  ],
);
