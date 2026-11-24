import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { Uuid } from "@/shared/contracts/common";
import { HelpRequestInput, ResolveHelpInput, TriageInput } from "@/shared/contracts/help";
import { authHandlers } from "../auth/handlers";
import type { SessionUser } from "../auth/auth-service";
import { getDb, type Db } from "../db/client";
import { auditLogs, cats, colonies, helpEvidence, helpRequests, media, outboxEvents, users } from "../db/schema";
import { serverEnv } from "../env";
import { ApiError } from "../http/api-error";
import { ok, parseJson, withApi } from "../http/respond";
import { enforceRate } from "../rate-limit";
import { getRedis } from "../redis";
import { getMediaStorage } from "../media/storage";

type Params = { id: string };
type Dependencies = {
  db: () => Db;
  session: (request: Request) => Promise<SessionUser>;
  reviewer: (id: string) => boolean;
  now: () => Date;
  storage: typeof getMediaStorage;
  rateLimit: (actor: string) => Promise<void>;
};
type Report = typeof helpRequests.$inferSelect;
type ReadDb = Pick<Db, "select">;

function idFrom(value: string) {
  const parsed = Uuid.safeParse(value);
  if (!parsed.success) throw new ApiError("NOT_FOUND");
  return parsed.data;
}

async function reportDto(db: ReadDb, row: Report) {
  const evidence = await db.select({ id: helpEvidence.mediaId }).from(helpEvidence)
    .where(eq(helpEvidence.reportId, row.id)).orderBy(helpEvidence.mediaId);
  return {
    id: row.id, catId: row.catId, colonyId: row.colonyId, needType: row.needType,
    urgency: row.urgency, status: row.status, description: row.description, ownerId: row.triageOwnerId,
    deadlineAt: row.deadlineAt, resolvedAt: row.resolvedAt, response: row.resolutionNote,
    version: row.version, createdAt: row.createdAt, evidenceIds: evidence.map(({ id }) => id),
  };
}

export function createHelpHandlers(deps: Dependencies) {
  async function active(request: Request) {
    const actor = await deps.session(request);
    if (actor.status !== "active") throw new ApiError("FORBIDDEN");
    return actor.userId;
  }
  const canRead = (report: Report, actor: string) =>
    report.reporterId === actor || deps.reviewer(actor);

  return {
    list: withApi(async (request, ctx) => {
      const actor = await active(request);
      const db = deps.db();
      const rows = await db.select().from(helpRequests)
        .where(deps.reviewer(actor)
          ? inArray(helpRequests.status, ["open", "triaged", "in_progress"])
          : eq(helpRequests.reporterId, actor))
        .orderBy(desc(helpRequests.urgency), desc(helpRequests.createdAt), desc(helpRequests.id)).limit(50);
      const evidence = rows.length ? await db.select().from(helpEvidence)
        .where(inArray(helpEvidence.reportId, rows.map(({ id }) => id))).orderBy(helpEvidence.mediaId) : [];
      return ok(ctx, rows.map((row) => ({
        id: row.id, catId: row.catId, colonyId: row.colonyId, needType: row.needType, urgency: row.urgency,
        status: row.status, description: row.description, ownerId: row.triageOwnerId, deadlineAt: row.deadlineAt,
        resolvedAt: row.resolvedAt, response: row.resolutionNote, version: row.version, createdAt: row.createdAt,
        evidenceIds: evidence.filter((item) => item.reportId === row.id).map((item) => item.mediaId),
      })));
    }),
    get: withApi<Params>(async (request, ctx) => {
      const actor = await active(request);
      const db = deps.db();
      const [row] = await db.select().from(helpRequests).where(eq(helpRequests.id, idFrom(ctx.params.id)));
      if (!row || !canRead(row, actor)) throw new ApiError("NOT_FOUND");
      return ok(ctx, await reportDto(db, row));
    }),
    create: withApi(async (request, ctx) => {
      const actor = await active(request);
      const input = await parseJson(request, HelpRequestInput);
      await deps.rateLimit(actor);
      const now = deps.now();
      const report = await deps.db().transaction(async (tx) => {
        if (input.target.kind === "cat") {
          const [item] = await tx.select({ owner: cats.ownerUserId, custody: cats.custody }).from(cats)
            .where(and(eq(cats.id, input.target.id), isNull(cats.archivedAt), eq(cats.lifecycle, "active"))).for("share");
          if (!item || (item.custody === "owned" && item.owner !== actor)) throw new ApiError("NOT_FOUND");
        } else {
          const [item] = await tx.select({ id: colonies.id }).from(colonies)
            .where(and(eq(colonies.id, input.target.id), isNull(colonies.archivedAt))).for("share");
          if (!item) throw new ApiError("NOT_FOUND");
        }
        const ids = [...new Set(input.evidenceIds)];
        if (ids.length) {
          const ready = await tx.select({ id: media.id, key: media.storageKey }).from(media)
            .where(and(inArray(media.id, ids), eq(media.ownerId, actor), eq(media.status, "ready"),
              eq(media.visibility, "private"), eq(media.mime, "image/jpeg"))).orderBy(media.id).for("share");
          if (ready.length !== ids.length || ready.some(({ id, key }) => key !== "ready/images/" + id + ".jpg")) {
            throw new ApiError("VALIDATION_FAILED", { fieldErrors: { evidenceIds: ["شواهد باید عکس خصوصی آماده و متعلق به شما باشند."] } });
          }
        }
        const [row] = await tx.insert(helpRequests).values({
          catId: input.target.kind === "cat" ? input.target.id : null,
          colonyId: input.target.kind === "colony" ? input.target.id : null,
          reporterId: actor, needType: input.needType, urgency: input.urgency, description: input.description,
          createdAt: now,
        }).returning();
        if (ids.length) await tx.insert(helpEvidence).values(ids.map((mediaId) => ({ reportId: row!.id, mediaId })));
        await tx.insert(outboxEvents).values({ type: "help.reported", aggregateId: row!.id, payload: { urgency: input.urgency } });
        return reportDto(tx, row!);
      });
      return ok(ctx, report, { status: 201 });
    }),
    triage: withApi<Params>(async (request, ctx) => {
      const actor = await active(request);
      if (!deps.reviewer(actor)) throw new ApiError("FORBIDDEN");
      const id = idFrom(ctx.params.id);
      const input = await parseJson(request, TriageInput);
      const now = deps.now();
      const deadlineAt = new Date(input.deadlineAt);
      if (deadlineAt <= now) throw new ApiError("VALIDATION_FAILED", { fieldErrors: { deadlineAt: ["مهلت باید در آینده باشد."] } });
      if (!deps.reviewer(input.ownerId)) throw new ApiError("FORBIDDEN");
      return ok(ctx, await deps.db().transaction(async (tx) => {
        const [owner] = await tx.select({ id: users.id }).from(users)
          .where(and(eq(users.id, input.ownerId), eq(users.status, "active"))).for("share");
        if (!owner) throw new ApiError("NOT_FOUND");
        const [row] = await tx.select().from(helpRequests).where(eq(helpRequests.id, id)).for("update");
        if (!row) throw new ApiError("NOT_FOUND");
        if (row.version !== input.version) throw new ApiError("VERSION_CONFLICT");
        if (!["open", "triaged", "in_progress"].includes(row.status)) throw new ApiError("CONFLICT");
        const [updated] = await tx.update(helpRequests).set({
          urgency: input.urgency, triageOwnerId: input.ownerId, deadlineAt,
          status: row.status === "in_progress" ? "in_progress" : "triaged", version: row.version + 1,
        }).where(eq(helpRequests.id, id)).returning();
        await tx.insert(auditLogs).values({ actorId: actor, action: "help.triage", resourceKind: "help_request", resourceId: id,
          requestId: ctx.requestId, occurredAt: now, changes: { urgency: input.urgency, ownerId: input.ownerId, deadlineAt: deadlineAt.toISOString() } });
        await tx.insert(outboxEvents).values({ type: "help.triaged", aggregateId: id, payload: { deadlineAt: deadlineAt.toISOString() } });
        return reportDto(tx, updated!);
      }));
    }),
    resolve: withApi<Params>(async (request, ctx) => {
      const actor = await active(request);
      if (!deps.reviewer(actor)) throw new ApiError("FORBIDDEN");
      const id = idFrom(ctx.params.id);
      const input = await parseJson(request, ResolveHelpInput);
      const now = deps.now();
      return ok(ctx, await deps.db().transaction(async (tx) => {
        const [row] = await tx.select().from(helpRequests).where(eq(helpRequests.id, id)).for("update");
        if (!row) throw new ApiError("NOT_FOUND");
        if (row.triageOwnerId !== actor) throw new ApiError("FORBIDDEN");
        if (row.version !== input.version) throw new ApiError("VERSION_CONFLICT");
        if (row.status !== "triaged" && row.status !== "in_progress") throw new ApiError("CONFLICT");
        const [updated] = await tx.update(helpRequests).set({
          status: "resolved", resolvedAt: now, resolutionNote: input.response, version: row.version + 1,
        }).where(eq(helpRequests.id, id)).returning();
        await tx.insert(auditLogs).values({ actorId: actor, action: "help.resolve", resourceKind: "help_request", resourceId: id,
          requestId: ctx.requestId, occurredAt: now, changes: { from: row.status, to: "resolved" } });
        await tx.insert(outboxEvents).values({ type: "help.resolved", aggregateId: id });
        return reportDto(tx, updated!);
      }));
    }),
    evidence: withApi<{ id: string; mediaId: string }>(async (request, ctx) => {
      const actor = await active(request);
      const id = idFrom(ctx.params.id);
      const mediaId = idFrom(ctx.params.mediaId);
      const db = deps.db();
      const [row] = await db.select().from(helpRequests).where(eq(helpRequests.id, id));
      if (!row || !canRead(row, actor)) throw new ApiError("NOT_FOUND");
      const [item] = await db.select({ key: media.storageKey, size: media.sizeBytes }).from(helpEvidence)
        .innerJoin(media, eq(media.id, helpEvidence.mediaId)).where(and(eq(helpEvidence.reportId, id), eq(helpEvidence.mediaId, mediaId),
          eq(media.status, "ready"), eq(media.storageKey, "ready/images/" + mediaId + ".jpg")));
      if (!item) throw new ApiError("NOT_FOUND");
      const bytes = await deps.storage().read(item.key, item.size);
      if (!bytes || bytes.byteLength !== item.size) throw new ApiError("SERVICE_UNAVAILABLE");
      return new Response(new Uint8Array(bytes), { headers: {
        "Content-Type": "image/jpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      } });
    }),
  };
}

export const helpHandlers = createHelpHandlers({
  db: getDb, session: (request) => authHandlers().requireSession(request),
  reviewer: (id) => serverEnv().TRIAGE_REVIEWER_IDS.has(id), now: () => new Date(), storage: getMediaStorage,
  rateLimit: (actor) => enforceRate(getRedis(serverEnv().REDIS_URL), { name: "help-report", limit: 20, windowSec: 600 }, actor),
});
