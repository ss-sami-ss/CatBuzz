import { sql } from "drizzle-orm";
import { bigint, check, index, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tstz, version } from "./_shared";
import { expenseReviewStatus, fundraiserStatus, moneyTargetKind } from "./enums";
import { users } from "./identity";
import { media } from "./media";

/** P1 fundraisers run without an in-app gateway (D05 open); payments tables arrive in T35. */
export const fundraisers = pgTable(
  "fundraisers",
  {
    id: id(),
    targetKind: moneyTargetKind().notNull(),
    targetId: uuid().notNull(),
    ownerId: uuid()
      .notNull()
      .references(() => users.id),
    recipientDescription: text().notNull(),
    title: text().notNull(),
    description: text(),
    currency: text().notNull().default("IRR"),
    goalMinor: bigint({ mode: "number" }).notNull(),
    excessPolicy: text().notNull(),
    status: fundraiserStatus().notNull().default("draft"),
    version: version(),
    createdAt: createdAt(),
  },
  (t) => [
    check("fundraiser_goal_positive", sql`${t.goalMinor} > 0`),
    check("fundraiser_currency_iso", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    index("fundraisers_target_idx").on(t.targetKind, t.targetId),
  ],
);

/** The original invoice stays private; only the redacted copy may be public (R11). */
export const expenses = pgTable(
  "expenses",
  {
    id: id(),
    targetKind: moneyTargetKind().notNull(),
    targetId: uuid().notNull(),
    fundraiserId: uuid().references(() => fundraisers.id),
    payerId: uuid()
      .notNull()
      .references(() => users.id),
    amountMinor: bigint({ mode: "number" }).notNull(),
    currency: text().notNull().default("IRR"),
    category: text().notNull(),
    incurredAt: tstz().notNull(),
    originalInvoiceMediaId: uuid().references(() => media.id),
    redactedInvoiceMediaId: uuid().references(() => media.id),
    reviewStatus: expenseReviewStatus().notNull().default("pending"),
    reviewedBy: uuid().references(() => users.id),
    reviewedAt: tstz(),
    reviewReason: text(),
    createdAt: createdAt(),
  },
  (t) => [
    check("expense_amount_positive", sql`${t.amountMinor} > 0`),
    check("expense_currency_iso", sql`${t.currency} ~ '^[A-Z]{3}$'`),
    // Reviewer must be independent of the payer.
    check("expense_independent_reviewer", sql`${t.reviewedBy} IS NULL OR ${t.reviewedBy} <> ${t.payerId}`),
    index("expenses_target_idx").on(t.targetKind, t.targetId),
  ],
);

export const inKindPledges = pgTable(
  "in_kind_pledges",
  {
    id: id(),
    targetKind: moneyTargetKind().notNull(),
    targetId: uuid().notNull(),
    donorId: uuid()
      .notNull()
      .references(() => users.id),
    item: text().notNull(),
    quantity: numeric({ precision: 12, scale: 3 }).notNull(),
    unit: text().notNull(),
    status: text().notNull().default("pledged"),
    createdAt: createdAt(),
  },
  (t) => [check("in_kind_quantity_positive", sql`${t.quantity} > 0`)],
);

export const inKindDeliveries = pgTable(
  "in_kind_deliveries",
  {
    id: id(),
    pledgeId: uuid()
      .notNull()
      .references(() => inKindPledges.id),
    receiverId: uuid()
      .notNull()
      .references(() => users.id),
    quantity: numeric({ precision: 12, scale: 3 }).notNull(),
    receivedAt: tstz().notNull(),
    evidenceMediaId: uuid().references(() => media.id),
  },
  (t) => [check("in_kind_delivery_quantity_positive", sql`${t.quantity} > 0`)],
);
