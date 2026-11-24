import { and, eq, isNull } from "drizzle-orm";
import { Uuid } from "@/shared/contracts/common";
import { getDb } from "@/server/db/client";
import { catMedia, cats, media } from "@/server/db/schema";
import { ApiError } from "@/server/http/api-error";
import { withApi } from "@/server/http/respond";
import { getMediaStorage } from "@/server/media/storage";

export const dynamic = "force-dynamic";

export const GET = withApi<{ id: string }>(async (_request, ctx) => {
  const id = Uuid.safeParse(ctx.params.id);
  if (!id.success) throw new ApiError("NOT_FOUND");
  const [image] = await getDb().select({ key: media.storageKey, size: media.sizeBytes }).from(media)
    .innerJoin(catMedia, eq(catMedia.mediaId, media.id))
    .innerJoin(cats, eq(cats.id, catMedia.catId)).where(and(
      eq(media.id, id.data), eq(media.status, "ready"), eq(media.visibility, "public"),
      eq(media.storageKey, "ready/images/" + id.data + ".jpg"),
      eq(cats.custody, "street"), eq(cats.lifecycle, "active"), isNull(cats.archivedAt),
    )).limit(1);
  if (!image) throw new ApiError("NOT_FOUND");
  const bytes = await getMediaStorage().read(image.key, image.size);
  if (!bytes || bytes.byteLength !== image.size) throw new ApiError("SERVICE_UNAVAILABLE");
  return new Response(new Uint8Array(bytes), { headers: {
    "Content-Type": "image/jpeg", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
  } });
});
