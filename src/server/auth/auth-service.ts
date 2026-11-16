import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import type { Redis } from "ioredis";
import type { z } from "zod";
import type { AuthChallengeRequest, AuthVerifyRequest } from "@/shared/contracts/auth";
import type { MeDto } from "@/shared/contracts/users";
import type { Db } from "../db/client";
import { authChallenges, sessions, userPrivate, users } from "../db/schema";
import { activationEmail, EmailNotConfiguredError, type EmailSender } from "../email/email-sender";
import { ApiError } from "../http/api-error";
import { enforceRate, type RateRule } from "../rate-limit";
import { codeMatches, generateCode, generateSessionToken, hashCode, hashToken, subjectHash } from "./tokens";

export type AuthDeps = {
  db: Db;
  redis: Redis;
  email: EmailSender;
  secret: string;
  now: () => Date;
};

export const CHALLENGE_TTL_MIN = 10;
export const CHALLENGE_MAX_ATTEMPTS = 5;
export const SESSION_TTL_DAYS = 30;

export const RATE = {
  challengePerContact: { name: "otp-contact", limit: 3, windowSec: 15 * 60 },
  challengePerIp: { name: "otp-ip", limit: 20, windowSec: 15 * 60 },
  verifyPerIp: { name: "verify-ip", limit: 30, windowSec: 15 * 60 },
} satisfies Record<string, RateRule>;

const EXPIRED_MESSAGE = "این کد دیگر معتبر نیست. کد تازه بگیرید.";

/**
 * Starts sign-up or sign-in. The answer is identical whether or not an account exists,
 * so the endpoint cannot be used to discover users (Q01).
 */
export async function createChallenge(deps: AuthDeps, input: z.output<typeof AuthChallengeRequest>, ip: string) {
  const contact = input.contact.value;
  await enforceRate(deps.redis, RATE.challengePerIp, ip);
  await enforceRate(deps.redis, RATE.challengePerContact, subjectHash(contact));

  const code = generateCode();
  const expiresAt = new Date(deps.now().getTime() + CHALLENGE_TTL_MIN * 60_000);
  const challengeId = crypto.randomUUID();
  await deps.db.insert(authChallenges).values({
    id: challengeId,
    purpose: input.purpose,
    contactValue: contact,
    codeHash: hashCode(deps.secret, challengeId, code),
    maxAttempts: CHALLENGE_MAX_ATTEMPTS,
    expiresAt,
  });

  try {
    await deps.email.send({ to: contact, ...activationEmail(code, input.purpose, CHALLENGE_TTL_MIN) });
  } catch (error) {
    // Undeliverable code: the challenge must not be usable, and the user is told the truth.
    await deps.db.update(authChallenges).set({ consumedAt: deps.now() }).where(eq(authChallenges.id, challengeId));
    if (error instanceof EmailNotConfiguredError) {
      throw new ApiError("SERVICE_UNAVAILABLE", { message: "ارسال ایمیل هنوز راه‌اندازی نشده است." });
    }
    throw new ApiError("SERVICE_UNAVAILABLE", { message: "ارسال ایمیل انجام نشد. کمی بعد دوباره تلاش کنید." });
  }

  return { challengeId, expiresAt: expiresAt.toISOString() };
}

/** Verifies a code once, finds or creates the account and opens a session. */
export async function verifyChallenge(deps: AuthDeps, input: z.output<typeof AuthVerifyRequest>, meta: { ip: string; userAgent: string | null }) {
  await enforceRate(deps.redis, RATE.verifyPerIp, meta.ip);
  const now = deps.now();

  // Count the attempt atomically before comparing, so parallel guesses cannot exceed the limit.
  const [attempt] = await deps.db
    .update(authChallenges)
    .set({ attempts: sql`${authChallenges.attempts} + 1` })
    .where(
      and(
        eq(authChallenges.id, input.challengeId),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
        lt(authChallenges.attempts, authChallenges.maxAttempts),
      ),
    )
    .returning({ codeHash: authChallenges.codeHash, contactValue: authChallenges.contactValue, attempts: authChallenges.attempts, maxAttempts: authChallenges.maxAttempts });

  if (!attempt) throw new ApiError("VALIDATION_FAILED", { message: EXPIRED_MESSAGE, fieldErrors: { code: [EXPIRED_MESSAGE] } });

  if (!codeMatches(deps.secret, input.challengeId, input.code, attempt.codeHash)) {
    const left = attempt.maxAttempts - attempt.attempts;
    const message = left > 0 ? `کد نادرست است. ${left} بار دیگر می‌توانید تلاش کنید.` : EXPIRED_MESSAGE;
    throw new ApiError("VALIDATION_FAILED", { message, fieldErrors: { code: [message] } });
  }

  const [consumed] = await deps.db
    .update(authChallenges)
    .set({ consumedAt: now })
    .where(and(eq(authChallenges.id, input.challengeId), isNull(authChallenges.consumedAt)))
    .returning({ id: authChallenges.id });
  if (!consumed) throw new ApiError("VALIDATION_FAILED", { message: EXPIRED_MESSAGE, fieldErrors: { code: [EXPIRED_MESSAGE] } });

  const userId = await findOrCreateUserByEmail(deps.db, attempt.contactValue);
  const token = generateSessionToken();
  await deps.db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
    expiresAt: new Date(now.getTime() + SESSION_TTL_DAYS * 86_400_000),
  });
  const me = await loadMe(deps.db, userId);
  return { token, me: me! };
}

async function findOrCreateUserByEmail(db: Db, email: string): Promise<string> {
  const existing = await db
    .select({ userId: userPrivate.userId })
    .from(userPrivate)
    .where(sql`lower(${userPrivate.verifiedEmail}) = ${email.toLowerCase()}`);
  if (existing[0]) {
    await db.update(users).set({ status: "active" }).where(and(eq(users.id, existing[0].userId), eq(users.status, "pending_activation")));
    return existing[0].userId;
  }
  try {
    return await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({ status: "active" }).returning({ id: users.id });
      await tx.insert(userPrivate).values({ userId: user!.id, verifiedEmail: email });
      return user!.id;
    });
  } catch (error) {
    // A parallel verification for the same email won the unique index; use its account.
    const raced = await db
      .select({ userId: userPrivate.userId })
      .from(userPrivate)
      .where(sql`lower(${userPrivate.verifiedEmail}) = ${email.toLowerCase()}`);
    if (raced[0]) return raced[0].userId;
    throw error;
  }
}

export async function loadMe(db: Db, userId: string): Promise<z.output<typeof MeDto> | null> {
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      status: users.status,
      version: users.version,
      firstName: userPrivate.firstName,
      lastName: userPrivate.lastName,
      email: userPrivate.verifiedEmail,
    })
    .from(users)
    .leftJoin(userPrivate, eq(userPrivate.userId, users.id))
    .where(eq(users.id, userId));
  if (!row || row.status === "deleted") return null;
  return {
    id: row.id,
    username: row.username,
    status: row.status,
    firstName: row.firstName,
    lastName: row.lastName,
    verifiedContact: row.email ? { kind: "email", value: row.email } : null,
    version: row.version,
  };
}

export type SessionUser = { sessionId: string; userId: string; status: "pending_activation" | "active" | "suspended" | "deleted" };

/** Resolves a cookie token to a live session. Suspended or deleted accounts have no usable session. */
export async function resolveSession(deps: Pick<AuthDeps, "db" | "now">, token: string | null): Promise<SessionUser | null> {
  if (!token) return null;
  const now = deps.now();
  const [row] = await deps.db
    .select({ sessionId: sessions.id, userId: sessions.userId, status: users.status, lastSeenAt: sessions.lastSeenAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)));
  if (!row || row.status === "suspended" || row.status === "deleted") return null;
  if (now.getTime() - row.lastSeenAt.getTime() > 3_600_000) {
    await deps.db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, row.sessionId));
  }
  return { sessionId: row.sessionId, userId: row.userId, status: row.status };
}

export async function revokeSessions(deps: Pick<AuthDeps, "db" | "now">, session: SessionUser, scope: "current" | "all") {
  const where = scope === "all" ? and(eq(sessions.userId, session.userId), isNull(sessions.revokedAt)) : eq(sessions.id, session.sessionId);
  await deps.db.update(sessions).set({ revokedAt: deps.now() }).where(where);
}
