import { SESSION_TTL_DAYS } from "./auth-service";

export const SESSION_COOKIE = "catbuzz_session";

/** HttpOnly, SameSite=Lax, Secure outside local http (docs/09). */
export function sessionCookie(token: string, secure: boolean): string {
  return [`${SESSION_COOKIE}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${SESSION_TTL_DAYS * 86_400}`, ...(secure ? ["Secure"] : [])].join("; ");
}

export function clearedSessionCookie(secure: boolean): string {
  return [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0", ...(secure ? ["Secure"] : [])].join("; ");
}

export function readSessionToken(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=") || null;
  }
  return null;
}

/** Client IP for rate limiting: first X-Forwarded-For hop (set by the reverse proxy), else a fixed local key. */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
