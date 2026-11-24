import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import sharp from "sharp";
import { createUploadHandlers } from "@/server/media/upload-handlers";
import { getMediaStorage } from "@/server/media/storage";
import { createDuplicateHandlers } from "@/server/cats/duplicate-handlers";
import { getClinic, listClinics } from "@/server/clinics/directory";
import { createHelpHandlers } from "@/server/help/handlers";
import { createCareHandlers } from "@/server/care/handlers";
import { createCatHandlers } from "@/server/cats/handlers";
import { ApiError } from "@/server/http/api-error";
import { decodeCursor } from "@/server/http/cursor";
import { PublicMapItem } from "@/shared/contracts/map";
import { createMapHandler } from "@/server/geo/map-handler";
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

describe("public map (Q02)", () => {
  const handleMap = createMapHandler(() => db);
  function map(bbox: string, zoom = 15, needs?: string) {
    const query = new URLSearchParams({ bbox, zoom: String(zoom) });
    if (needs) query.set("needs", needs);
    return handleMap(new Request("http://localhost/api/v1/map?" + query));
  }

  it("filters by public cell center and never exposes observation coordinates, owner details or exact time", async () => {
    const author = await newUser("sample_map_author");
    await db.insert(s.userPrivate).values({ userId: author, firstName: "private-fixture-name" });
    const observedAt = new Date("2026-11-16T12:34:56Z");
    const [visible] = await db.insert(s.cats).values([
      { createdBy: author, currentName: "گربهٔ نمونهٔ نقشه", publicCellId: "g0.01:-401:100", needs: ["medical"], lastSeenAt: observedAt },
      { createdBy: author, currentName: "owned-map-fixture", publicCellId: "g0.01:-401:100", custody: "owned", ownerUserId: author, lastSeenAt: observedAt },
      { createdBy: author, currentName: "inactive-map-fixture", publicCellId: "g0.01:-401:100", lifecycle: "deceased", lastSeenAt: observedAt },
      { createdBy: author, currentName: "unlocated-map-fixture", lastSeenAt: observedAt },
    ]).returning({ id: s.cats.id });
    await db.insert(s.sightings).values({
      catId: visible!.id, observerId: author, observedAt, precision: "exact",
      location: { x: -4.00123, y: 1.00876 }, publicCellId: "g0.01:-401:100", note: "private-observation-note",
    });

    const containingPrivatePoint = await map("-4.002,1.008,-4.001,1.009");
    expect((await containingPrivatePoint.json()).data).toEqual([]);
    const publicResponse = await map("-4.006,1.004,-4.004,1.006", 15, "medical");
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.headers.get("cache-control")).toBe("no-store");
    const body = await publicResponse.json();
    expect(body.data).toEqual([{
      kind: "cat", id: visible!.id, name: "گربهٔ نمونهٔ نقشه", center: [-4.005, 1.005],
      needs: ["medical"], lastSeenAt: "2026-11-16T00:00:00Z", thumbnailUrl: null,
    }]);
    expect(PublicMapItem.array().safeParse(body.data).success).toBe(true);
    const filtered = await map("-4.006,1.004,-4.004,1.006", 15, "adoption");
    expect((await filtered.json()).data).toEqual([]);
  });

  it("clusters lower zoom and shared cells, retaining deliberately coarse centers", async () => {
    const author = await newUser("sample_map_cluster");
    const lastSeenAt = new Date("2026-11-16T12:00:00Z");
    await db.insert(s.cats).values([
      { createdBy: author, publicCellId: "g0.01:200:300", lastSeenAt },
      { createdBy: author, publicCellId: "g0.01:201:301", lastSeenAt },
      { createdBy: author, publicCellId: "g0.01:201:301", lastSeenAt },
      { createdBy: author, publicCellId: "g0.1:20:30", lastSeenAt },
      { createdBy: author, publicCellId: "unknown-legacy-cell", lastSeenAt },
    ]);
    const low = await map("2,3,2.1,3.1", 9);
    expect((await low.json()).data).toEqual([{
      kind: "cluster", cellId: "g0.1:20:30", center: [2.05, 3.05], count: 4,
    }]);
    const high = await map("2.012,3.012,2.02,3.02", 15);
    expect((await high.json()).data).toEqual([{
      kind: "cluster", cellId: "g0.01:201:301", center: [2.015, 3.015], count: 2,
    }]);
    const coarse = await map("2.04,3.04,2.06,3.06", 18);
    expect((await coarse.json()).data).toEqual([expect.objectContaining({ kind: "cat", center: [2.05, 3.05] })]);
    expect((await map("2,3,5,6")).status).toBe(422);
    expect((await map(",0,1,1")).status).toBe(422);
    expect((await map("2,3,2.1,3.1", 21)).status).toBe(422);
  });
});

describe("cat and colony lifecycle", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  const handle = createCatHandlers({
    db: () => db,
    now: () => now,
    secret: () => "test-only-cursor-secret",
    session: (request) => {
      const id = request.headers.get("x-test-actor");
      if (!id) throw new ApiError("UNAUTHENTICATED");
      return Promise.resolve({ sessionId: id, userId: id, status: "active" });
    },
  });
  const request = (method = "GET", body?: object, actor?: string) => new Request("http://localhost/api/v1/test", {
    method,
    ...(actor && { headers: { "x-test-actor": actor } }),
    ...(body && { body: JSON.stringify(body) }),
  });
  const params = (id: string) => ({ params: Promise.resolve({ id }) });
  const observation = (observedAt: string, lng: number) => ({ observedAt, location: { lng, lat: 9.0042 }, precision: "exact" });

  it("creates an unknown cat with multiple ready images, preserves observations and enforces write permissions", async () => {
    const creator = await newUser("sample_cat_creator");
    const visitor = await newUser("sample_cat_visitor");
    const files = await db.insert(s.media).values(["one", "two"].map((name) => ({
      ownerId: creator, storageKey: "test/cat/" + name, mime: "image/jpeg", sizeBytes: 45, status: "ready" as const,
    }))).returning({ id: s.media.id });
    const first = observation("2026-11-17T11:23:45Z", 8.0031);
    expect((await handle.create(request("POST", { observation: first }))).status).toBe(401);
    expect((await handle.create(request("POST", { observation: first, mediaIds: [files[0]!.id] }, visitor))).status).toBe(422);
    const created = await handle.create(request("POST", { observation: first, mediaIds: files.map(({ id }) => id) }, creator));
    expect(created.status).toBe(201);
    const { data } = await created.json();
    expect(data).toMatchObject({ sex: "unknown", ageEstimate: "unknown", version: 0, thumbnailUrl: null, lastSeenAt: "2026-11-17T00:00:00Z" });
    expect(JSON.stringify(data)).not.toContain("8.0031");
    const catId = data.id as string;
    expect(await db.select().from(s.catMedia).where(eq(s.catMedia.catId, catId))).toHaveLength(2);
    expect((await handle.update(request("PATCH", { version: 0, name: "نام نمونه" }, visitor), params(catId))).status).toBe(403);
    expect((await handle.update(request("PATCH", { version: 0, name: "نام نمونه" }, creator), params(catId))).status).toBe(200);
    expect((await handle.update(request("PATCH", { version: 0, name: "نام قدیمی" }, creator), params(catId))).status).toBe(409);

    const newObservation = observation("2026-11-18T12:34:56Z", 8.0274);
    const oldObservation = observation("2026-11-16T12:00:00Z", 8.04);
    const sightings = await Promise.all([newObservation, oldObservation].map((item) => handle.observe(request("POST", item, visitor), params(catId))));
    expect(sightings.map(({ status }) => status)).toEqual([201, 201]);
    const { data: latest } = await (await handle.get(request(), params(catId))).json();
    expect(latest).toMatchObject({ name: "نام نمونه", lastSeenAt: "2026-11-18T00:00:00Z", publicArea: { cellId: "g0.01:802:900" } });
    expect(await db.select().from(s.sightings).where(eq(s.sightings.catId, catId))).toHaveLength(3);

    const list = await handle.list(new Request("http://localhost/api/v1/cats?limit=1"));
    const { meta } = await list.json();
    if (meta.nextCursor) {
      expect(decodeCursor(meta.nextCursor, "test-only-cursor-secret").sortKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect((await handle.list(new Request("http://localhost/api/v1/cats?limit=1&cursor=" + meta.nextCursor))).status).toBe(200);
    }
    expect((await handle.archive(request("DELETE", { version: latest.version }, creator), params(catId))).status).toBe(204);
    expect((await handle.get(request(), params(catId))).status).toBe(404);
    expect((await handle.observe(request("POST", newObservation, visitor), params(catId))).status).toBe(404);
    const map = await createMapHandler(() => db)(new Request("http://localhost/api/v1/map?bbox=8,9,8.1,9.1&zoom=15"));
    expect((await map.json()).data).toEqual([]);
  });

  it("tracks past membership and logs removed caretakers without exposing either publicly", async () => {
    const owner = await newUser("sample_colony_owner");
    const caretaker = await newUser("sample_colony_caretaker");
    const colony = await handle.createColony(request("POST", { name: "کلونی نمونه", location: { lng: 8.0031, lat: 9.0042 } }, owner));
    expect(colony.status).toBe(201);
    const { data: created } = await colony.json();
    const colonyId = created.id as string;
    const [cat] = await db.insert(s.cats).values({ createdBy: owner, publicCellId: "g0.01:800:900", lastSeenAt: now }).returning({ id: s.cats.id });
    const assign = (action: "assign" | "remove", version: number, actor = owner) =>
      handle.changeCaretaker(request("POST", { userId: caretaker, action, version }, actor), params(colonyId));
    const membership = (action: "join" | "leave", at: string, version: number) =>
      handle.changeMembership(request("POST", { catId: cat!.id, action, at, version }, owner), params(colonyId));

    expect((await assign("assign", 0, caretaker)).status).toBe(403);
    expect((await assign("assign", 0)).status).toBe(200);
    expect((await membership("join", "2026-11-16T00:00:00Z", 1)).status).toBe(200);
    expect((await membership("join", "2026-11-17T00:00:00Z", 2)).status).toBe(409);
    expect((await membership("leave", "2026-11-18T00:00:00Z", 2)).status).toBe(200);
    expect((await membership("join", "2026-11-18T00:00:00Z", 3)).status).toBe(200);
    expect((await assign("remove", 4)).status).toBe(200);
    expect((await handle.updateColony(request("PATCH", { name: "نام تازه", version: 5 }, caretaker), params(colonyId))).status).toBe(403);
    const history = await db.select().from(s.colonyMemberships).where(eq(s.colonyMemberships.colonyId, colonyId));
    expect(history).toHaveLength(2);
    expect(history.some((row) => row.validTo?.toISOString() === "2026-11-18T00:00:00.000Z")).toBe(true);
    const audit = await db.select().from(s.auditLogs).where(eq(s.auditLogs.resourceId, colonyId));
    expect(audit).toHaveLength(3);
    expect(audit).toEqual(expect.arrayContaining([expect.objectContaining({ action: "colony.caretaker.remove", changes: { userId: caretaker, since: now.toISOString() } })]));
    const detail = await handle.getColony(request(), params(colonyId));
    expect(await detail.json()).toMatchObject({ data: { name: "کلونی نمونه", version: 5 } });
    expect(Object.keys(created).sort()).toEqual(["id", "name", "publicArea", "version"]);
    expect((await handle.archiveColony(request("DELETE", { version: 5 }, owner), params(colonyId))).status).toBe(204);
    expect((await handle.getColony(request(), params(colonyId))).status).toBe(404);
  });
});

describe("private image uploads (Q24)", () => {
  it("rejects false MIME, excess bytes and foreign accounts, and publishes sanitized bytes only", async () => {
    const owner = await newUser("sample_upload_owner");
    const stranger = await newUser("sample_upload_stranger");
    let now = new Date("2026-11-20T00:00:00Z");
    const storage = getMediaStorage();
    const handle = createUploadHandlers({
      db: () => db, storage: () => storage, secret: () => "upload-test-only", now: () => now,
      rateLimit: async () => {},
      session: async (request) => {
        const id = request.headers.get("x-test-actor");
        if (!id) throw new ApiError("UNAUTHENTICATED");
        return { userId: id, sessionId: id, status: "active" };
      },
    });
    const request = (method: string, path: string, actor: string, body?: BodyInit, type = "application/json") =>
      new Request("http://localhost" + path, { method, headers: { "x-test-actor": actor, "content-type": type }, body });
    const params = (id: string) => ({ params: Promise.resolve({ id }) });
    const begin = (size: number) => handle.intent(request("POST", "/intents", owner, JSON.stringify({ kind: "image", type: "image/jpeg", size })));
    expect((await begin(8 * 1024 * 1024 + 1)).status).toBe(422);

    const original = await sharp({ create: { width: 24, height: 16, channels: 3, background: "orange" } })
      .withExif({ IFD0: { Artist: "sample-private-metadata" } }).jpeg().toBuffer();
    expect((await sharp(original).metadata()).exif).toBeDefined();
    const { data: valid } = await (await begin(original.length)).json();
    const { data: invalid } = await (await begin(4)).json();
    try {
      expect((await handle.upload(request("PUT", valid.uploadUrl, stranger, new Uint8Array(original), "image/jpeg"), params(valid.id))).status).toBe(404);
      expect((await handle.complete(request("POST", "/complete", stranger), params(valid.id))).status).toBe(404);
      expect((await handle.upload(request("PUT", valid.uploadUrl, owner, new Uint8Array(original.length + 1), "image/jpeg"), params(valid.id))).status).toBe(422);
      expect((await handle.signRead(request("GET", "/access", owner), params(valid.id))).status).toBe(404);
      expect((await handle.upload(request("PUT", invalid.uploadUrl, owner, "fake", "image/jpeg"), params(invalid.id))).status).toBe(204);
      expect((await handle.complete(request("POST", "/complete", owner), params(invalid.id))).status).toBe(422);
      const [rejected] = await db.select({ status: s.media.status }).from(s.media).where(eq(s.media.id, invalid.id));
      expect(rejected?.status).toBe("rejected");
      expect(await storage.read("quarantine/images/" + invalid.id, 4)).toBeNull();

      expect((await handle.upload(request("PUT", valid.uploadUrl, owner, new Uint8Array(original), "image/jpeg"), params(valid.id))).status).toBe(204);
      const complete = () => handle.complete(request("POST", "/complete", owner), params(valid.id));
      const results = await Promise.all([complete(), complete()]);
      expect(results.map(({ status }) => status)).toEqual([200, 200]);
      expect((await results[0]!.json()).data).toMatchObject({ id: valid.id, mime: "image/jpeg", status: "ready" });
      expect(await storage.read("quarantine/images/" + valid.id, original.length)).toBeNull();
      expect((await handle.signRead(request("GET", "/access", stranger), params(valid.id))).status).toBe(404);
      const { data: access } = await (await handle.signRead(request("GET", "/access", owner), params(valid.id))).json();
      const download = await handle.read(request("GET", access.downloadUrl, owner), params(valid.id));
      expect(download.status).toBe(200);
      expect(download.headers.get("cache-control")).toBe("private, no-store");
      const sanitized = Buffer.from(await download.arrayBuffer());
      expect((await sharp(sanitized).metadata()).exif).toBeUndefined();
      expect(sanitized.includes("sample-private-metadata")).toBe(false);
      now = new Date(now.getTime() + 5 * 60_000);
      expect((await handle.read(request("GET", access.downloadUrl, owner), params(valid.id))).status).toBe(403);
    } finally {
      await Promise.all([
        storage.remove("ready/images/" + valid.id + ".jpg"),
        storage.remove("quarantine/images/" + valid.id),
        storage.remove("quarantine/images/" + invalid.id),
      ]);
    }
  });
});


describe("care and medical records (Q15)", () => {
  it("keeps reports private, enforces credential and assignment, and preserves amendments", async () => {
    const volunteer = await newUser("sample_health_volunteer");
    const vet = await newUser("sample_health_vet");
    const now = new Date("2026-11-21T13:12:11Z");
    const handle = createCareHandlers({
      db: () => db, now: () => now,
      session: async (request) => {
        const id = request.headers.get("x-test-actor");
        if (!id) throw new ApiError("UNAUTHENTICATED");
        return { userId: id, sessionId: id, status: "active" };
      },
    });
    const request = (actor?: string, body?: object) => new Request("http://localhost/api/v1/test", {
      method: body ? "POST" : "GET",
      ...(actor && { headers: { "x-test-actor": actor } }),
      ...(body && { body: JSON.stringify(body) }),
    });
    const params = (id: string) => ({ params: Promise.resolve({ id }) });
    const [cat] = await db.insert(s.cats).values({ createdBy: volunteer }).returning({ id: s.cats.id });
    const catId = cat!.id;
    const payload = { category: "vaccination", occurredAt: now.toISOString(), note: "private fixture note" };
    expect((await handle.report(request(vet, { ...payload, professional: true }), params(catId))).status).toBe(403);
    const created = await handle.report(request(volunteer, payload), params(catId));
    expect(created.status).toBe(201);
    const { data: first } = await created.json();
    expect(first.source).toBe("volunteer");
    expect((await handle.privateHealth(request(), params(catId))).status).toBe(401);
    expect((await (await handle.privateHealth(request(vet), params(catId))).json()).data).toEqual([]);
    expect((await (await handle.publicHealth(request(), params(catId))).json()).data).toEqual([]);

    await db.insert(s.professionalCredentials).values({
      userId: vet, profession: "veterinarian", status: "verified", verifiedBy: volunteer,
      verifiedAt: now, expiresAt: new Date(now.getTime() + 60_000),
    });
    expect((await handle.confirm(request(vet, { publish: true }), params(first.id))).status).toBe(403);
    const [help] = await db.insert(s.helpRequests).values({ catId, reporterId: volunteer, description: "درخواست نمونه", needType: "treatment" }).returning({ id: s.helpRequests.id });
    const [mission] = await db.insert(s.missions).values({ helpRequestId: help!.id, type: "vet_visit", createdBy: volunteer, status: "full" }).returning({ id: s.missions.id });
    const [assignment] = await db.insert(s.assignments).values({ missionId: mission!.id, userId: vet }).returning({ id: s.assignments.id });
    expect((await handle.confirm(request(vet, { publish: true }), params(first.id))).status).toBe(200);
    const publicResult = await handle.publicHealth(request(), params(catId));
    expect(publicResult.headers.get("cache-control")).toBe("no-store");
    expect((await publicResult.json()).data).toEqual([{ id: first.id, category: "vaccination", day: "2026-11-21", confirmed: true }]);
    const amended = await handle.report(request(vet, { ...payload, note: "private amendment", professional: true, amendsRecordId: first.id }), params(catId));
    expect(amended.status).toBe(201);
    const { data: second } = await amended.json();
    expect((await handle.confirm(request(vet, { publish: false }), params(second.id))).status).toBe(200);
    expect((await (await handle.publicHealth(request(), params(catId))).json()).data).toEqual([]);
    expect((await (await handle.privateHealth(request(vet), params(catId))).json()).data).toHaveLength(2);
    await db.update(s.assignments).set({ status: "removed", endedAt: now }).where(eq(s.assignments.id, assignment!.id));
    expect((await handle.report(request(vet, { ...payload, professional: true }), params(catId))).status).toBe(403);
    expect((await (await handle.privateHealth(request(vet), params(catId))).json()).data).toHaveLength(1);
    expect((await handle.care(request(volunteer, { category: "feeding", occurredAt: now.toISOString(), note: "private feeding note" }), params(catId))).status).toBe(201);
    expect((await (await handle.listCare(request(vet), params(catId))).json()).data).toEqual([]);
  });
});


describe("duplicate cat requests", () => {
  it("uses only public neighboring cells and deduplicates concurrent requests", async () => {
    const actor = await newUser("sample_duplicate_reporter");
    const handle = createDuplicateHandlers(() => db, async () => ({ userId: actor, sessionId: actor, status: "active" }));
    const [source, nearby, distant, owned] = await db.insert(s.cats).values([
      { createdBy: actor, publicCellId: "g0.01:101:102", currentName: "نمونهٔ اصلی" },
      { createdBy: actor, publicCellId: "g0.01:102:101", currentName: "نمونهٔ نزدیک" },
      { createdBy: actor, publicCellId: "g0.01:150:160", currentName: "نمونهٔ دور" },
      { createdBy: actor, publicCellId: "g0.01:101:101", custody: "owned", ownerUserId: actor },
    ]).returning({ id: s.cats.id });
    const params = (id: string) => ({ params: Promise.resolve({ id }) });
    const path = "http://localhost/api/v1/test";
    const response = await handle.similar(new Request(path), params(source!.id));
    expect((await response.json()).data).toEqual([{ id: nearby!.id, name: "نمونهٔ نزدیک", areaLabel: null }]);
    const post = (id: string, candidateId: string) => handle.request(new Request(path, { method: "POST",
      body: JSON.stringify({ candidateId, reason: "نشانهٔ ظاهری مشابه در دادهٔ نمونه" }),
    }), params(id));
    expect((await post(source!.id, owned!.id)).status).toBe(404);
    expect((await post(distant!.id, distant!.id)).status).toBe(422);
    const results = await Promise.all([post(source!.id, nearby!.id), post(nearby!.id, source!.id)]);
    expect(results.map(({ status }) => status).sort()).toEqual([201, 409]);
    const saved = await db.select().from(s.moderationReports).where(eq(s.moderationReports.reporterId, actor));
    expect(saved).toHaveLength(1);
    const audit = await db.select().from(s.auditLogs).where(eq(s.auditLogs.resourceId, saved[0]!.id));
    expect(audit).toEqual([expect.objectContaining({ action: "cat.merge_requested" })]);
    expect((await db.select().from(s.cats).where(eq(s.cats.id, source!.id)))[0]!.lifecycle).toBe("active");
  });
});


describe("public clinic directory", () => {
  it("publishes coordinates and contact only with explicit consent", async () => {
    const [hidden, publicRow] = await db.insert(s.clinics).values([
      { name: "کلینیک نمونهٔ بدون رضایت", publicAddress: "مکان خصوصی نمونه", location: { x: 3.001, y: 2.001 }, publicPhone: "0000" },
      { name: "کلینیک نمونهٔ عمومی", publicAddress: "نشانی نمونه", location: { x: 3.25, y: 2.25 },
        publicPhone: "0001", contactConsent: "granted", verifiedStatus: "verified",
        openingHours: [{ weekday: 6, opens: "08:15", closes: "13:00" }] },
    ]).returning({ id: s.clinics.id });
    expect(await getClinic(db, hidden!.id)).toMatchObject({ address: null, center: null, phone: null, openingHours: [], status: "unverified" });
    expect(await getClinic(db, publicRow!.id)).toMatchObject({
      address: "نشانی نمونه", center: [3.25, 2.25], phone: "0001", status: "verified",
      openingHours: [{ weekday: 6, opens: "08:15", closes: "13:00" }],
    });
    const page = await listClinics(db, { limit: 1 }, "clinic-test-key");
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeTruthy();
    expect((await listClinics(db, { limit: 1, cursor: page.nextCursor! }, "clinic-test-key")).items[0]!.id).not.toBe(page.items[0]!.id);
  });
});


describe("urgent report triage", () => {
  it("holds private evidence, enforces the triage owner, and requires an answer before resolution", async () => {
    const reporter = await newUser("sample_help_reporter");
    const reviewer = await newUser("sample_help_reviewer");
    const other = await newUser("sample_help_other");
    const now = new Date("2026-11-23T12:00:00Z");
    const allowed = new Set([reviewer]);
    const handlers = createHelpHandlers({
      db: () => db, now: () => now, reviewer: (id) => allowed.has(id), storage: getMediaStorage, rateLimit: async () => {},
      session: async (request) => {
        const id = request.headers.get("x-test-actor");
        if (!id) throw new ApiError("UNAUTHENTICATED");
        return { userId: id, sessionId: id, status: "active" };
      },
    });
    const request = (actor: string, body?: object) => new Request("http://localhost/api/v1/test", {
      method: body ? "POST" : "GET", headers: { "x-test-actor": actor }, ...(body && { body: JSON.stringify(body) }),
    });
    const [cat] = await db.insert(s.cats).values({ createdBy: reporter }).returning({ id: s.cats.id });
    const id = crypto.randomUUID();
    await db.insert(s.media).values({ id, ownerId: reporter, storageKey: "ready/images/" + id + ".jpg",
      mime: "image/jpeg", sizeBytes: 100, status: "ready" });
    const input = { target: { kind: "cat", id: cat!.id }, needType: "rescue", urgency: "critical", description: "sample report", evidenceIds: [id] };
    expect((await handlers.create(request(other, input))).status).toBe(422);
    const created = await handlers.create(request(reporter, input));
    expect(created.status).toBe(201);
    const report = (await created.json()).data;
    const ctx = { params: Promise.resolve({ id: report.id }) };
    const triage = { version: 0, urgency: "high", ownerId: reviewer, deadlineAt: "2026-11-24T12:00:00Z" };
    expect((await handlers.get(request(other), ctx)).status).toBe(404);
    expect((await handlers.triage(request(reporter, triage), ctx)).status).toBe(403);
    expect((await handlers.resolve(request(reviewer, { version: 0, response: "too early" }), ctx)).status).toBe(403);
    expect((await handlers.triage(request(reviewer, triage), ctx)).status).toBe(200);
    expect((await handlers.triage(request(reviewer, triage), ctx)).status).toBe(409);
    expect((await handlers.resolve(request(reviewer, { version: 1, response: "  " }), ctx)).status).toBe(422);
    expect((await handlers.resolve(request(reviewer, { version: 1, response: "sample outcome" }), ctx)).status).toBe(200);
    expect((await (await handlers.get(request(reporter), ctx)).json()).data).toMatchObject({ evidenceIds: [id], status: "resolved", response: "sample outcome", version: 2 });
    allowed.delete(reviewer);
    expect((await handlers.get(request(reviewer), ctx)).status).toBe(404);
    const events = await db.select().from(s.outboxEvents).where(eq(s.outboxEvents.aggregateId, report.id));
    expect(events.map((event) => event.type)).toEqual(expect.arrayContaining(["help.reported", "help.triaged", "help.resolved"]));
    const catHandlers = createCatHandlers({ db: () => db, secret: () => "test-only", now: () => now,
      session: async () => ({ userId: reporter, sessionId: reporter, status: "active" }) });
    expect((await catHandlers.create(request(reporter, { mediaIds: [id], publishPhotos: true, observation: {
      occurredAt: now.toISOString(), observedAt: now.toISOString(), location: { lng: 4, lat: 3 }, precision: "exact",
    } }))).status).toBe(409);
  });
});
