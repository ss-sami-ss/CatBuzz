import { createHash } from "node:crypto";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { Uuid } from "@/shared/contracts/common";
import { AcceptanceDto, CreateMissionInput, MissionAcceptanceInput, MissionQuery, MissionUpdateInput } from "@/shared/contracts/missions";
import { requireProfessionalCredential } from "../auth/access-policy";
import type { SessionUser } from "../auth/auth-service";
import { authHandlers } from "../auth/handlers";
import { getDb, type Db } from "../db/client";
import { assignments, helpRequests, idempotencyKeys, media, missions, missionUpdates, outboxEvents, volunteerCapabilities } from "../db/schema";
import { serverEnv } from "../env";
import { ApiError } from "../http/api-error";
import { ok, parseJson, parseQuery, withApi } from "../http/respond";

type Params = { id: string };
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Mission = typeof missions.$inferSelect;
type Dependencies = {
  db: () => Db;
  session: (request: Request) => Promise<SessionUser>;
  reviewer: (actor: string) => boolean;
  now: () => Date;
};

function view(row: Mission) {
  return {
    id: row.id, type: row.type, status: row.status, capacity: row.capacity, acceptedCount: row.acceptedCount,
    requiredCapability: row.requiredCapability, dueAt: row.dueAt?.toISOString() ?? null, version: row.version,
  };
}

function requireId(value: string) {
  const result = Uuid.safeParse(value);
  if (!result.success) throw new ApiError("NOT_FOUND");
  return result.data;
}

async function lock(tx: Tx, id: string) {
  const [row] = await tx.select().from(missions).where(eq(missions.id, id)).for("update");
  if (!row) throw new ApiError("NOT_FOUND");
  return row;
}

async function log(tx: Tx, missionId: string, actorId: string, event: string, now: Date, note?: string, evidenceMediaIds?: string[]) {
  await tx.insert(missionUpdates).values({ missionId, actorId, event, note, evidenceMediaIds, occurredAt: now });
  await tx.insert(outboxEvents).values({ type: "mission." + event, aggregateId: missionId });
}

export function createMissionHandlers(deps: Dependencies) {
  async function active(request: Request) {
    const actor = await deps.session(request);
    if (actor.status !== "active") throw new ApiError("FORBIDDEN");
    return actor.userId;
  }
  return {
    list: withApi(async (request, ctx) => {
      const actor = await active(request);
      const query = parseQuery(request, MissionQuery);
      const rows = await deps.db().select().from(missions).where(and(
        query.type ? eq(missions.type, query.type) : undefined,
        query.status ? eq(missions.status, query.status) : inArray(missions.status, ["open", "full", "in_progress"]),
      )).orderBy(desc(missions.createdAt), desc(missions.id)).limit(50);
      const own = rows.length ? await deps.db().select({ missionId: assignments.missionId, role: assignments.role })
        .from(assignments).where(and(eq(assignments.userId, actor), eq(assignments.status, "accepted"),
          inArray(assignments.missionId, rows.map(({ id }) => id)))) : [];
      const ownRoles = new Map(own.map(({ missionId, role }) => [missionId, role]));
      return ok(ctx, rows.map((row) => ({
        ...view(row), myRole: ownRoles.get(row.id) ?? null,
        canComplete: row.createdBy === actor && deps.reviewer(actor),
      })));
    }),
    create: withApi(async (request, ctx) => {
      const actor = await active(request);
      if (!deps.reviewer(actor)) throw new ApiError("FORBIDDEN");
      const input = await parseJson(request, CreateMissionInput);
      const now = deps.now();
      const dueAt = new Date(input.dueAt);
      if (dueAt <= now) throw new ApiError("VALIDATION_FAILED");
      const data = await deps.db().transaction(async (tx) => {
        const [report] = await tx.select({ ownerId: helpRequests.triageOwnerId, status: helpRequests.status })
          .from(helpRequests).where(eq(helpRequests.id, input.reportId)).for("share");
        if (!report) throw new ApiError("NOT_FOUND");
        if (report.ownerId !== actor) throw new ApiError("FORBIDDEN");
        if (report.status !== "triaged" && report.status !== "in_progress") throw new ApiError("CONFLICT");
        const [row] = await tx.insert(missions).values({
          helpRequestId: input.reportId, type: input.type, capacity: input.capacity,
          requiredCapability: input.requiredCapability, dueAt, createdBy: actor, createdAt: now,
        }).returning();
        await log(tx, row!.id, actor, "created", now);
        return view(row!);
      });
      return ok(ctx, data, { status: 201 });
    }),
    accept: withApi<Params>(async (request, ctx) => {
      const actor = await active(request);
      const id = requireId(ctx.params.id);
      const key = request.headers.get("idempotency-key");
      if (!key || !/^[A-Za-z0-9._:-]{8,128}$/.test(key)) throw new ApiError("BAD_REQUEST");
      const input = await parseJson(request, MissionAcceptanceInput);
      const hash = createHash("sha256").update(JSON.stringify([input.version, input.role])).digest("hex");
      const endpoint = "/missions/" + id + "/acceptances";
      const now = deps.now();

      const data = await deps.db().transaction(async (tx) => {
        const mission = await lock(tx, id);
        const scope = and(eq(idempotencyKeys.actorId, actor), eq(idempotencyKeys.endpoint, endpoint), eq(idempotencyKeys.key, key));
        const [prior] = await tx.select().from(idempotencyKeys).where(scope);
        if (prior && prior.expiresAt > now) {
          if (prior.requestHash !== hash) throw new ApiError("IDEMPOTENCY_KEY_REUSED");
          return AcceptanceDto.parse(prior.responseBody);
        }
        if (prior) await tx.delete(idempotencyKeys).where(scope);
        if (mission.status === "full" || mission.acceptedCount >= mission.capacity) throw new ApiError("MISSION_FULL");
        if (mission.status !== "open" && mission.status !== "in_progress") throw new ApiError("CONFLICT");
        if (mission.dueAt && mission.dueAt <= now) throw new ApiError("CONFLICT");
        if (mission.helpRequestId) {
          const [report] = await tx.select({ status: helpRequests.status }).from(helpRequests)
            .where(eq(helpRequests.id, mission.helpRequestId)).for("share");
          if (!report || !["triaged", "in_progress"].includes(report.status)) throw new ApiError("CONFLICT");
        }
        if (mission.version !== input.version) throw new ApiError("VERSION_CONFLICT");
        if (mission.type === "vet_visit" && input.role !== "veterinarian") throw new ApiError("FORBIDDEN");
        if (input.role === "veterinarian") await requireProfessionalCredential(tx, actor, "veterinarian", now);
        if (mission.requiredCapability) {
          const [skill] = await tx.select({ id: volunteerCapabilities.id }).from(volunteerCapabilities).where(and(
            eq(volunteerCapabilities.userId, actor), eq(volunteerCapabilities.capability, mission.requiredCapability),
          )).for("share");
          if (!skill) throw new ApiError("FORBIDDEN");
        }
        const [assignment] = await tx.insert(assignments).values({ missionId: id, userId: actor, role: input.role, acceptedAt: now })
          .onConflictDoNothing().returning({ id: assignments.id });
        if (!assignment) throw new ApiError("CONFLICT");
        const count = mission.acceptedCount + 1;
        const [updated] = await tx.update(missions).set({
          acceptedCount: count, status: count === mission.capacity ? "full" : mission.status, version: mission.version + 1,
        }).where(eq(missions.id, id)).returning();
        const response = { assignmentId: assignment.id, mission: view(updated!) };
        await tx.insert(idempotencyKeys).values({
          actorId: actor, endpoint, key, requestHash: hash, responseStatus: 201, responseBody: response,
          expiresAt: new Date(now.getTime() + 24 * 60 * 60_000),
        });
        await log(tx, id, actor, "accepted", now);
        return response;
      });
      return ok(ctx, data, { status: 201 });
    }),
    update: withApi<Params>(async (request, ctx) => {
      const actor = await active(request);
      const id = requireId(ctx.params.id);
      const input = await parseJson(request, MissionUpdateInput);
      const now = deps.now();
      const data = await deps.db().transaction(async (tx) => {
        const row = await lock(tx, id);
        if (row.status === "completed" || row.status === "cancelled") throw new ApiError("CONFLICT");
        if (row.version !== input.version) throw new ApiError("VERSION_CONFLICT");
        let acceptedCount = row.acceptedCount;
        let status: Mission["status"] = row.status;
        if (input.event === "complete") {
          if (!deps.reviewer(actor) || row.createdBy !== actor) throw new ApiError("FORBIDDEN");
          const participants = await tx.select({ userId: assignments.userId, since: assignments.acceptedAt }).from(assignments)
            .where(and(eq(assignments.missionId, id), eq(assignments.status, "accepted")));
          const results = await tx.select({ actorId: missionUpdates.actorId, at: missionUpdates.occurredAt }).from(missionUpdates)
            .where(and(eq(missionUpdates.missionId, id), eq(missionUpdates.event, "submit_result")));
          if (!participants.length || participants.some(({ userId, since }) =>
            !results.some((result) => result.actorId === userId && result.at >= since))) throw new ApiError("CONFLICT");
          await tx.update(assignments).set({ status: "completed", endedAt: now }).where(and(eq(assignments.missionId, id), eq(assignments.status, "accepted")));
          acceptedCount = 0;
          status = "completed";
        } else {
          const [assignment] = await tx.select().from(assignments).where(and(eq(assignments.missionId, id),
            eq(assignments.userId, actor), eq(assignments.status, "accepted")));
          if (!assignment) throw new ApiError("FORBIDDEN");
          if (input.event === "withdraw") {
            await tx.update(assignments).set({ status: "withdrawn", endedAt: now }).where(eq(assignments.id, assignment.id));
            acceptedCount -= 1;
            status = acceptedCount === 0 || row.status === "full" ? "open" : row.status;
          } else {
            if (assignment.role === "veterinarian") await requireProfessionalCredential(tx, actor, "veterinarian", now);
            const [previous] = await tx.select({ id: missionUpdates.id }).from(missionUpdates).where(and(
              eq(missionUpdates.missionId, id), eq(missionUpdates.actorId, actor),
              eq(missionUpdates.event, "submit_result"), gte(missionUpdates.occurredAt, assignment.acceptedAt),
            )).limit(1);
            if (previous) throw new ApiError("CONFLICT");
            if (input.evidenceIds.length > 0) {
              const ids = [...new Set(input.evidenceIds)];
              const files = await tx.select({ id: media.id }).from(media).where(and(
                inArray(media.id, ids), eq(media.ownerId, actor), eq(media.status, "ready"), eq(media.visibility, "private"),
              )).orderBy(media.id).for("share");
              if (files.length !== ids.length) throw new ApiError("VALIDATION_FAILED");
            }
            status = row.status === "full" ? "full" : "in_progress";
          }
        }
        const [updated] = await tx.update(missions).set({ acceptedCount, status, version: row.version + 1 })
          .where(eq(missions.id, id)).returning();
        await log(tx, id, actor, input.event, now, input.note, input.evidenceIds);
        return view(updated!);
      });
      return ok(ctx, data);
    }),
  };
}

export const missionHandlers = createMissionHandlers({
  db: getDb, session: (request) => authHandlers().requireSession(request),
  reviewer: (actor) => serverEnv().TRIAGE_REVIEWER_IDS.has(actor), now: () => new Date(),
});
