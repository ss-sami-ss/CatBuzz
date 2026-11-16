import { z } from "zod";
import { BboxParam, IsoDateTime, LngLat, Uuid, Zoom } from "./common";
import { CatNeed } from "./cats";

export const MapQuery = z.object({
  bbox: BboxParam,
  zoom: Zoom,
  needs: z
    .string()
    .transform((v) => v.split(",").filter(Boolean))
    .pipe(z.array(CatNeed))
    .optional(),
});

/** A single public marker; the position is the public cell center, never the private point. */
export const PublicMapCat = z
  .object({
    kind: z.literal("cat"),
    id: Uuid,
    name: z.string().nullable(),
    center: LngLat,
    needs: z.array(CatNeed),
    lastSeenAt: IsoDateTime,
    thumbnailUrl: z.url().nullable(),
  })
  .meta({ id: "PublicMapCat" });

export const PublicMapCluster = z
  .object({ kind: z.literal("cluster"), cellId: z.string(), center: LngLat, count: z.int().positive() })
  .meta({ id: "PublicMapCluster" });

export const PublicMapItem = z.discriminatedUnion("kind", [PublicMapCat, PublicMapCluster]).meta({ id: "PublicMapItem" });
