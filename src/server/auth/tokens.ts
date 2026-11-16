import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** Six-digit code from a CSPRNG, zero-padded. */
export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** The code is bound to its challenge id, so a hash leak cannot be replayed on another challenge. */
export function hashCode(secret: string, challengeId: string, code: string): string {
  return createHmac("sha256", secret).update(`${challengeId}:${code}`).digest("base64url");
}

export function codeMatches(secret: string, challengeId: string, code: string, storedHash: string): boolean {
  const given = Buffer.from(hashCode(secret, challengeId, code));
  const stored = Buffer.from(storedHash);
  return given.length === stored.length && timingSafeEqual(given, stored);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

/** Rate-limit subjects never store the raw email. */
export function subjectHash(value: string): string {
  return createHash("sha256").update(value).digest("base64url").slice(0, 32);
}
