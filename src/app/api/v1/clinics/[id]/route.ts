import { Uuid } from "@/shared/contracts/common";
import { getClinic } from "@/server/clinics/directory";
import { getDb } from "@/server/db/client";
import { ApiError } from "@/server/http/api-error";
import { ok, withApi } from "@/server/http/respond";

export const dynamic = "force-dynamic";
export const GET = withApi<{ id: string }>(async (_request, ctx) => {
  const id = Uuid.safeParse(ctx.params.id);
  if (!id.success) throw new ApiError("NOT_FOUND");
  return ok(ctx, await getClinic(getDb(), id.data));
});
