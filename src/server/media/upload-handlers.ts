import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Uuid } from "@/shared/contracts/common";
import { MAX_IMAGE_BYTES, UploadIntentRequest } from "@/shared/contracts/uploads";
import { authHandlers } from "../auth/handlers";
import type { SessionUser } from "../auth/auth-service";
import { getDb, type Db } from "../db/client";
import { media } from "../db/schema";
import { serverEnv } from "../env";
import { ApiError } from "../http/api-error";
import { decodeCursor, encodeCursor } from "../http/cursor";
import { noContent, ok, parseJson, withApi } from "../http/respond";
import { enforceRate } from "../rate-limit";
import { getRedis } from "../redis";
import { sanitizeImage } from "./image";
import { getMediaStorage, type MediaStorage } from "./storage";

const TTL_MS = 5 * 60_000;
const UPLOAD_RATE = { name: "media-upload", limit: 60, windowSec: 600 };
const quarantineKey = (id: string) => "quarantine/images/" + id;
const readyKey = (id: string) => "ready/images/" + id + ".jpg";
type Params = { id: string };
type Dependencies = {
  db: () => Db;
  storage: () => MediaStorage;
  session: (request: Request) => Promise<SessionUser>;
  secret: () => string;
  now: () => Date;
  rateLimit: (ownerId: string) => Promise<void>;
};

async function readUpload(request: Request, expected: number) {
  const declared = request.headers.get("content-length");
  if (declared !== null && declared !== String(expected)) throw new ApiError("VALIDATION_FAILED");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("VALIDATION_FAILED");
  const storage = Buffer.alloc(expected);
  let offset = 0;
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => {});
  }, 15_000);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength > expected - offset) {
        void reader.cancel().catch(() => {});
        throw new ApiError("VALIDATION_FAILED", { message: "اندازهٔ عکس با درخواست هم‌خوانی ندارد." });
      }
      storage.set(value, offset);
      offset += value.byteLength;
    }
  } finally {
    clearTimeout(timeout);
    reader.releaseLock();
  }
  if (timedOut || offset !== expected) throw new ApiError("VALIDATION_FAILED", { message: "اندازهٔ عکس با درخواست هم‌خوانی ندارد." });
  return storage;
}

export function createUploadHandlers(deps: Dependencies) {
  async function actor(request: Request) {
    const session = await deps.session(request);
    if (session.status !== "active") throw new ApiError("FORBIDDEN");
    return session.userId;
  }
  function idFrom(params: Params) {
    const result = Uuid.safeParse(params.id);
    if (!result.success) throw new ApiError("NOT_FOUND");
    return result.data;
  }
  function issue(id: string, purpose: "upload" | "download") {
    const expires = deps.now().getTime() + TTL_MS;
    const token = encodeCursor({ id, sortKey: purpose + ":" + expires }, "media:" + deps.secret());
    return { token, expiresAt: new Date(expires).toISOString() };
  }
  function check(request: Request, id: string, purpose: "upload" | "download") {
    const token = new URL(request.url).searchParams.get("token");
    if (!token || token.length > 512) throw new ApiError("FORBIDDEN");
    try {
      const value = decodeCursor(token, "media:" + deps.secret());
      const [action, expires] = value.sortKey.split(":");
      if (value.id !== id || action !== purpose || !(Number(expires) > deps.now().getTime())) throw new Error();
    } catch {
      throw new ApiError("FORBIDDEN");
    }
  }
  const owned = (id: string, userId: string) => and(eq(media.id, id), eq(media.ownerId, userId));

  return {
    intent: withApi(async (request, ctx) => {
      const ownerId = await actor(request);
      const input = await parseJson(request, UploadIntentRequest);
      await deps.rateLimit(ownerId);
      deps.storage();
      const id = randomUUID();
      const { token, expiresAt } = issue(id, "upload");
      await deps.db().insert(media).values({ id, ownerId, storageKey: quarantineKey(id), mime: input.type, sizeBytes: input.size });
      return ok(ctx, { id, uploadUrl: "/api/v1/uploads/" + id + "/content?token=" + token, expiresAt }, { status: 201 });
    }),
    upload: withApi<Params>(async (request, ctx) => {
      const ownerId = await actor(request);
      const id = idFrom(ctx.params);
      check(request, id, "upload");
      const [pending] = await deps.db().select().from(media).where(owned(id, ownerId));
      if (!pending || pending.storageKey !== quarantineKey(id)) throw new ApiError("NOT_FOUND");
      if (pending.status !== "quarantine") throw new ApiError("CONFLICT");
      if (pending.sizeBytes > MAX_IMAGE_BYTES || request.headers.get("content-type") !== pending.mime) {
        throw new ApiError("VALIDATION_FAILED");
      }
      await deps.rateLimit(ownerId);
      const bytes = await readUpload(request, pending.sizeBytes);
      await deps.db().transaction(async (tx) => {
        const [current] = await tx.select({ status: media.status }).from(media).where(owned(id, ownerId)).for("update");
        if (current?.status !== "quarantine") throw new ApiError("CONFLICT");
        await deps.storage().write(quarantineKey(id), bytes, pending.mime);
      });
      return noContent(ctx);
    }),
    complete: withApi<Params>(async (request, ctx) => {
      const ownerId = await actor(request);
      const id = idFrom(ctx.params);
      await deps.rateLimit(ownerId);
      const result = await deps.db().transaction(async (tx) => {
        const [row] = await tx.select().from(media).where(owned(id, ownerId)).for("update");
        if (!row || ![quarantineKey(id), readyKey(id)].includes(row.storageKey)) throw new ApiError("NOT_FOUND");
        if (row.status === "ready") return row.sizeBytes;
        if (row.status === "rejected") return null;
        if (row.status !== "quarantine") throw new ApiError("CONFLICT");
        const quarantine = await deps.storage().read(quarantineKey(id), row.sizeBytes);
        if (!quarantine) throw new ApiError("CONFLICT", { message: "فایل هنوز بارگذاری نشده است." });
        let sanitized: Uint8Array;
        try {
          if (quarantine.byteLength !== row.sizeBytes) throw new ApiError("VALIDATION_FAILED");
          sanitized = await sanitizeImage(quarantine, row.mime);
        } catch {
          await tx.update(media).set({ status: "rejected" }).where(owned(id, ownerId));
          return null;
        }
        await deps.storage().write(readyKey(id), sanitized, "image/jpeg");
        await tx.update(media).set({
          storageKey: readyKey(id), mime: "image/jpeg", sizeBytes: sanitized.byteLength,
          status: "ready", checksumSha256: createHash("sha256").update(sanitized).digest("hex"),
        }).where(owned(id, ownerId));
        return sanitized.byteLength;
      });
      await deps.storage().remove(quarantineKey(id)).catch(() => console.error("[media cleanup]", ctx.requestId));
      if (result === null) throw new ApiError("VALIDATION_FAILED", { message: "محتوا، ابعاد یا نوع عکس معتبر نیست." });
      return ok(ctx, { id, status: "ready", mime: "image/jpeg", size: result });
    }),
    signRead: withApi<Params>(async (request, ctx) => {
      const ownerId = await actor(request);
      const id = idFrom(ctx.params);
      const [image] = await deps.db().select({ id: media.id }).from(media).where(and(
        owned(id, ownerId), eq(media.status, "ready"), eq(media.storageKey, readyKey(id)),
      ));
      if (!image) throw new ApiError("NOT_FOUND");
      const { token, expiresAt } = issue(id, "download");
      return ok(ctx, { downloadUrl: "/api/v1/uploads/" + id + "/content?token=" + token, expiresAt });
    }),
    read: withApi<Params>(async (request, ctx) => {
      const ownerId = await actor(request);
      const id = idFrom(ctx.params);
      check(request, id, "download");
      const [image] = await deps.db().select({ size: media.sizeBytes }).from(media).where(and(
        owned(id, ownerId), eq(media.status, "ready"), eq(media.storageKey, readyKey(id)),
      ));
      if (!image) throw new ApiError("NOT_FOUND");
      const bytes = await deps.storage().read(readyKey(id), image.size);
      if (!bytes || bytes.byteLength !== image.size) throw new ApiError("SERVICE_UNAVAILABLE");
      return new Response(new Uint8Array(bytes), { headers: {
        "Content-Type": "image/jpeg", "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff", "x-request-id": ctx.requestId,
      } });
    }),
  };
}

export const uploadHandlers = createUploadHandlers({
  db: getDb, storage: getMediaStorage, now: () => new Date(),
  secret: () => serverEnv().CURSOR_SECRET,
  rateLimit: (ownerId) => enforceRate(getRedis(serverEnv().REDIS_URL), UPLOAD_RATE, ownerId),
  session: (request) => authHandlers().requireSession(request),
});
