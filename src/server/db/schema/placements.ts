import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, jsonb, pgTable, primaryKey, smallint, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, daterange, id, privatePoint, tstz, updatedAt, version } from "./_shared";
import { cats } from "./cats";
import {
  applicationStatus,
  careMode,
  caregiverProfileStatus,
  claimStatus,
  contactScope,
  listingKind,
  listingStatus,
  lostFoundType,
  placementKind,
  placementOutcome,
  placementRequestStatus,
  placementStatus,
  reviewStatus,
  serviceKind,
} from "./enums";
import { users } from "./identity";
import { media } from "./media";

export const adoptionListings = pgTable("adoption_listings", {
  id: id(),
  catId: uuid()
    .notNull()
    .references(() => cats.id),
  kind: listingKind().notNull(),
  status: listingStatus().notNull().default("draft"),
  description: text(),
  createdBy: uuid()
    .notNull()
    .references(() => users.id),
  version: version(),
  createdAt: createdAt(),
});

export const adoptionApplications = pgTable(
  "adoption_applications",
  {
    id: id(),
    listingId: uuid()
      .notNull()
      .references(() => adoptionListings.id),
    applicantId: uuid()
      .notNull()
      .references(() => users.id),
    privateDetails: jsonb().notNull().default({}),
    status: applicationStatus().notNull().default("submitted"),
    decisionReasonPrivate: text(),
    reviewedBy: uuid().references(() => users.id),
    version: version(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("adoption_applications_live_key").on(t.listingId, t.applicantId).where(sql`${t.status} IN ('submitted', 'reviewing')`)],
);

/** D21: reviewed_by/at record a content check only, never identity verification. */
export const caregiverProfiles = pgTable(
  "caregiver_profiles",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    serviceKinds: serviceKind().array().notNull(),
    modes: careMode().array().notNull(),
    publicCellId: text(),
    publicAreaLabel: text(),
    location: privatePoint(),
    capacity: integer().notNull().default(1),
    pricingType: text().notNull().default("free"),
    priceMinor: integer(),
    currency: text(),
    priceUnit: text(),
    homeConditions: jsonb().notNull().default({}),
    bio: text(),
    status: caregiverProfileStatus().notNull().default("draft"),
    reviewedBy: uuid().references(() => users.id),
    reviewedAt: tstz(),
    reviewReason: text(),
    version: version(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("caregiver_profiles_user_key").on(t.userId),
    check("caregiver_capacity_range", sql`${t.capacity} BETWEEN 1 AND 10`),
    check("caregiver_kinds_not_empty", sql`cardinality(${t.serviceKinds}) > 0 AND cardinality(${t.modes}) > 0`),
    check(
      "caregiver_pricing_shape",
      sql`(${t.pricingType} = 'free' AND ${t.priceMinor} IS NULL) OR (${t.pricingType} = 'paid' AND ${t.priceMinor} > 0 AND ${t.currency} ~ '^[A-Z]{3}$' AND ${t.priceUnit} IN ('per_day', 'per_visit'))`,
    ),
  ],
);

export const caregiverAvailability = pgTable(
  "caregiver_availability",
  {
    id: id(),
    profileId: uuid()
      .notNull()
      .references(() => caregiverProfiles.id, { onDelete: "cascade" }),
    fromDate: date(),
    toDate: date(),
    weeklyPattern: jsonb(),
    timezone: text().notNull().default("Asia/Tehran"),
    isClosed: boolean().notNull().default(false),
  },
  (t) => [
    check("caregiver_availability_shape", sql`(${t.fromDate} IS NOT NULL AND ${t.toDate} IS NOT NULL AND ${t.toDate} >= ${t.fromDate}) OR ${t.weeklyPattern} IS NOT NULL`),
  ],
);

export const placementRequests = pgTable(
  "placement_requests",
  {
    id: id(),
    requesterId: uuid()
      .notNull()
      .references(() => users.id),
    caregiverProfileId: uuid()
      .notNull()
      .references(() => caregiverProfiles.id),
    kind: serviceKind().notNull(),
    mode: careMode().notNull(),
    fromDate: date().notNull(),
    toDate: date().notNull(),
    note: text(),
    status: placementRequestStatus().notNull().default("pending"),
    respondBy: tstz(),
    declineReasonPrivate: text(),
    idempotencyKey: text().notNull(),
    version: version(),
    createdAt: createdAt(),
  },
  (t) => [
    check("placement_request_range", sql`${t.toDate} > ${t.fromDate}`),
    uniqueIndex("placement_requests_idempotency_key").on(t.requesterId, t.idempotencyKey),
    index("placement_requests_caregiver_idx").on(t.caregiverProfileId, t.status),
  ],
);

export const placementRequestCats = pgTable(
  "placement_request_cats",
  {
    requestId: uuid()
      .notNull()
      .references(() => placementRequests.id, { onDelete: "cascade" }),
    catId: uuid()
      .notNull()
      .references(() => cats.id),
  },
  (t) => [primaryKey({ columns: [t.requestId, t.catId] })],
);

export const placements = pgTable(
  "placements",
  {
    id: id(),
    kind: placementKind().notNull(),
    mode: careMode(),
    applicationId: uuid().references(() => adoptionApplications.id),
    requestId: uuid().references(() => placementRequests.id),
    caregiverId: uuid()
      .notNull()
      .references(() => users.id),
    requesterId: uuid()
      .notNull()
      .references(() => users.id),
    fromDate: date().notNull(),
    toDate: date(),
    caregiverHandoverAt: tstz(),
    requesterHandoverAt: tstz(),
    status: placementStatus().notNull().default("accepted"),
    endOutcome: placementOutcome(),
    endedAt: tstz(),
    version: version(),
    createdAt: createdAt(),
  },
  (t) => [
    // Exactly one origin: an adoption application or a placement request (docs/06).
    check("placement_single_origin", sql`(${t.applicationId} IS NULL) <> (${t.requestId} IS NULL)`),
    check("placement_range", sql`${t.toDate} IS NULL OR ${t.toDate} > ${t.fromDate}`),
    check("placement_ended_has_outcome", sql`(${t.status} = 'ended') = (${t.endOutcome} IS NOT NULL)`),
    check("placement_in_care_after_handover", sql`${t.status} NOT IN ('in_care', 'ended') OR (${t.caregiverHandoverAt} IS NOT NULL AND ${t.requesterHandoverAt} IS NOT NULL)`),
    check("placement_parties_differ", sql`${t.caregiverId} <> ${t.requesterId}`),
  ],
);

/**
 * One row per cat in a placement. `active` and `period` are kept in sync by the placement service;
 * the exclusion constraint in the custom migration stops a cat being in two active placements at once.
 */
export const placementCats = pgTable(
  "placement_cats",
  {
    placementId: uuid()
      .notNull()
      .references(() => placements.id, { onDelete: "cascade" }),
    catId: uuid()
      .notNull()
      .references(() => cats.id),
    period: daterange().notNull(),
    active: boolean().notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.placementId, t.catId] })],
);

export const placementReports = pgTable(
  "placement_reports",
  {
    id: id(),
    placementId: uuid()
      .notNull()
      .references(() => placements.id),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    reportDate: date().notNull(),
    timezone: text().notNull().default("Asia/Tehran"),
    note: text(),
    checklist: jsonb().notNull().default({}),
    mediaIds: uuid().array().notNull().default(sql`'{}'::uuid[]`),
    amendsReportId: uuid(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("placement_reports_daily_key").on(t.placementId, t.reportDate, t.authorId).where(sql`${t.amendsReportId} IS NULL`)],
);

export const placementReviews = pgTable(
  "placement_reviews",
  {
    id: id(),
    placementId: uuid()
      .notNull()
      .references(() => placements.id),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    subjectUserId: uuid()
      .notNull()
      .references(() => users.id),
    rating: smallint().notNull(),
    body: text(),
    status: reviewStatus().notNull().default("pending"),
    publishedAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("placement_reviews_author_key").on(t.placementId, t.authorId),
    check("placement_review_rating_range", sql`${t.rating} BETWEEN 1 AND 5`),
    check("placement_review_not_self", sql`${t.authorId} <> ${t.subjectUserId}`),
    index("placement_reviews_subject_idx").on(t.subjectUserId).where(sql`${t.status} = 'published'`),
  ],
);

/** Address/phone/location become readable only through an active grant; every read is audited. */
export const contactGrants = pgTable(
  "contact_grants",
  {
    id: id(),
    granteeId: uuid()
      .notNull()
      .references(() => users.id),
    subjectUserId: uuid()
      .notNull()
      .references(() => users.id),
    resourceKind: text().notNull(),
    resourceId: uuid().notNull(),
    scope: contactScope().notNull(),
    validFrom: tstz().notNull(),
    validTo: tstz(),
    revokedAt: tstz(),
    createdAt: createdAt(),
  },
  (t) => [
    check("contact_grant_range", sql`${t.validTo} IS NULL OR ${t.validTo} > ${t.validFrom}`),
    index("contact_grants_lookup_idx").on(t.granteeId, t.resourceKind, t.resourceId),
  ],
);

export const lostFoundReports = pgTable("lost_found_reports", {
  id: id(),
  type: lostFoundType().notNull(),
  catId: uuid().references(() => cats.id),
  reporterId: uuid()
    .notNull()
    .references(() => users.id),
  description: text().notNull(),
  lastSeenAt: tstz(),
  publicCellId: text(),
  mediaIds: uuid().array().notNull().default(sql`'{}'::uuid[]`),
  status: text().notNull().default("open"),
  createdAt: createdAt(),
});

export const ownershipClaims = pgTable(
  "ownership_claims",
  {
    id: id(),
    catId: uuid()
      .notNull()
      .references(() => cats.id),
    claimantId: uuid()
      .notNull()
      .references(() => users.id),
    proofMediaId: uuid().references(() => media.id),
    privateNote: text(),
    status: claimStatus().notNull().default("open"),
    reviewedBy: uuid().references(() => users.id),
    version: version(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("ownership_claims_live_key").on(t.catId, t.claimantId).where(sql`${t.status} IN ('open', 'reviewing')`),
    index("ownership_claims_open_idx").on(t.catId).where(sql`${t.status} IN ('open', 'reviewing')`),
  ],
);
