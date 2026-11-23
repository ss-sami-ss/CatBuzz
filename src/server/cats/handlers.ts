import { CatListQuery, CreateCatRequest, CreateSightingRequest, UpdateCatRequest } from "@/shared/contracts/cats";
import { ChangeCaretakerRequest, ChangeMembershipRequest, CreateColonyRequest, UpdateColonyRequest } from "@/shared/contracts/colonies";
import { ArchiveRequest, PageQuery, Uuid } from "@/shared/contracts/common";
import { authHandlers } from "../auth/handlers";
import type { SessionUser } from "../auth/auth-service";
import { getDb, type Db } from "../db/client";
import { serverEnv } from "../env";
import { ApiError } from "../http/api-error";
import { noContent, ok, parseJson, parseQuery, withApi } from "../http/respond";
import { addSighting, archiveCat, createCat, getCat, listCats, updateCat } from "./cat-service";
import { archiveColony, changeCaretaker, changeMembership, createColony, getColony, listColonies, updateColony } from "./colony-service";

type IdParams = { id: string };
type Dependencies = {
  db: () => Db;
  session: (request: Request) => Promise<SessionUser>;
  secret: () => string;
  now: () => Date;
};

function idFrom(params: IdParams) {
  const result = Uuid.safeParse(params.id);
  if (!result.success) throw new ApiError("NOT_FOUND");
  return result.data;
}

export function createCatHandlers(deps: Dependencies) {
  async function requireActive(request: Request) {
    const actor = await deps.session(request);
    if (actor.status !== "active") throw new ApiError("FORBIDDEN");
    return actor.userId;
  }
  return {
    list: withApi(async (request, ctx) => {
      const query = parseQuery(request, CatListQuery);
      const { items, nextCursor } = await listCats(deps.db(), query, deps.secret());
      return ok(ctx, items, { nextCursor });
    }),
    create: withApi(async (request, ctx) => {
      const actorId = await requireActive(request);
      const input = await parseJson(request, CreateCatRequest);
      return ok(ctx, await createCat(deps.db(), actorId, input, deps.now()), { status: 201 });
    }),
    get: withApi<IdParams>(async (_request, ctx) => ok(ctx, await getCat(deps.db(), idFrom(ctx.params)))),
    update: withApi<IdParams>(async (request, ctx) => {
      const actorId = await requireActive(request);
      const input = await parseJson(request, UpdateCatRequest);
      return ok(ctx, await updateCat(deps.db(), idFrom(ctx.params), actorId, input, deps.now()));
    }),
    archive: withApi<IdParams>(async (request, ctx) => {
      const actorId = await requireActive(request);
      const { version } = await parseJson(request, ArchiveRequest);
      await archiveCat(deps.db(), idFrom(ctx.params), actorId, version, deps.now(), ctx.requestId);
      return noContent(ctx);
    }),
    observe: withApi<IdParams>(async (request, ctx) => {
      const actorId = await requireActive(request);
      const input = await parseJson(request, CreateSightingRequest);
      return ok(ctx, await addSighting(deps.db(), idFrom(ctx.params), actorId, input, deps.now()), { status: 201 });
    }),
    listColonies: withApi(async (request, ctx) => {
      const query = parseQuery(request, PageQuery);
      const { items, nextCursor } = await listColonies(deps.db(), query, deps.secret());
      return ok(ctx, items, { nextCursor });
    }),
    createColony: withApi(async (request, ctx) => {
      const actorId = await requireActive(request);
      const input = await parseJson(request, CreateColonyRequest);
      return ok(ctx, await createColony(deps.db(), actorId, input, deps.now(), ctx.requestId), { status: 201 });
    }),
    getColony: withApi<IdParams>(async (_request, ctx) => ok(ctx, await getColony(deps.db(), idFrom(ctx.params)))),
    updateColony: withApi<IdParams>(async (request, ctx) => {
      const actorId = await requireActive(request);
      const input = await parseJson(request, UpdateColonyRequest);
      return ok(ctx, await updateColony(deps.db(), idFrom(ctx.params), actorId, input));
    }),
    archiveColony: withApi<IdParams>(async (request, ctx) => {
      const actorId = await requireActive(request);
      const { version } = await parseJson(request, ArchiveRequest);
      await archiveColony(deps.db(), idFrom(ctx.params), actorId, version, deps.now(), ctx.requestId);
      return noContent(ctx);
    }),
    changeMembership: withApi<IdParams>(async (request, ctx) => {
      const actorId = await requireActive(request);
      const input = await parseJson(request, ChangeMembershipRequest);
      return ok(ctx, await changeMembership(deps.db(), idFrom(ctx.params), actorId, input, deps.now()));
    }),
    changeCaretaker: withApi<IdParams>(async (request, ctx) => {
      const actorId = await requireActive(request);
      const input = await parseJson(request, ChangeCaretakerRequest);
      return ok(ctx, await changeCaretaker(deps.db(), idFrom(ctx.params), actorId, input, deps.now(), ctx.requestId));
    }),
  };
}

export const catHandlers = createCatHandlers({
  db: getDb,
  session: (request) => authHandlers().requireSession(request),
  secret: () => serverEnv().CURSOR_SECRET,
  now: () => new Date(),
});
