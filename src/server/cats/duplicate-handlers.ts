import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { Uuid } from "@/shared/contracts/common";
import { MergeRequest } from "@/shared/contracts/duplicates";
import { authHandlers } from "../auth/handlers";
import type { SessionUser } from "../auth/auth-service";
import { getDb, type Db } from "../db/client";
import { auditLogs, cats, moderationReports } from "../db/schema";
import { ApiError } from "../http/api-error";
import { ok, parseJson, withApi } from "../http/respond";

type Params = { id: string };
const visible = and(eq(cats.custody, "street"), eq(cats.lifecycle, "active"), isNull(cats.archivedAt));
const category = (id: string) => "duplicate_cat:" + id;

function idFrom(params: Params) {
  const id = Uuid.safeParse(params.id);
  if (!id.success) throw new ApiError("NOT_FOUND");
  return id.data;
}

function neighborCells(cell: string | null) {
  const matched = /^g(0\.01|0\.05|0\.1):(-?\d{1,5}):(-?\d{1,5})$/.exec(cell ?? "");
  if (!matched) return [];
  const [, size, x, y] = matched;
  return [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) =>
    "g" + size + ":" + (Number(x) + dx) + ":" + (Number(y) + dy)));
}

export function createDuplicateHandlers(db: () => Db, session: (request: Request) => Promise<SessionUser>) {
  return {
    similar: withApi<Params>(async (_request, ctx) => {
      const id = idFrom(ctx.params);
      const [source] = await db().select({ cell: cats.publicCellId }).from(cats).where(and(visible, eq(cats.id, id)));
      if (!source) throw new ApiError("NOT_FOUND");
      const cells = neighborCells(source.cell);
      if (!cells.length) return ok(ctx, []);
      const matches = await db().select({ id: cats.id, name: cats.currentName, areaLabel: cats.publicAreaLabel }).from(cats)
        .where(and(visible, inArray(cats.publicCellId, cells), sql`${cats.id} <> ${id}::uuid`))
        .orderBy(cats.id).limit(20);
      return ok(ctx, matches);
    }),
    request: withApi<Params>(async (request, ctx) => {
      const actor = await session(request);
      if (actor.status !== "active") throw new ApiError("FORBIDDEN");
      const id = idFrom(ctx.params);
      const { candidateId, reason } = await parseJson(request, MergeRequest);
      if (id === candidateId) throw new ApiError("VALIDATION_FAILED");
      const result = await db().transaction(async (tx) => {
        const rows = await tx.select({ id: cats.id }).from(cats)
          .where(and(visible, inArray(cats.id, [id, candidateId]))).orderBy(cats.id).for("update");
        if (rows.length !== 2) throw new ApiError("NOT_FOUND");
        const [existing] = await tx.select({ id: moderationReports.id, status: moderationReports.status }).from(moderationReports)
          .where(and(eq(moderationReports.targetKind, "cat"), inArray(moderationReports.status, ["open", "reviewing"]),
            or(and(eq(moderationReports.targetId, id), eq(moderationReports.category, category(candidateId))),
              and(eq(moderationReports.targetId, candidateId), eq(moderationReports.category, category(id))))));
        if (existing) throw new ApiError("CONFLICT", { message: "برای این دو پرونده درخواست بررسی باز است." });
        const [report] = await tx.insert(moderationReports).values({
          reporterId: actor.userId, targetKind: "cat", targetId: id, category: category(candidateId), description: reason,
        }).returning({ id: moderationReports.id });
        await tx.insert(auditLogs).values({
          actorId: actor.userId, action: "cat.merge_requested", resourceKind: "moderation_report", resourceId: report!.id,
          requestId: ctx.requestId, changes: { catId: id, candidateId },
        });
        return { id: report!.id, status: "open" };
      });
      return ok(ctx, result, { status: 201 });
    }),
  };
}

export const duplicateHandlers = createDuplicateHandlers(getDb, (request) => authHandlers().requireSession(request));
