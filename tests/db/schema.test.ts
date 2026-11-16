import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb } from "@/server/db/client";
import { runMigrations } from "@/server/db/migrate";
import { resetTestDb, TEST_URL } from "./test-env";
import * as s from "@/server/db/schema";
import { seed } from "@/server/db/seed";

const { sql: client, db } = createDb(TEST_URL, { max: 4 });

/** Postgres error with its constraint name, whatever wrapper the driver/ORM adds. */
async function violation(promise: Promise<unknown>): Promise<{ code?: string; constraint?: string; message: string }> {
  try {
    await promise;
  } catch (error) {
    const e = (error as { cause?: unknown }).cause ?? error;
    const pg = e as { code?: string; constraint_name?: string; message: string };
    return { code: pg.code, constraint: pg.constraint_name, message: pg.message };
  }
  throw new Error("expected the database to reject this write");
}

async function newUser(name: string) {
  const [row] = await db.insert(s.users).values({ username: name, normalizedUsername: name.toLowerCase(), status: "active" }).returning({ id: s.users.id });
  return row!.id;
}

beforeAll(async () => {
  // Empty database, then migrations from scratch (docs/06 "هر migration روی DB خالی").
  await resetTestDb();
});

afterAll(async () => {
  await client.end();
});

describe("migrations", () => {
  it("apply to an empty database and are idempotent", async () => {
    await expect(runMigrations(TEST_URL)).resolves.toBeUndefined();
    const [{ count }] = (await client`SELECT count(*)::int AS count FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'spatial_ref_sys'`) as unknown as [{ count: number }];
    expect(count).toBeGreaterThanOrEqual(55);
    const [{ v }] = (await client`SELECT postgis_lib_version() AS v`) as unknown as [{ v: string }];
    expect(v).toMatch(/^3\./);
  });
});

describe("sample seed", () => {
  it("loads labeled fictional data with the documented counts", async () => {
    const result = await seed(db);
    expect(result).toMatchObject({ users: 10, cats: 31, colonies: 5, groups: 4, clinics: 3 });
    const names = await db.select({ name: s.cats.currentName }).from(s.cats);
    expect(names.filter((n) => n.name).every((n) => n.name!.includes("نمونه"))).toBe(true);
    const [owned] = await db.select().from(s.cats).where(eq(s.cats.id, result.ownedCatId));
    expect(owned).toMatchObject({ custody: "owned", publicCellId: null });
  });
});

describe("critical constraints", () => {
  it("keeps normalized usernames unique", async () => {
    await newUser("dup_user");
    const err = await violation(db.insert(s.users).values({ username: "DUP_user", normalizedUsername: "dup_user" }));
    expect(err.constraint).toBe("users_normalized_username_key");
  });

  it("requires an owner exactly for owned cats", async () => {
    const creator = await newUser("cat_creator");
    const err = await violation(db.insert(s.cats).values({ custody: "owned", createdBy: creator }));
    expect(err.constraint).toBe("cats_owned_has_owner");
  });

  it("refuses a cat related to itself", async () => {
    const creator = await newUser("rel_creator");
    const [cat] = await db.insert(s.cats).values({ createdBy: creator }).returning({ id: s.cats.id });
    const err = await violation(db.insert(s.catRelationships).values({ fromCatId: cat!.id, toCatId: cat!.id, type: "mother_of", createdBy: creator }));
    expect(err.constraint).toBe("cat_relationship_not_self");
  });

  it("lets only one of two concurrent acceptances take the last mission slot (Q06)", async () => {
    const creator = await newUser("mission_creator");
    const [mission] = await db.insert(s.missions).values({ type: "transport", capacity: 2, acceptedCount: 1, createdBy: creator }).returning({ id: s.missions.id });
    const accept = () =>
      client`UPDATE missions SET accepted_count = accepted_count + 1 WHERE id = ${mission!.id} AND accepted_count < capacity RETURNING id`;
    const results = await Promise.all([accept(), accept(), accept()]);
    expect(results.filter((rows) => rows.length === 1)).toHaveLength(1);
    const err = await violation(client`UPDATE missions SET accepted_count = capacity + 1 WHERE id = ${mission!.id}`);
    expect(err.constraint).toBe("mission_accepted_within_capacity");
  });

  it("allows one active assignment per volunteer and mission", async () => {
    const creator = await newUser("assign_creator");
    const volunteer = await newUser("assign_volunteer");
    const [mission] = await db.insert(s.missions).values({ type: "feeding", capacity: 3, createdBy: creator }).returning({ id: s.missions.id });
    await db.insert(s.assignments).values({ missionId: mission!.id, userId: volunteer });
    const err = await violation(db.insert(s.assignments).values({ missionId: mission!.id, userId: volunteer }));
    expect(err.constraint).toBe("assignments_active_key");
    // A withdrawn assignment is history and does not block a new one.
    await db.update(s.assignments).set({ status: "withdrawn" }).where(eq(s.assignments.missionId, mission!.id));
    await expect(db.insert(s.assignments).values({ missionId: mission!.id, userId: volunteer })).resolves.toBeDefined();
  });

  it("never places one cat in two overlapping active placements (Q33)", async () => {
    const caregiver = await newUser("pl_caregiver");
    const requester = await newUser("pl_requester");
    const [cat] = await db.insert(s.cats).values({ createdBy: requester }).returning({ id: s.cats.id });
    const [profile] = await db.insert(s.caregiverProfiles).values({ userId: caregiver, serviceKinds: ["foster"], modes: ["host_home"] }).returning({ id: s.caregiverProfiles.id });
    const placement = async (from: string, to: string, key: string) => {
      const [request] = await db
        .insert(s.placementRequests)
        .values({ requesterId: requester, caregiverProfileId: profile!.id, kind: "foster", mode: "host_home", fromDate: from, toDate: to, idempotencyKey: key })
        .returning({ id: s.placementRequests.id });
      const [row] = await db.insert(s.placements).values({ kind: "foster", requestId: request!.id, caregiverId: caregiver, requesterId: requester, fromDate: from, toDate: to }).returning({ id: s.placements.id });
      return row!.id;
    };
    const first = await placement("2026-12-01", "2026-12-10", "k1");
    await db.insert(s.placementCats).values({ placementId: first, catId: cat!.id, period: "[2026-12-01,2026-12-10)" });

    const overlapping = await placement("2026-12-05", "2026-12-15", "k2");
    const err = await violation(db.insert(s.placementCats).values({ placementId: overlapping, catId: cat!.id, period: "[2026-12-05,2026-12-15)" }));
    expect(err.constraint).toBe("placement_cats_no_overlap");

    const after = await placement("2026-12-10", "2026-12-20", "k3");
    await expect(db.insert(s.placementCats).values({ placementId: after, catId: cat!.id, period: "[2026-12-10,2026-12-20)" })).resolves.toBeDefined();
    await expect(db.insert(s.placementCats).values({ placementId: overlapping, catId: cat!.id, period: "[2026-12-05,2026-12-15)", active: false })).resolves.toBeDefined();
  });

  it("requires exactly one placement origin and both handovers before in_care", async () => {
    const caregiver = await newUser("origin_caregiver");
    const requester = await newUser("origin_requester");
    let err = await violation(db.insert(s.placements).values({ kind: "foster", caregiverId: caregiver, requesterId: requester, fromDate: "2026-12-01" }));
    expect(err.constraint).toBe("placement_single_origin");
    const creator = requester;
    const [cat] = await db.insert(s.cats).values({ createdBy: creator }).returning({ id: s.cats.id });
    const [listing] = await db.insert(s.adoptionListings).values({ catId: cat!.id, kind: "foster", createdBy: creator }).returning({ id: s.adoptionListings.id });
    const [application] = await db.insert(s.adoptionApplications).values({ listingId: listing!.id, applicantId: caregiver }).returning({ id: s.adoptionApplications.id });
    err = await violation(
      db.insert(s.placements).values({ kind: "foster", applicationId: application!.id, caregiverId: caregiver, requesterId: requester, fromDate: "2026-12-01", status: "in_care" }),
    );
    expect(err.constraint).toBe("placement_in_care_after_handover");
  });

  it("keeps reviews to 1..5 stars, one per author and placement", async () => {
    const [row] = await db.select({ id: s.placements.id, caregiverId: s.placements.caregiverId, requesterId: s.placements.requesterId }).from(s.placements).limit(1);
    let err = await violation(db.insert(s.placementReviews).values({ placementId: row!.id, authorId: row!.requesterId, subjectUserId: row!.caregiverId, rating: 6 }));
    expect(err.constraint).toBe("placement_review_rating_range");
    await db.insert(s.placementReviews).values({ placementId: row!.id, authorId: row!.requesterId, subjectUserId: row!.caregiverId, rating: 5 });
    err = await violation(db.insert(s.placementReviews).values({ placementId: row!.id, authorId: row!.requesterId, subjectUserId: row!.caregiverId, rating: 4 }));
    expect(err.constraint).toBe("placement_reviews_author_key");
  });

  it("makes mission history and audit logs append-only", async () => {
    const actor = await newUser("history_actor");
    const [mission] = await db.insert(s.missions).values({ type: "other", createdBy: actor }).returning({ id: s.missions.id });
    await db.insert(s.missionUpdates).values({ missionId: mission!.id, actorId: actor, event: "created" });
    const err = await violation(db.update(s.missionUpdates).set({ event: "tampered" }).where(eq(s.missionUpdates.missionId, mission!.id)));
    expect(err.message).toContain("append-only");
    await db.insert(s.auditLogs).values({ actorId: actor, action: "mission.created", resourceKind: "mission", resourceId: mission!.id });
    expect((await violation(db.delete(s.auditLogs).where(eq(s.auditLogs.resourceId, mission!.id)))).message).toContain("append-only");
  });

  it("dedupes occurrences, notifications and chat messages", async () => {
    const owner = await newUser("dedupe_owner");
    const [schedule] = await db
      .insert(s.schedules)
      .values({ targetKind: "colony", targetId: owner, ownerId: owner, title: "غذای نمونه", recurrence: "FREQ=DAILY", localTime: "08:00", startsOn: new Date() })
      .returning({ id: s.schedules.id });
    const at = new Date("2026-12-01T04:30:00Z");
    await db.insert(s.occurrences).values({ scheduleId: schedule!.id, scheduledAt: at });
    expect((await violation(db.insert(s.occurrences).values({ scheduleId: schedule!.id, scheduledAt: at }))).constraint).toBe("occurrences_schedule_time_key");

    await db.insert(s.notifications).values({ recipientId: owner, eventType: "x", dedupeKey: "event-1" });
    expect((await violation(db.insert(s.notifications).values({ recipientId: owner, eventType: "x", dedupeKey: "event-1" }))).constraint).toBe("notifications_dedupe_key");

    const [conversation] = await db.insert(s.conversations).values({ kind: "private" }).returning({ id: s.conversations.id });
    await db.insert(s.messages).values({ conversationId: conversation!.id, authorId: owner, clientMessageId: "c-1", body: "سلام" });
    expect((await violation(db.insert(s.messages).values({ conversationId: conversation!.id, authorId: owner, clientMessageId: "c-1", body: "سلام" }))).constraint).toBe("messages_client_id_key");
  });

  it("keeps money positive and expense reviewers independent", async () => {
    const payer = await newUser("money_payer");
    let err = await violation(db.insert(s.fundraisers).values({ targetKind: "cat", targetId: payer, ownerId: payer, recipientDescription: "نمونه", title: "نمونه", goalMinor: 0, excessPolicy: "carry_over" }));
    expect(err.constraint).toBe("fundraiser_goal_positive");
    err = await violation(db.insert(s.expenses).values({ targetKind: "cat", targetId: payer, payerId: payer, amountMinor: 1000, category: "food", incurredAt: new Date(), reviewedBy: payer }));
    expect(err.constraint).toBe("expense_independent_reviewer");
  });
});
