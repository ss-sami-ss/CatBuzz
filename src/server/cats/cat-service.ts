import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import type { CatListQuery, CreateCatRequest, CreateSightingRequest, PublicCatSummary, UpdateCatRequest } from "@/shared/contracts/cats";
import { IsoDateTime, Uuid } from "@/shared/contracts/common";
import type { Db } from "../db/client";
import { auditLogs, catMedia, catNames, cats, helpEvidence, media, missionUpdates, sightings } from "../db/schema";
import { publicCellCenter, publicCellId } from "../geo/public-cell";
import { ApiError } from "../http/api-error";
import { decodeCursor, encodeCursor } from "../http/cursor";

const publicDay = sql<string>`to_char(${cats.lastSeenAt} at time zone 'UTC', 'YYYY-MM-DD')`;
const publicFilter = and(eq(cats.custody, "street"), eq(cats.lifecycle, "active"), isNotNull(cats.lastSeenAt), isNotNull(cats.publicCellId), isNull(cats.archivedAt));
const fields = {
  id: cats.id,
  name: cats.currentName,
  needs: cats.needs,
  day: publicDay,
  cellId: cats.publicCellId,
  areaLabel: cats.publicAreaLabel,
  sex: cats.sex,
  ageEstimate: cats.ageEstimate,
  markings: cats.markings,
  version: cats.version,
  hasCaretaker: sql<boolean>`exists (
    select 1 from colony_memberships membership
    join colony_caretakers caretaker on caretaker.colony_id = membership.colony_id
    join colonies colony on colony.id = membership.colony_id and colony.archived_at is null
    join users account on account.id = caretaker.user_id
    where membership.cat_id = cats.id
      and membership.status = 'verified'
      and membership.valid_from <= now()
      and (membership.valid_to is null or membership.valid_to > now())
      and account.status = 'active'
  )`,
};
type PublicRow = { id: string; name: string | null; needs: PublicCatSummary["needs"]; day: string; cellId: string | null; areaLabel: string | null; hasCaretaker: boolean };
type ReadDb = Pick<Db, "select">;
const supportedCell = /^g(?:0\.01|0\.05|0\.1):-?\d{1,5}:-?\d{1,5}$/;

function summary(row: PublicRow): PublicCatSummary {
  const id = row.cellId!;
  const center = supportedCell.test(id) ? publicCellCenter(id) : undefined;
  const validCenter = center && Math.abs(center[0]) <= 180 && Math.abs(center[1]) <= 90 ? center : undefined;
  return {
    id: row.id,
    name: row.name,
    needs: row.needs,
    lastSeenAt: row.day + "T00:00:00Z",
    publicArea: { cellId: validCenter ? id : "unknown", label: validCenter ? row.areaLabel ?? "محدودهٔ تقریبی" : "نامشخص", center: validCenter, approximate: true },
    careStatus: row.hasCaretaker ? "has_caretaker" : "unknown",
    thumbnailUrl: null,
  };
}

export async function listCats(db: ReadDb, query: z.output<typeof CatListQuery>, secret: string) {
  const position = query.cursor ? decodeCursor(query.cursor, secret) : undefined;
  if (position && (!Uuid.safeParse(position.id).success || !IsoDateTime.safeParse(position.sortKey + "T00:00:00Z").success)) {
    throw new ApiError("INVALID_CURSOR");
  }
  const needs = [...new Set(query.needs)];
  const rows = await db.select(fields).from(cats).where(and(
    publicFilter,
    position && sql`(${publicDay}, ${cats.id}) < (${position.sortKey}, ${position.id}::uuid)`,
    needs.length ? sql`${cats.needs} && array[${sql.join(needs.map((need) => sql`${need}`), sql`, `)}]::cat_need[]` : undefined,
  )).orderBy(desc(publicDay), desc(cats.id)).limit(query.limit + 1);
  const page = rows.slice(0, query.limit);
  const last = page.at(-1);
  return {
    items: page.map(summary),
    nextCursor: rows.length > query.limit && last ? encodeCursor({ sortKey: last.day, id: last.id }, secret) : null,
  };
}

export async function getCat(db: ReadDb, id: string) {
  const [row] = await db.select(fields).from(cats).where(and(publicFilter, eq(cats.id, id)));
  if (!row) throw new ApiError("NOT_FOUND");
  const photos = await db.select({ id: media.id }).from(catMedia).innerJoin(media, eq(media.id, catMedia.mediaId))
    .where(and(eq(catMedia.catId, id), eq(media.status, "ready"), eq(media.visibility, "public"),
      sql`${media.storageKey} = 'ready/images/' || ${media.id}::text || '.jpg'`))
    .orderBy(media.createdAt, media.id);
  return { ...summary(row), photoIds: photos.map((photo) => photo.id), sex: row.sex, ageEstimate: row.ageEstimate, markings: row.markings, version: row.version };
}

function sighting(input: z.output<typeof CreateSightingRequest>, now: Date) {
  const observedAt = new Date(input.observedAt);
  if (observedAt > now) throw new ApiError("VALIDATION_FAILED", { fieldErrors: { observedAt: ["زمان مشاهده نمی‌تواند در آینده باشد."] } });
  const { lng, lat } = input.location;
  return {
    observedAt,
    precision: input.precision,
    location: { x: lng, y: lat },
    publicCellId: publicCellId(lng, lat),
    note: input.note,
  };
}

export async function createCat(db: Db, actorId: string, input: z.output<typeof CreateCatRequest>, now: Date) {
  const first = sighting(input.observation, now);
  const mediaIds = [...new Set(input.mediaIds)];
  return db.transaction(async (tx) => {
    if (mediaIds.length) {
      const files = await tx.select({ id: media.id }).from(media).where(and(
        inArray(media.id, mediaIds), eq(media.ownerId, actorId), eq(media.status, "ready"),
        sql`${media.mime} like 'image/%'`,

      )).orderBy(media.id).for("update");
      const attached = await tx.select({ id: catMedia.mediaId }).from(catMedia).where(inArray(catMedia.mediaId, mediaIds)).limit(1);
      const evidence = await tx.select({ id: helpEvidence.mediaId }).from(helpEvidence).where(inArray(helpEvidence.mediaId, mediaIds)).limit(1);
      const missionEvidence = await tx.select({ id: missionUpdates.id }).from(missionUpdates)
        .where(sql`${missionUpdates.evidenceMediaIds} && array[${sql.join(mediaIds.map((id) => sql`${id}`), sql`, `)}]::uuid[]`).limit(1);
      if (evidence.length || missionEvidence.length) throw new ApiError("CONFLICT", { message: "عکس پیوست‌شده به گزارش خصوصی قابل استفاده در پرونده نیست." });
      if (attached.length) throw new ApiError("CONFLICT", { message: "یکی از عکس‌ها قبلاً به پرونده‌ای متصل شده است." });
      if (files.length !== mediaIds.length) throw new ApiError("VALIDATION_FAILED", { fieldErrors: { mediaIds: ["عکس باید آماده و متعلق به حساب شما باشد."] } });
    }
    const [cat] = await tx.insert(cats).values({
      createdBy: actorId, currentName: input.name, sex: input.sex, ageEstimate: input.ageEstimate,
      markings: input.markings, publicCellId: first.publicCellId, lastSeenAt: first.observedAt,
    }).returning({ id: cats.id });
    if (!cat) throw new ApiError("INTERNAL");
    await tx.insert(sightings).values({ ...first, observerId: actorId, catId: cat.id });
    if (input.name) await tx.insert(catNames).values({ catId: cat.id, name: input.name, chosenBy: actorId, validFrom: now });
    if (mediaIds.length) {
      await tx.insert(catMedia).values(mediaIds.map((mediaId) => ({ catId: cat.id, mediaId })));
      if (input.publishPhotos) {
        await tx.update(media).set({ visibility: "public" }).where(and(
          inArray(media.id, mediaIds), sql`${media.storageKey} = 'ready/images/' || ${media.id}::text || '.jpg'`,
        ));
      }
    }
    return getCat(tx, cat.id);
  });
}

export async function updateCat(db: Db, id: string, actorId: string, input: z.output<typeof UpdateCatRequest>, now: Date) {
  return db.transaction(async (tx) => {
    const [cat] = await tx.select({ creatorId: cats.createdBy, name: cats.currentName, version: cats.version })
      .from(cats).where(and(publicFilter, eq(cats.id, id))).for("update");
    if (!cat) throw new ApiError("NOT_FOUND");
    if (cat.creatorId !== actorId) throw new ApiError("FORBIDDEN");
    if (cat.version !== input.version) throw new ApiError("VERSION_CONFLICT");
    const { version, name, ...changes } = input;
    await tx.update(cats).set({ ...changes, ...(name !== undefined && { currentName: name }), version: version + 1, updatedAt: now })
      .where(eq(cats.id, id));
    if (name !== undefined && name !== cat.name) {
      await tx.update(catNames).set({ validTo: now }).where(and(eq(catNames.catId, id), sql`${catNames.validTo} is null`));
      if (name) await tx.insert(catNames).values({ catId: id, name, chosenBy: actorId, validFrom: now });
    }
    return getCat(tx, id);
  });
}

export async function addSighting(db: Db, catId: string, actorId: string, input: z.output<typeof CreateSightingRequest>, now: Date) {
  const observation = sighting(input, now);
  return db.transaction(async (tx) => {
    const [cat] = await tx.select({ cellId: cats.publicCellId, lastSeenAt: cats.lastSeenAt })
      .from(cats).where(and(eq(cats.id, catId), eq(cats.custody, "street"), eq(cats.lifecycle, "active"), isNull(cats.archivedAt))).for("update");
    if (!cat) throw new ApiError("NOT_FOUND");
    // Retain deliberately widened and unrecognized legacy areas instead of narrowing them.
    const cellId = cat.cellId && !cat.cellId.startsWith("g0.01:") ? cat.cellId : observation.publicCellId;
    const [record] = await tx.insert(sightings).values({ ...observation, publicCellId: cellId, catId, observerId: actorId })
      .returning({ id: sightings.id });
    if (!cat.lastSeenAt || cat.lastSeenAt < observation.observedAt) {
      await tx.update(cats).set({
        lastSeenAt: observation.observedAt, publicCellId: cellId,
        ...(cellId !== cat.cellId && { publicAreaLabel: null }),
        version: sql`${cats.version} + 1`, updatedAt: now,
      }).where(eq(cats.id, catId));
    }
    return { id: record!.id };
  });
}

export async function archiveCat(db: Db, id: string, actorId: string, version: number, now: Date, requestId: string) {
  await db.transaction(async (tx) => {
    const [cat] = await tx.select({ creatorId: cats.createdBy, version: cats.version })
      .from(cats).where(and(eq(cats.id, id), eq(cats.custody, "street"), isNull(cats.archivedAt))).for("update");
    if (!cat) throw new ApiError("NOT_FOUND");
    if (cat.creatorId !== actorId) throw new ApiError("FORBIDDEN");
    if (cat.version !== version) throw new ApiError("VERSION_CONFLICT");
    await tx.update(cats).set({ archivedAt: now, updatedAt: now, version: version + 1 }).where(eq(cats.id, id));
    await tx.insert(auditLogs).values({ actorId, action: "cat.archive", resourceKind: "cat", resourceId: id, requestId, occurredAt: now });
  });
}
