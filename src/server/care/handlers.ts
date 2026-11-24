import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { CareLogRequest, ConfirmHealthRequest, HealthReportRequest } from "@/shared/contracts/care";
import { Uuid } from "@/shared/contracts/common";
import { requireProfessionalCredential } from "../auth/access-policy";
import { authHandlers } from "../auth/handlers";
import type { SessionUser } from "../auth/auth-service";
import { getDb, type Db } from "../db/client";
import { assignments, auditLogs, careLogs, cats, healthRecords, helpRequests, missions } from "../db/schema";
import { ApiError } from "../http/api-error";
import { ok, parseJson, withApi } from "../http/respond";

type Params = { id: string };
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type ReadDb = Pick<Db, "select">;
type Dependencies = { db: () => Db; session: (request: Request) => Promise<SessionUser>; now: () => Date };
const medical = ["vaccination", "sterilization", "treatment", "medication", "observation", "other"] as const;

function routeId(params: Params) {
  const result = Uuid.safeParse(params.id);
  if (!result.success) throw new ApiError("NOT_FOUND");
  return result.data;
}

function date(value: string, now: Date) {
  const when = new Date(value);
  if (when > now) throw new ApiError("VALIDATION_FAILED", { fieldErrors: { occurredAt: ["تاریخ نباید در آینده باشد."] } });
  return when;
}

async function target(db: ReadDb, id: string) {
  const [cat] = await db.select({ ownerId: cats.ownerUserId, custody: cats.custody })
    .from(cats).where(and(eq(cats.id, id), isNull(cats.archivedAt)));
  if (!cat) throw new ApiError("NOT_FOUND");
  return cat;
}

async function assignedVet(db: ReadDb, actor: string, catId: string) {
  const [assignment] = await db.select({ id: assignments.id }).from(assignments)
    .innerJoin(missions, eq(missions.id, assignments.missionId))
    .innerJoin(helpRequests, eq(helpRequests.id, missions.helpRequestId))
    .where(and(eq(assignments.userId, actor), eq(assignments.status, "accepted"), isNull(assignments.endedAt),
      eq(missions.type, "vet_visit"), sql`${missions.status} in ('open', 'full', 'in_progress')`, eq(helpRequests.catId, catId),
    )).limit(1);
  return Boolean(assignment);
}

async function requireVet(db: Tx, actor: string, catId: string, now: Date) {
  await requireProfessionalCredential(db, actor, "veterinarian", now);
  if (!await assignedVet(db, actor, catId)) throw new ApiError("FORBIDDEN");
}

export function createCareHandlers(deps: Dependencies) {
  async function active(request: Request) {
    const actor = await deps.session(request);
    if (actor.status !== "active") throw new ApiError("FORBIDDEN");
    return actor.userId;
  }

  return {
    publicHealth: withApi<Params>(async (_request, ctx) => {
      const catId = routeId(ctx.params);
      const db = deps.db();
      const cat = await target(db, catId);
      if (cat.custody !== "street") throw new ApiError("NOT_FOUND");
      const rows = await db.select({
        id: healthRecords.id, category: healthRecords.category,
        day: sql<string>`to_char(${healthRecords.occurredAt} at time zone 'UTC', 'YYYY-MM-DD')`,
      }).from(healthRecords).where(and(
        eq(healthRecords.catId, catId), eq(healthRecords.visibility, "public_summary"),
        sql`${healthRecords.vetConfirmedAt} is not null`,
        sql`not exists (select 1 from health_records revision where revision.amends_record_id = health_records.id and revision.vet_confirmed_at is not null)`,
      )).orderBy(desc(healthRecords.occurredAt), desc(healthRecords.id)).limit(50);
      return ok(ctx, rows.filter((row) => medical.some((item) => item === row.category)).map((row) => ({ ...row, confirmed: true })));
    }),
    privateHealth: withApi<Params>(async (request, ctx) => {
      const actor = await active(request);
      const catId = routeId(ctx.params);
      const db = deps.db();
      const cat = await target(db, catId);
      let isVet = false;
      if (await assignedVet(db, actor, catId)) {
        try {
          await requireProfessionalCredential(db, actor, "veterinarian", deps.now());
          isVet = true;
        } catch (error) {
          if (!(error instanceof ApiError) || error.code !== "FORBIDDEN") throw error;
        }
      }
      if (cat.custody === "owned" && cat.ownerId !== actor && !isVet) throw new ApiError("NOT_FOUND");
      const filter = cat.ownerId === actor || isVet ? undefined : eq(healthRecords.authorId, actor);
      const records = await db.select({
        id: healthRecords.id, source: healthRecords.source, category: healthRecords.category,
        details: healthRecords.details, occurredAt: healthRecords.occurredAt,
        confirmedAt: healthRecords.vetConfirmedAt, amendsRecordId: healthRecords.amendsRecordId,
      }).from(healthRecords).where(and(eq(healthRecords.catId, catId), filter))
        .orderBy(desc(healthRecords.occurredAt), desc(healthRecords.id)).limit(50);
      return ok(ctx, records);
    }),
    report: withApi<Params>(async (request, ctx) => {
      const actor = await active(request);
      const catId = routeId(ctx.params);
      const input = await parseJson(request, HealthReportRequest);
      const now = deps.now();
      const record = await deps.db().transaction(async (tx) => {
        const cat = await target(tx, catId);
        if (input.professional) await requireVet(tx, actor, catId, now);
        else if (cat.custody === "owned" && cat.ownerId !== actor) throw new ApiError("NOT_FOUND");
        if (input.amendsRecordId) {
          const [previous] = await tx.select({ id: healthRecords.id, author: healthRecords.authorId })
            .from(healthRecords).where(and(eq(healthRecords.id, input.amendsRecordId), eq(healthRecords.catId, catId)));
          if (!previous || (previous.author !== actor && !input.professional)) throw new ApiError("NOT_FOUND");
        }
        const [entry] = await tx.insert(healthRecords).values({
          catId, authorId: actor, source: input.professional ? "vet" : cat.ownerId === actor ? "owner" : "volunteer",
          category: input.category, occurredAt: date(input.occurredAt, now), details: { note: input.note },
          amendsRecordId: input.amendsRecordId,
        }).returning({ id: healthRecords.id, source: healthRecords.source });
        return entry;
      });
      return ok(ctx, record, { status: 201 });
    }),
    confirm: withApi<Params>(async (request, ctx) => {
      const actor = await active(request);
      const id = routeId(ctx.params);
      const input = await parseJson(request, ConfirmHealthRequest);
      const now = deps.now();
      await deps.db().transaction(async (tx) => {
        const [record] = await tx.select().from(healthRecords).where(eq(healthRecords.id, id)).for("update");
        if (!record) throw new ApiError("NOT_FOUND");
        const cat = await target(tx, record.catId);
        await requireVet(tx, actor, record.catId, now);
        if (record.vetConfirmedAt) throw new ApiError("CONFLICT");
        if (input.publish && cat.custody !== "street") throw new ApiError("FORBIDDEN");
        await tx.update(healthRecords).set({
          vetConfirmedBy: actor, vetConfirmedAt: now, visibility: input.publish ? "public_summary" : "private",
        }).where(eq(healthRecords.id, id));
        await tx.insert(auditLogs).values({
          actorId: actor, action: "health_record.confirm", resourceKind: "health_record",
          resourceId: id, requestId: ctx.requestId, occurredAt: now, changes: { published: input.publish },
        });
      });
      return ok(ctx, { id, confirmed: true });
    }),
    care: withApi<Params>(async (request, ctx) => {
      const actor = await active(request);
      const catId = routeId(ctx.params);
      const input = await parseJson(request, CareLogRequest);
      const db = deps.db();
      const cat = await target(db, catId);
      if (cat.custody === "owned" && cat.ownerId !== actor) throw new ApiError("NOT_FOUND");
      const [entry] = await db.insert(careLogs).values({
        catId, authorId: actor, category: input.category, occurredAt: date(input.occurredAt, deps.now()), note: input.note,
      }).returning({ id: careLogs.id });
      return ok(ctx, entry, { status: 201 });
    }),
    listCare: withApi<Params>(async (request, ctx) => {
      const actor = await active(request);
      const catId = routeId(ctx.params);
      const db = deps.db();
      const cat = await target(db, catId);
      if (cat.custody === "owned" && cat.ownerId !== actor) throw new ApiError("NOT_FOUND");
      const entries = await db.select({
        id: careLogs.id, category: careLogs.category, occurredAt: careLogs.occurredAt, note: careLogs.note,
      }).from(careLogs).where(and(eq(careLogs.catId, catId), cat.ownerId === actor ? undefined : eq(careLogs.authorId, actor)))
        .orderBy(desc(careLogs.occurredAt), desc(careLogs.id)).limit(50);
      return ok(ctx, entries);
    }),
  };
}

export const careHandlers = createCareHandlers({
  db: getDb, now: () => new Date(), session: (request) => authHandlers().requireSession(request),
});
