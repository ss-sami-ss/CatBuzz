import { z } from "zod";

/** Shared building blocks of the /api/v1 contract (docs/07). */

export const Uuid = z.uuid();
export const IsoDateTime = z.iso.datetime({ offset: true });
export const IsoDate = z.iso.date();

/** [lng, lat] of a public cell center; never a private point. */
export const LngLat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

/** Coarse public area (docs/06 "مکان"): stable cell, human label, always approximate. */
export const PublicArea = z
  .object({
    cellId: z.string().min(1),
    label: z.string().min(1),
    center: LngLat.optional(),
    approximate: z.literal(true),
  })
  .meta({ id: "PublicArea" });

/** A private point submitted by the user; stored privately, never echoed in public DTOs. */
export const PrivatePoint = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});

/** Money in minor units with an ISO 4217 code (docs/10). */
export const Money = z.object({
  amountMinor: z.int().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export const PAGE_LIMIT_DEFAULT = 20;
export const PAGE_LIMIT_MAX = 100;

/** Cursor pagination query: opaque cursor, limit 1..100 with default 20. */
export const PageQuery = z.object({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(PAGE_LIMIT_MAX).default(PAGE_LIMIT_DEFAULT),
});

/** Largest bbox span accepted by list/map endpoints, in degrees (bounded queries, docs/07). */
export const BBOX_MAX_SPAN_DEG = 2;

/** "minLng,minLat,maxLng,maxLat" in a query string, validated and bounded. */
export const BboxParam = z
  .string()
  .transform((raw, ctx) => {
    const parts = raw.split(",").map((part) => part.trim() ? Number(part) : Number.NaN);
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
      ctx.addIssue({ code: "custom", message: "bbox باید چهار عدد با ویرگول باشد." });
      return z.NEVER;
    }
    const [minLng, minLat, maxLng, maxLat] = parts as [number, number, number, number];
    const inRange = minLng >= -180 && maxLng <= 180 && minLat >= -90 && maxLat <= 90;
    if (!inRange || minLng >= maxLng || minLat >= maxLat) {
      ctx.addIssue({ code: "custom", message: "محدودهٔ bbox نامعتبر است." });
      return z.NEVER;
    }
    if (maxLng - minLng > BBOX_MAX_SPAN_DEG || maxLat - minLat > BBOX_MAX_SPAN_DEG) {
      ctx.addIssue({ code: "custom", message: "محدودهٔ نقشه بیش از حد بزرگ است؛ بزرگ‌نمایی کنید." });
      return z.NEVER;
    }
    return { minLng, minLat, maxLng, maxLat };
  });

export const Zoom = z.coerce.number().int().min(3).max(20);

/** Optimistic concurrency token sent back on edits (docs/06 version). */
export const Version = z.int().min(0);
