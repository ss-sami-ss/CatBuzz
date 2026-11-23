import { eq } from "drizzle-orm";
import { Redis } from "ioredis";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { requireGroupRole, requireProfessionalCredential } from "@/server/auth/access-policy";
import { createAuthHandlers } from "@/server/auth/handlers";
import { createDb } from "@/server/db/client";
import { authChallenges, groupMemberships, groups, professionalCredentials, sessions, users } from "@/server/db/schema";
import type { EmailMessage, EmailSender } from "@/server/email/email-sender";
import { resetTestDb, TEST_REDIS_URL, TEST_URL } from "./test-env";

const ORIGIN = "http://localhost:3000";
process.env.APP_ORIGIN = ORIGIN;

const { sql: client, db } = createDb(TEST_URL, { max: 4 });
const redis = new Redis(TEST_REDIS_URL);
const outbox: EmailMessage[] = [];
let emailBroken = false;
const email: EmailSender = {
  async send(message) {
    if (emailBroken) throw new Error("smtp down");
    outbox.push(message);
  },
};
let clock = new Date("2026-11-16T10:00:00Z");
const auth = createAuthHandlers({ db, redis, email, secret: "test-only-auth-secret-0123456789abcdef", now: () => clock, secureCookies: false });

let ipCounter = 0;
function post(handler: (r: Request) => Promise<Response>, body: unknown, headers: Record<string, string> = {}) {
  return handler(
    new Request(`${ORIGIN}/api/v1/x`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": headers["x-forwarded-for"] ?? `10.0.0.${++ipCounter % 250}`, ...headers },
      body: JSON.stringify(body),
    }),
  );
}

const lastCode = () => /(\d{6})/.exec(outbox.at(-1)!.subject)![1]!;

async function startChallenge(address: string, purpose = "sign_up") {
  const res = await post(auth.challenge, { contact: { kind: "email", value: address }, purpose });
  return { res, body: await res.json() };
}

function cookieFrom(res: Response) {
  return res.headers.get("set-cookie")!.split(";")[0]!;
}

beforeAll(async () => {
  await resetTestDb();
});

beforeEach(async () => {
  await redis.flushdb();
  outbox.length = 0;
  emailBroken = false;
  clock = new Date("2026-11-16T10:00:00Z");
});

afterAll(async () => {
  await client.end();
  redis.disconnect();
});

describe("challenge (Q01)", () => {
  it("answers the same for new and existing accounts and stores only a hash", async () => {
    const first = await startChallenge("same@example.com");
    expect(first.res.status).toBe(201);
    await post(auth.verify, { challengeId: first.body.data.challengeId, code: lastCode() });

    const again = await startChallenge("same@example.com", "sign_in");
    const fresh = await startChallenge("nobody@example.com", "sign_in");
    expect(again.res.status).toBe(fresh.res.status);
    expect(Object.keys(again.body.data)).toEqual(Object.keys(fresh.body.data));

    const [row] = await db.select().from(authChallenges).where(eq(authChallenges.id, fresh.body.data.challengeId));
    expect(row!.codeHash).not.toContain(lastCode());
    expect(row!.codeHash.length).toBeGreaterThan(20);
  });

  it("limits codes per email with 429 and Retry-After", async () => {
    for (let i = 0; i < 3; i++) expect((await startChallenge("limit@example.com")).res.status).toBe(201);
    const blocked = await startChallenge("LIMIT@example.com");
    expect(blocked.res.status).toBe(429);
    expect(Number(blocked.res.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("tells the truth when the email cannot be sent and the code is unusable", async () => {
    emailBroken = true;
    const { res, body } = await startChallenge("down@example.com");
    expect(res.status).toBe(503);
    expect(body.error.code).toBe("SERVICE_UNAVAILABLE");
  });
});

describe("verify (Q01)", () => {
  it("creates the account once, opens a session and refuses reuse", async () => {
    const { body } = await startChallenge("New.Person@Example.com");
    const code = lastCode();
    const ok = await post(auth.verify, { challengeId: body.data.challengeId, code });
    expect(ok.status).toBe(200);
    const me = (await ok.json()).data;
    expect(me).toMatchObject({ status: "active", username: null, verifiedContact: { kind: "email", value: "new.person@example.com" } });
    expect(ok.headers.get("set-cookie")).toMatch(/catbuzz_session=.+; Path=\/; HttpOnly; SameSite=Lax/);

    const reuse = await post(auth.verify, { challengeId: body.data.challengeId, code });
    expect(reuse.status).toBe(422);

    const second = await startChallenge("new.person@EXAMPLE.com", "sign_in");
    const again = await post(auth.verify, { challengeId: second.body.data.challengeId, code: lastCode() });
    expect((await again.json()).data.id).toBe(me.id);
  });

  it("accepts Persian digits", async () => {
    const { body } = await startChallenge("persian@example.com");
    const persian = lastCode().replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
    expect((await post(auth.verify, { challengeId: body.data.challengeId, code: persian })).status).toBe(200);
  });

  it("locks the code after five wrong attempts", async () => {
    const { body } = await startChallenge("guess@example.com");
    const code = lastCode();
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) expect((await post(auth.verify, { challengeId: body.data.challengeId, code: wrong })).status).toBe(422);
    const res = await post(auth.verify, { challengeId: body.data.challengeId, code });
    expect(res.status).toBe(422);
    expect((await res.json()).error.message).toContain("دیگر معتبر نیست");
  });

  it("rejects an expired code", async () => {
    const { body } = await startChallenge("late@example.com");
    clock = new Date(clock.getTime() + 11 * 60_000);
    expect((await post(auth.verify, { challengeId: body.data.challengeId, code: lastCode() })).status).toBe(422);
  });

  it("lets only one of several parallel verifications succeed", async () => {
    const { body } = await startChallenge("race@example.com");
    const code = lastCode();
    const results = await Promise.all(Array.from({ length: 4 }, () => post(auth.verify, { challengeId: body.data.challengeId, code })));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
  });

  it("treats an unknown challenge exactly like an expired one", async () => {
    const res = await post(auth.verify, { challengeId: crypto.randomUUID(), code: "123456" });
    expect(res.status).toBe(422);
    expect((await res.json()).error.message).toContain("دیگر معتبر نیست");
  });
});

describe("sessions", () => {
  async function signIn(address: string, ip?: string) {
    const { body } = await startChallenge(address);
    const res = await post(auth.verify, { challengeId: body.data.challengeId, code: lastCode() }, ip ? { "x-forwarded-for": ip } : {});
    return cookieFrom(res);
  }
  const get = (handler: (r: Request) => Promise<Response>, cookie?: string) =>
    handler(new Request(`${ORIGIN}/api/v1/me`, { headers: cookie ? { cookie } : {} }));

  it("serves /me only with a live session and revokes it on logout", async () => {
    const cookie = await signIn("session@example.com");
    expect((await get(auth.me)).status).toBe(401);
    expect((await get(auth.me, cookie)).status).toBe(200);
    const out = await post(auth.logout, {}, { cookie, origin: ORIGIN });
    expect(out.status).toBe(204);
    expect(out.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await get(auth.me, cookie)).status).toBe(401);
  });

  it("logs out every device with ?all=1", async () => {
    const phone = await signIn("devices@example.com");
    const laptop = await signIn("devices@example.com");
    const res = await auth.logout(new Request(`${ORIGIN}/api/v1/auth/logout?all=1`, { method: "POST", headers: { cookie: phone, origin: ORIGIN } }));
    expect(res.status).toBe(204);
    expect((await get(auth.me, laptop)).status).toBe(401);
  });

  it("blocks cookie mutations from a foreign origin (CSRF)", async () => {
    const cookie = await signIn("csrf@example.com");
    const res = await post(auth.logout, {}, { cookie, origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect((await get(auth.me, cookie)).status).toBe(200);
  });

  it("drops the session of a suspended account", async () => {
    const cookie = await signIn("suspend@example.com");
    const [row] = await db.select({ userId: sessions.userId }).from(sessions).orderBy(sessions.createdAt).limit(1);
    const me = await (await get(auth.me, cookie)).json();
    await db.update(users).set({ status: "suspended" }).where(eq(users.id, me.data.id));
    expect(row).toBeDefined();
    expect((await get(auth.me, cookie)).status).toBe(401);
  });
});

describe("access policy (Q25)", () => {
  async function activeAccount() {
    const { body } = await startChallenge(`policy-${crypto.randomUUID()}@example.test`);
    const response = await post(auth.verify, { challengeId: body.data.challengeId, code: lastCode() });
    expect(response.status).toBe(200);
    return { userId: (await response.json()).data.id as string, cookie: cookieFrom(response) };
  }

  it("rechecks group scope, role and active membership while the same session remains valid", async () => {
    const { userId, cookie } = await activeAccount();
    const [group, otherGroup] = await db.insert(groups).values([
      { name: "گروه نمونه", scope: "public", createdBy: userId },
      { name: "گروه دیگر نمونه", scope: "public", createdBy: userId },
    ]).returning({ id: groups.id });
    const [membership] = await db.insert(groupMemberships).values({
      groupId: group!.id, userId, role: "admin", status: "active",
    }).returning({ id: groupMemberships.id });

    await expect(requireGroupRole(db, userId, group!.id, ["admin"])).resolves.toBeUndefined();
    await expect(requireGroupRole(db, userId, otherGroup!.id, ["admin"])).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.update(groupMemberships).set({ role: "member" }).where(eq(groupMemberships.id, membership!.id));
    await expect(requireGroupRole(db, userId, group!.id, ["admin"])).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(requireGroupRole(db, userId, group!.id, ["member"])).resolves.toBeUndefined();
    await db.update(groupMemberships).set({ status: "removed" }).where(eq(groupMemberships.id, membership!.id));
    await expect(requireGroupRole(db, userId, group!.id, ["member"])).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await auth.me(new Request(`${ORIGIN}/api/v1/me`, { headers: { cookie } }))).status).toBe(200);
  });

  it("returns only the owner's credential status and denies expired and revoked credentials", async () => {
    const actor = await activeAccount();
    const reviewer = await activeAccount();
    const evidenceMediaId = crypto.randomUUID();
    const [credential] = await db.insert(professionalCredentials).values({
      userId: actor.userId,
      profession: "veterinarian",
      status: "verified",
      evidenceMediaId,
      verifiedBy: reviewer.userId,
      verifiedAt: clock,
      expiresAt: new Date(clock.getTime() + 60_000),
    }).returning({ id: professionalCredentials.id });
    expect((await auth.getCredentials(new Request(`${ORIGIN}/api/v1/me/credentials`))).status).toBe(401);
    const own = await auth.getCredentials(new Request(`${ORIGIN}/api/v1/me/credentials`, { headers: { cookie: actor.cookie } }));
    expect(own.headers.get("cache-control")).toBe("no-store");
    expect((await own.json()).data).toEqual([{
      id: credential!.id,
      profession: "veterinarian",
      status: "verified",
      expiresAt: new Date(clock.getTime() + 60_000).toISOString(),
    }]);
    const other = await auth.getCredentials(new Request(`${ORIGIN}/api/v1/me/credentials`, { headers: { cookie: reviewer.cookie } }));
    expect((await other.json()).data).toEqual([]);
    await expect(requireProfessionalCredential(db, actor.userId, "counselor", clock)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(requireProfessionalCredential(db, actor.userId, "veterinarian", clock)).resolves.toBe(credential!.id);
    clock = new Date(clock.getTime() + 60_000);
    await expect(requireProfessionalCredential(db, actor.userId, "veterinarian", clock)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const expired = await auth.getCredentials(new Request(`${ORIGIN}/api/v1/me/credentials`, { headers: { cookie: actor.cookie } }));
    expect((await expired.json()).data[0].status).toBe("expired");

    await db.update(professionalCredentials).set({ status: "revoked", expiresAt: null }).where(eq(professionalCredentials.id, credential!.id));
    await expect(requireProfessionalCredential(db, actor.userId, "veterinarian", clock)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
