import { AuthChallengeRequest, AuthVerifyRequest } from "@/shared/contracts/auth";
import { getDb } from "../db/client";
import { createSmtpSender } from "../email/email-sender";
import { serverEnv } from "../env";
import { ApiError } from "../http/api-error";
import { noContent, ok, parseJson, withApi } from "../http/respond";
import { getRedis } from "../redis";
import { createChallenge, loadMe, resolveSession, revokeSessions, verifyChallenge, type AuthDeps, type SessionUser } from "./auth-service";
import { clearedSessionCookie, clientIp, readSessionToken, sessionCookie } from "./session-cookie";

export type AuthHandlerDeps = AuthDeps & { secureCookies: boolean };

/** Route handlers for /api/v1/auth/* and /me; deps are injected so tests use the test DB and a capturing mailer. */
export function createAuthHandlers(deps: AuthHandlerDeps) {
  async function requireSession(request: Request): Promise<SessionUser> {
    const session = await resolveSession(deps, readSessionToken(request));
    if (!session) throw new ApiError("UNAUTHENTICATED");
    return session;
  }

  return {
    challenge: withApi(async (request, ctx) => {
      const input = await parseJson(request, AuthChallengeRequest);
      const result = await createChallenge(deps, input, clientIp(request));
      return ok(ctx, result, { status: 201 });
    }),

    verify: withApi(async (request, ctx) => {
      const input = await parseJson(request, AuthVerifyRequest);
      const { token, me } = await verifyChallenge(deps, input, { ip: clientIp(request), userAgent: request.headers.get("user-agent") });
      const response = ok(ctx, me);
      response.headers.append("Set-Cookie", sessionCookie(token, deps.secureCookies));
      return response;
    }),

    logout: withApi(async (request, ctx) => {
      const session = await resolveSession(deps, readSessionToken(request));
      if (session) await revokeSessions(deps, session, new URL(request.url).searchParams.get("all") === "1" ? "all" : "current");
      const response = noContent(ctx);
      response.headers.append("Set-Cookie", clearedSessionCookie(deps.secureCookies));
      return response;
    }),

    me: withApi(async (request, ctx) => {
      const session = await requireSession(request);
      const me = await loadMe(deps.db, session.userId);
      if (!me) throw new ApiError("UNAUTHENTICATED");
      return ok(ctx, me);
    }),

    requireSession,
  };
}

let defaultHandlers: ReturnType<typeof createAuthHandlers> | undefined;

/** Production wiring from the validated environment. */
export function authHandlers() {
  if (!defaultHandlers) {
    const env = serverEnv();
    defaultHandlers = createAuthHandlers({
      db: getDb(),
      redis: getRedis(env.REDIS_URL),
      email: createSmtpSender(env.EMAIL_SMTP_URL, env.EMAIL_FROM),
      secret: env.AUTH_SECRET,
      now: () => new Date(),
      secureCookies: env.APP_ORIGIN.startsWith("https://"),
    });
  }
  return defaultHandlers;
}
