import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { publicCellId } from "../geo/public-cell";
import { createDb } from "./client";
import * as s from "./schema";

/**
 * SAMPLE DATA ONLY (docs/06 "دادهٔ تست"): every name carries «نمونه», no real person, contact or
 * credential. 30 street cats + 1 owned, 5 colonies, 4 groups, 3 clinics, allowed and disallowed
 * roles, a mission at full capacity and a failed notification delivery.
 */

type Db = PostgresJsDatabase<typeof s>;

/** Deterministic PRNG so every seed run produces the same data. */
function prng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

const CENTER = { lng: 51.389, lat: 35.6892 };
const CAT_NAMES = ["نارنج", "برفی", "خال‌خالی", "دودی", "عسلی", "ببری", "شکلات", "زیتون", "فلفل", "نخودی", "پشمک", "مخملی", "گردو", "لیمو", "ابری"];
const AREAS = ["محلهٔ نمونهٔ الف", "محلهٔ نمونهٔ ب", "محلهٔ نمونهٔ ج", "محلهٔ نمونهٔ د", "محلهٔ نمونهٔ ه"];
const NEEDS = [[], ["food_water"], ["medical"], ["urgent", "medical"], ["adoption"], ["food_water", "adoption"]] as const;

export async function seed(db: Db, now = new Date()) {
  const rand = prng(20261116);
  const point = (spread = 0.04) => ({ x: CENTER.lng + (rand() - 0.5) * spread, y: CENTER.lat + (rand() - 0.5) * spread });
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

  return db.transaction(async (tx) => {
    const userRows = [
      { username: "sample_admin", status: "active" as const },
      { username: "sample_vet", status: "active" as const },
      { username: "sample_vet_pending", status: "active" as const },
      { username: "sample_volunteer_1", status: "active" as const },
      { username: "sample_volunteer_2", status: "active" as const },
      { username: "sample_volunteer_3", status: "active" as const },
      { username: "sample_caregiver", status: "active" as const },
      { username: "sample_owner", status: "active" as const },
      { username: "sample_new_user", status: "pending_activation" as const },
      { username: "sample_suspended", status: "suspended" as const },
    ];
    const users = await tx
      .insert(s.users)
      .values(userRows.map((u) => ({ ...u, normalizedUsername: u.username.toLowerCase() })))
      .returning({ id: s.users.id, username: s.users.username });
    const u = Object.fromEntries(users.map((row) => [row.username, row.id])) as Record<string, string>;
    const uid = (name: string) => u[name]!;

    await tx.insert(s.userPrivate).values(
      users.map((row, i) => ({ userId: row.id, firstName: `نام نمونه ${i + 1}`, lastName: "نمونه", verifiedEmail: `${row.username}@example.invalid` })),
    );

    // Allowed role: verified vet. Disallowed: pending credential (must not get vet powers, T09).
    await tx.insert(s.professionalCredentials).values([
      { userId: uid("sample_vet"), profession: "veterinarian", status: "verified", verifiedBy: uid("sample_admin"), verifiedAt: hoursAgo(240) },
      { userId: uid("sample_vet_pending"), profession: "veterinarian", status: "pending" },
    ]);
    await tx.insert(s.volunteerCapabilities).values([
      { userId: uid("sample_volunteer_1"), capability: "feeding", capacity: 3 },
      { userId: uid("sample_volunteer_1"), capability: "transport", capacity: 1 },
      { userId: uid("sample_volunteer_2"), capability: "transport", capacity: 2 },
      { userId: uid("sample_volunteer_3"), capability: "trapping", capacity: 1 },
      { userId: uid("sample_caregiver"), capability: "foster", capacity: 2 },
    ]);

    const groups = await tx
      .insert(s.groups)
      .values([
        { name: "گروه نمونهٔ سراسری", scope: "public", visibility: "open", createdBy: uid("sample_admin") },
        { name: "گروه نمونهٔ محلهٔ الف", scope: "local", visibility: "request", areaCellId: publicCellId(CENTER.lng, CENTER.lat), createdBy: uid("sample_volunteer_1") },
        { name: "گروه نمونهٔ حمل‌ونقل", scope: "public", visibility: "request", createdBy: uid("sample_volunteer_2") },
        { name: "گروه نمونهٔ پنهان", scope: "local", visibility: "hidden", createdBy: uid("sample_admin") },
      ])
      .returning({ id: s.groups.id });
    await tx.insert(s.groupMemberships).values([
      { groupId: groups[0]!.id, userId: uid("sample_admin"), role: "admin", status: "active", joinedAt: hoursAgo(500) },
      { groupId: groups[0]!.id, userId: uid("sample_volunteer_1"), status: "active", joinedAt: hoursAgo(400) },
      { groupId: groups[1]!.id, userId: uid("sample_volunteer_1"), role: "moderator", status: "active", joinedAt: hoursAgo(300) },
      { groupId: groups[1]!.id, userId: uid("sample_volunteer_2"), status: "requested" },
      { groupId: groups[2]!.id, userId: uid("sample_volunteer_2"), role: "admin", status: "active", joinedAt: hoursAgo(200) },
      { groupId: groups[3]!.id, userId: uid("sample_admin"), role: "admin", status: "active", joinedAt: hoursAgo(100) },
    ]);

    const colonies = await tx
      .insert(s.colonies)
      .values(
        AREAS.map((area, i) => {
          const p = point();
          return { name: `کلونی نمونهٔ ${i + 1}`, publicAreaLabel: area, publicCellId: publicCellId(p.x, p.y), location: p, createdBy: uid("sample_volunteer_1") };
        }),
      )
      .returning({ id: s.colonies.id });
    await tx.insert(s.colonyCaretakers).values(colonies.slice(0, 3).map((c) => ({ colonyId: c.id, userId: uid("sample_volunteer_1") })));

    const catPoints = Array.from({ length: 30 }, () => point());
    const catValues = catPoints.map((p, i) => {
      return {
        currentName: i % 7 === 6 ? null : `${CAT_NAMES[i % CAT_NAMES.length]} نمونه ${i + 1}`,
        sex: (["female", "male", "unknown"] as const)[i % 3],
        ageEstimate: (["kitten", "young", "adult", "senior", "unknown"] as const)[i % 5],
        needs: [...NEEDS[i % NEEDS.length]!],
        publicCellId: publicCellId(p.x, p.y),
        publicAreaLabel: AREAS[i % AREAS.length],
        lastSeenAt: hoursAgo(1 + i * 3),
        createdBy: uid(i % 2 ? "sample_volunteer_1" : "sample_volunteer_2"),
      };
    });
    const cats = await tx
      .insert(s.cats)
      .values(catValues)
      .returning({ id: s.cats.id });
    // Owned cat: private, never on the public map (docs/06).
    const [ownedCat] = await tx
      .insert(s.cats)
      .values({ currentName: "گربهٔ خانگی نمونه", custody: "owned", ownerUserId: uid("sample_owner"), createdBy: uid("sample_owner") })
      .returning({ id: s.cats.id });

    await tx.insert(s.sightings).values(
      cats.map((cat, i) => ({
        catId: cat.id,
        observerId: uid("sample_volunteer_1"),
        observedAt: hoursAgo(1 + i * 3),
        precision: "approximate" as const,
        location: catPoints[i]!,
        publicCellId: catValues[i]!.publicCellId,
      })),
    );
    await tx.insert(s.colonyMemberships).values(
      cats.slice(0, 15).map((cat, i) => ({ colonyId: colonies[i % colonies.length]!.id, catId: cat.id, validFrom: hoursAgo(1000), status: "verified" as const, createdBy: uid("sample_volunteer_1") })),
    );
    await tx.insert(s.catRelationships).values({ fromCatId: cats[0]!.id, toCatId: cats[1]!.id, type: "mother_of", createdBy: uid("sample_volunteer_1") });

    await tx.insert(s.clinics).values(
      [1, 2, 3].map((n) => ({
        name: `کلینیک نمونهٔ ${n}`,
        publicAddress: `نشانی نمونهٔ ${n}`,
        location: point(0.08),
        services: ["vaccination", "sterilization"],
        verifiedStatus: n === 3 ? ("unverified" as const) : ("verified" as const),
      })),
    );

    // Mission at full capacity: a third acceptance must fail (Q06/Q07).
    const [helpRequest] = await tx
      .insert(s.helpRequests)
      .values({ catId: cats[3]!.id, reporterId: uid("sample_volunteer_3"), needType: "transport_to_vet", urgency: "high", status: "triaged", description: "درخواست نمونه برای انتقال به کلینیک", triageOwnerId: uid("sample_vet") })
      .returning({ id: s.helpRequests.id });
    const [fullMission] = await tx
      .insert(s.missions)
      .values({ helpRequestId: helpRequest!.id, type: "transport", status: "full", capacity: 2, acceptedCount: 2, requiredCapability: "transport", dueAt: hoursAgo(-24), createdBy: uid("sample_vet") })
      .returning({ id: s.missions.id });
    await tx.insert(s.assignments).values([
      { missionId: fullMission!.id, userId: uid("sample_volunteer_1") },
      { missionId: fullMission!.id, userId: uid("sample_volunteer_2") },
    ]);
    await tx.insert(s.missions).values({ helpRequestId: helpRequest!.id, type: "feeding", capacity: 3, createdBy: uid("sample_vet") });

    await tx.insert(s.caregiverProfiles).values([
      {
        userId: uid("sample_caregiver"),
        serviceKinds: ["foster", "sitting"],
        modes: ["host_home"],
        publicCellId: publicCellId(CENTER.lng, CENTER.lat),
        publicAreaLabel: AREAS[0],
        capacity: 2,
        homeConditions: { otherPets: false, children: false, postOpCare: true, medication: ["oral"] },
        status: "published",
        reviewedBy: uid("sample_admin"),
        reviewedAt: hoursAgo(48),
      },
      { userId: uid("sample_volunteer_3"), serviceKinds: ["sitting"], modes: ["home_visit"], capacity: 1, status: "pending_review" },
    ]);

    const [notification] = await tx
      .insert(s.notifications)
      .values({ recipientId: uid("sample_volunteer_1"), eventType: "mission.accepted", dedupeKey: `sample-event-1:${uid("sample_volunteer_1")}`, payload: { missionId: fullMission!.id } })
      .returning({ id: s.notifications.id });
    await tx.insert(s.notificationDeliveries).values([
      { notificationId: notification!.id, channel: "in_app", status: "sent", attempts: 1, sentAt: hoursAgo(1) },
      { notificationId: notification!.id, channel: "email", status: "failed", attempts: 3, lastError: "sample: provider not configured" },
    ]);

    return { users: users.length, cats: cats.length + 1, colonies: colonies.length, groups: groups.length, clinics: 3, ownedCatId: ownedCat!.id };
  });
}

/** Removes all rows from every app table (keeps schema and migrations). Local only. */
export async function truncateAll(db: Db) {
  await db.execute(sql`
    DO $$ DECLARE r record; BEGIN
      FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'spatial_ref_sys' LOOP
        EXECUTE format('TRUNCATE TABLE %I CASCADE', r.tablename);
      END LOOP;
    END $$;`);
}

function assertLocal(url: string) {
  const host = new URL(url).hostname;
  if (process.env.NODE_ENV === "production" || !["127.0.0.1", "localhost"].includes(host)) {
    throw new Error(`Refusing to seed a non-local database (${host}).`);
  }
}

// CLI: npm run db:seed [-- --reset]
if (process.argv[1]?.endsWith("seed.ts")) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // optional
  }
  const url = process.env.DATABASE_URL ?? "";
  (async () => {
    assertLocal(url);
    const { sql: client, db } = createDb(url, { max: 1 });
    try {
      const [{ count }] = (await client`SELECT count(*)::int AS count FROM users`) as unknown as [{ count: number }];
      if (count > 0 && !process.argv.includes("--reset")) {
        console.log(`users table already has ${count} rows; run "npm run db:seed -- --reset" to wipe and reseed.`);
        return;
      }
      if (count > 0) await truncateAll(db);
      console.log("seeded:", await seed(db));
    } finally {
      await client.end();
    }
  })().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
