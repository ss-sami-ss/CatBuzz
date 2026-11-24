import { asc, eq, gt } from "drizzle-orm";
import { OpeningHours, type PublicClinic } from "@/shared/contracts/clinics";
import { Uuid } from "@/shared/contracts/common";
import type { Db } from "../db/client";
import { clinics } from "../db/schema";
import { ApiError } from "../http/api-error";
import { decodeCursor, encodeCursor } from "../http/cursor";

function publicClinic(row: typeof clinics.$inferSelect): PublicClinic {
  const consent = row.contactConsent === "granted";
  return {
    id: row.id,
    name: row.name,
    address: consent ? row.publicAddress : null,
    center: consent ? [row.location.x, row.location.y] : null,
    phone: consent ? row.publicPhone : null,
    timezone: row.timezone,
    services: row.services,
    openingHours: OpeningHours.safeParse(row.openingHours).data ?? [],
    status: row.verifiedStatus,
  };
}

export async function listClinics(db: Db, query: { cursor?: string; limit: number }, secret: string) {
  const pos = query.cursor ? decodeCursor(query.cursor, secret) : undefined;
  if (pos && (pos.sortKey !== "clinics" || !Uuid.safeParse(pos.id).success)) throw new ApiError("INVALID_CURSOR");
  const rows = await db.select().from(clinics).where(pos ? gt(clinics.id, pos.id) : undefined)
    .orderBy(asc(clinics.id)).limit(query.limit + 1);
  const items = rows.slice(0, query.limit).map(publicClinic);
  const last = items.at(-1);
  return { items, nextCursor: rows.length > query.limit && last
    ? encodeCursor({ id: last.id, sortKey: "clinics" }, secret) : null };
}

export async function getClinic(db: Db, id: string) {
  const [row] = await db.select().from(clinics).where(eq(clinics.id, id));
  if (!row) throw new ApiError("NOT_FOUND");
  return publicClinic(row);
}
