import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "./api-error";

/**
 * Opaque, signed keyset cursor (docs/07). It carries only the sort key and the row id as
 * tie-breaker, never names or locations, and the HMAC rejects tampered or foreign cursors.
 */
export type CursorPosition = { sortKey: string; id: string };

const SIGNATURE_BYTES = 16;

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest().subarray(0, SIGNATURE_BYTES);
}

export function encodeCursor(position: CursorPosition, secret: string): string {
  const payload = Buffer.from(JSON.stringify([position.sortKey, position.id])).toString("base64url");
  return `${payload}.${sign(payload, secret).toString("base64url")}`;
}

export function decodeCursor(cursor: string, secret: string): CursorPosition {
  const invalid = () => new ApiError("INVALID_CURSOR", { fieldErrors: { cursor: ["cursor نامعتبر است."] } });
  const [payload, signature, extra] = cursor.split(".");
  if (!payload || !signature || extra !== undefined) throw invalid();

  const expected = sign(payload, secret);
  const given = Buffer.from(signature, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw invalid();

  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (Array.isArray(parsed) && parsed.length === 2 && parsed.every((v) => typeof v === "string")) {
      return { sortKey: parsed[0] as string, id: parsed[1] as string };
    }
  } catch {
    // fall through
  }
  throw invalid();
}
