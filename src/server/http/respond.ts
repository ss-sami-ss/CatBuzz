import { z } from "zod";
import { API_ERRORS, type ErrorEnvelope } from "@/shared/contracts/errors";
import { ApiError } from "./api-error";

z.config(z.locales.fa());

const NO_STORE = { "Cache-Control": "no-store" };

export type ApiContext = { requestId: string };

export function requestIdFrom(request: Request): string {
  const incoming = request.headers.get("x-request-id");
  return incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
}

export function ok<T>(ctx: ApiContext, data: T, options: { status?: 200 | 201; nextCursor?: string | null; cache?: "no-store" | "public" } = {}) {
  const meta = options.nextCursor === undefined ? { requestId: ctx.requestId } : { requestId: ctx.requestId, nextCursor: options.nextCursor };
  return Response.json(
    { data, meta },
    { status: options.status ?? 200, headers: { "x-request-id": ctx.requestId, ...(options.cache === "public" ? {} : NO_STORE) } },
  );
}

export function noContent(ctx: ApiContext) {
  return new Response(null, { status: 204, headers: { "x-request-id": ctx.requestId } });
}

export function errorResponse(ctx: ApiContext, error: ApiError) {
  const body: ErrorEnvelope = {
    error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors },
    requestId: ctx.requestId,
  };
  const headers: Record<string, string> = { "x-request-id": ctx.requestId, ...NO_STORE };
  if ("retryAfterSec" in error) headers["Retry-After"] = String(error.retryAfterSec);
  return Response.json(body, { status: error.status, headers });
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF guard for cookie-authenticated mutations (docs/09): when the session cookie is sent on a
 * state-changing request, the browser's Origin must be our own APP_ORIGIN.
 */
export function assertSameOrigin(request: Request) {
  if (SAFE_METHODS.has(request.method) || !request.headers.get("cookie")?.includes("catbuzz_session=")) return;
  const appOrigin = process.env.APP_ORIGIN;
  const origin = request.headers.get("origin");
  const sameSite = request.headers.get("sec-fetch-site") === "same-origin";
  if (origin ? origin !== appOrigin : !sameSite) {
    throw new ApiError("FORBIDDEN", { message: "درخواست از مبدأ نامعتبر رد شد." });
  }
}

/** Zod issues → {"a.b": ["پیام"]} with Persian messages from the fa locale. */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

export async function parseJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.output<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError("BAD_REQUEST", { message: "بدنهٔ درخواست JSON معتبر نیست." });
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new ApiError("VALIDATION_FAILED", { fieldErrors: toFieldErrors(result.error) });
  return result.data;
}

export function parseQuery<T extends z.ZodType>(request: Request, schema: T): z.output<T> {
  const query = Object.fromEntries(new URL(request.url).searchParams);
  const result = schema.safeParse(query);
  if (!result.success) throw new ApiError("VALIDATION_FAILED", { fieldErrors: toFieldErrors(result.error) });
  return result.data;
}

type Handler<P> = (request: Request, ctx: ApiContext & { params: P }) => Promise<Response> | Response;

/**
 * Wraps a route handler: request id, typed errors to the envelope, and no internal detail
 * leaking on unexpected failures (logged server-side with the request id).
 */
export function withApi<P = Record<string, never>>(handler: Handler<P>) {
  return async (request: Request, route?: { params?: Promise<P> }) => {
    const ctx = { requestId: requestIdFrom(request) };
    try {
      assertSameOrigin(request);
      const params = (route?.params ? await route.params : {}) as P;
      return await handler(request, { ...ctx, params });
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(ctx, error);
      console.error(`[api] ${ctx.requestId}`, error);
      return errorResponse(ctx, new ApiError("INTERNAL", { message: API_ERRORS.INTERNAL.message }));
    }
  };
}
