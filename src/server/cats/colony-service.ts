import { and, asc, eq, gt, isNotNull, isNull, lt, or } from "drizzle-orm";
import type { z } from "zod";
import type { ChangeCaretakerRequest, ChangeMembershipRequest, CreateColonyRequest, PublicColony, UpdateColonyRequest } from "@/shared/contracts/colonies";
import { Uuid } from "@/shared/contracts/common";
import type { Db } from "../db/client";
import { auditLogs, cats, colonies, colonyCaretakers, colonyMemberships, users } from "../db/schema";
import { publicCellCenter, publicCellId } from "../geo/public-cell";
import { ApiError } from "../http/api-error";
import { decodeCursor, encodeCursor } from "../http/cursor";

const fields = { id: colonies.id, name: colonies.name, cellId: colonies.publicCellId, label: colonies.publicAreaLabel, version: colonies.version };
type ColonyRow = { id: string; name: string; cellId: string | null; label: string | null; version: number };

function publicColony(row: ColonyRow): z.output<typeof PublicColony> {
  const cellId = row.cellId ?? "";
  const center = /^g(?:0\.01|0\.05|0\.1):-?\d{1,5}:-?\d{1,5}$/.test(cellId) ? publicCellCenter(cellId) : undefined;
  const validCenter = center && Math.abs(center[0]) <= 180 && Math.abs(center[1]) <= 90 ? center : undefined;
  return {
    id: row.id,
    name: row.name,
    publicArea: { cellId: validCenter ? cellId : "unknown", label: validCenter ? row.label ?? "محدودهٔ تقریبی" : "نامشخص", center: validCenter, approximate: true },
    version: row.version,
  };
}

export async function listColonies(db: Db, query: { limit: number; cursor?: string }, secret: string) {
  const position = query.cursor ? decodeCursor(query.cursor, secret) : undefined;
  if (position && (position.sortKey !== "colonies" || !Uuid.safeParse(position.id).success)) throw new ApiError("INVALID_CURSOR");
  const rows = await db.select(fields).from(colonies).where(and(
    isNotNull(colonies.publicCellId), isNull(colonies.archivedAt), position && gt(colonies.id, position.id),
  )).orderBy(asc(colonies.id)).limit(query.limit + 1);
  const page = rows.slice(0, query.limit);
  const last = page.at(-1);
  return { items: page.map(publicColony), nextCursor: rows.length > query.limit && last
    ? encodeCursor({ sortKey: "colonies", id: last.id }, secret) : null };
}

export async function getColony(db: Db, id: string) {
  const [row] = await db.select(fields).from(colonies).where(and(eq(colonies.id, id), isNotNull(colonies.publicCellId), isNull(colonies.archivedAt)));
  if (!row) throw new ApiError("NOT_FOUND");
  return publicColony(row);
}

function colonyLocation(input: { lng: number; lat: number }) {
  return {
    location: { x: input.lng, y: input.lat },
    publicCellId: publicCellId(input.lng, input.lat),
  };
}

export async function createColony(db: Db, actorId: string, input: z.output<typeof CreateColonyRequest>, now: Date, requestId: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(colonies).values({
      createdBy: actorId, name: input.name, ...colonyLocation(input.location),
    }).returning(fields);
    await tx.insert(colonyCaretakers).values({ colonyId: row!.id, userId: actorId, since: now });
    await logCaretaker(tx, row!.id, actorId, actorId, "assign", now, now, requestId);
    return publicColony(row!);
  });
}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function lockColony(tx: Tx, id: string, actorId: string, version: number, ownerOnly = false) {
  const [colony] = await tx.select({ ...fields, creatorId: colonies.createdBy })
    .from(colonies).where(and(eq(colonies.id, id), isNull(colonies.archivedAt))).for("update");
  if (!colony) throw new ApiError("NOT_FOUND");
  if (colony.creatorId !== actorId) {
    if (ownerOnly) throw new ApiError("FORBIDDEN");
    const [caretaker] = await tx.select({ id: colonyCaretakers.userId }).from(colonyCaretakers)
      .where(and(eq(colonyCaretakers.colonyId, id), eq(colonyCaretakers.userId, actorId)));
    if (!caretaker) throw new ApiError("FORBIDDEN");
  }
  if (colony.version !== version) throw new ApiError("VERSION_CONFLICT");
  return colony;
}

export async function updateColony(db: Db, id: string, actorId: string, input: z.output<typeof UpdateColonyRequest>) {
  return db.transaction(async (tx) => {
    const colony = await lockColony(tx, id, actorId, input.version);
    const location = input.location && colonyLocation(input.location);
    const cellId = colony.cellId && !colony.cellId.startsWith("g0.01:") ? colony.cellId : location?.publicCellId;
    const [updated] = await tx.update(colonies).set({
      name: input.name,
      location: location?.location,
      publicCellId: cellId,
      ...(cellId && cellId !== colony.cellId && { publicAreaLabel: null }),
      version: colony.version + 1,
    }).where(eq(colonies.id, id)).returning(fields);
    return publicColony(updated!);
  });
}

export async function changeMembership(db: Db, id: string, actorId: string, input: z.output<typeof ChangeMembershipRequest>, now: Date) {
  const at = new Date(input.at);
  if (at > now) throw new ApiError("VALIDATION_FAILED", { fieldErrors: { at: ["زمان عضویت نمی‌تواند در آینده باشد."] } });
  return db.transaction(async (tx) => {
    const colony = await lockColony(tx, id, actorId, input.version);
    const [cat] = await tx.select({ id: cats.id, creatorId: cats.createdBy }).from(cats)
      .where(and(eq(cats.id, input.catId), eq(cats.custody, "street"), eq(cats.lifecycle, "active"), isNull(cats.archivedAt))).for("share");
    if (!cat) throw new ApiError("NOT_FOUND");
    if (input.action === "join" && cat.creatorId !== actorId) throw new ApiError("FORBIDDEN");

    const key = and(eq(colonyMemberships.colonyId, id), eq(colonyMemberships.catId, input.catId));
    if (input.action === "join") {
      const [overlap] = await tx.select({ id: colonyMemberships.id }).from(colonyMemberships).where(and(
        key, or(isNull(colonyMemberships.validTo), gt(colonyMemberships.validTo, at)),
      )).limit(1);
      if (overlap) throw new ApiError("CONFLICT");
      await tx.insert(colonyMemberships).values({
        colonyId: id, catId: input.catId, validFrom: at, status: "verified", createdBy: actorId,
      });
    } else {
      const [closed] = await tx.update(colonyMemberships).set({ validTo: at }).where(and(
        key, isNull(colonyMemberships.validTo), lt(colonyMemberships.validFrom, at),
      )).returning({ id: colonyMemberships.id });
      if (!closed) throw new ApiError("CONFLICT");
    }
    const [updated] = await tx.update(colonies).set({ version: colony.version + 1 }).where(eq(colonies.id, id)).returning(fields);
    return publicColony(updated!);
  });
}

async function logCaretaker(tx: Tx, id: string, actorId: string, userId: string, action: "assign" | "remove", since: Date, now: Date, requestId: string) {
  await tx.insert(auditLogs).values({
    actorId, resourceKind: "colony", resourceId: id, action: "colony.caretaker." + action,
    requestId, changes: { userId, since: since.toISOString() }, occurredAt: now,
  });
}

export async function changeCaretaker(db: Db, id: string, actorId: string, input: z.output<typeof ChangeCaretakerRequest>, now: Date, requestId: string) {
  return db.transaction(async (tx) => {
    const colony = await lockColony(tx, id, actorId, input.version, true);
    const key = and(eq(colonyCaretakers.colonyId, id), eq(colonyCaretakers.userId, input.userId));
    let since = now;
    if (input.action === "assign") {
      const [user] = await tx.select({ id: users.id }).from(users)
        .where(and(eq(users.id, input.userId), eq(users.status, "active"))).for("share");
      if (!user) throw new ApiError("NOT_FOUND");
      const [added] = await tx.insert(colonyCaretakers).values({ colonyId: id, userId: input.userId, since })
        .onConflictDoNothing().returning({ since: colonyCaretakers.since });
      if (!added) throw new ApiError("CONFLICT");
    } else {
      const [removed] = await tx.delete(colonyCaretakers).where(key).returning({ since: colonyCaretakers.since });
      if (!removed) throw new ApiError("NOT_FOUND");
      since = removed.since;
    }
    await logCaretaker(tx, id, actorId, input.userId, input.action, since, now, requestId);
    const [updated] = await tx.update(colonies).set({ version: colony.version + 1 }).where(eq(colonies.id, id)).returning(fields);
    return publicColony(updated!);
  });
}

export async function archiveColony(db: Db, id: string, actorId: string, version: number, now: Date, requestId: string) {
  await db.transaction(async (tx) => {
    await lockColony(tx, id, actorId, version, true);
    await tx.update(colonies).set({ archivedAt: now, version: version + 1 }).where(eq(colonies.id, id));
    await tx.insert(auditLogs).values({ actorId, action: "colony.archive", resourceKind: "colony", resourceId: id, requestId, occurredAt: now });
  });
}
