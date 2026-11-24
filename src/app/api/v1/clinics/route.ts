import { PageQuery } from "@/shared/contracts/common";
import { listClinics } from "@/server/clinics/directory";
import { getDb } from "@/server/db/client";
import { serverEnv } from "@/server/env";
import { ok, parseQuery, withApi } from "@/server/http/respond";

export const dynamic = "force-dynamic";
export const GET = withApi(async (request, ctx) => {
  const result = await listClinics(getDb(), parseQuery(request, PageQuery), serverEnv().CURSOR_SECRET);
  return ok(ctx, result.items, { nextCursor: result.nextCursor });
});
