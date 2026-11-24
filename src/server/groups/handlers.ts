import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { CreateGroupInput, GroupQuery, GroupReviewInput } from "@/shared/contracts/groups";
import { Uuid } from "@/shared/contracts/common";
import { requireGroupRole } from "../auth/access-policy";
import type { SessionUser } from "../auth/auth-service";
import { authHandlers } from "../auth/handlers";
import { getDb, type Db } from "../db/client";
import { groupMemberships as members, groups, users } from "../db/schema";
import { ApiError } from "../http/api-error";
import { ok, parseJson, parseQuery, withApi } from "../http/respond";

type Params = { id: string };
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
const fields = { id: groups.id, name: groups.name, description: groups.description, scope: groups.scope,
  visibility: groups.visibility, areaCellId: groups.areaCellId };
const membershipFields = { id: members.id, role: members.role, status: members.status };
const live = inArray(members.status, ["requested", "active"]);

function idFrom(value: string) {
  const id = Uuid.safeParse(value);
  if (!id.success) throw new ApiError("NOT_FOUND");
  return id.data;
}

async function groupLock(tx: Tx, id: string) {
  const [group] = await tx.select(fields).from(groups).where(eq(groups.id, id)).for("update");
  if (!group) throw new ApiError("NOT_FOUND");
  return group;
}

export function createGroupHandlers(db: () => Db, session: (request: Request) => Promise<SessionUser>, clock: () => Date) {
  async function active(request: Request) {
    const actor = await session(request);
    if (actor.status !== "active") throw new ApiError("FORBIDDEN");
    return actor.userId;
  }
  return {
    list: withApi(async (request, ctx) => {
      const query = parseQuery(request, GroupQuery);
      return ok(ctx, await db().select(fields).from(groups).where(and(
        ne(groups.visibility, "hidden"),
        query.scope ? eq(groups.scope, query.scope) : undefined,
        query.areaCellId ? eq(groups.areaCellId, query.areaCellId) : undefined,
      )).orderBy(desc(groups.createdAt), desc(groups.id)).limit(50));
    }),
    create: withApi(async (request, ctx) => {
      const actor = await active(request);
      const input = await parseJson(request, CreateGroupInput);
      const data = await db().transaction(async (tx) => {
        const [group] = await tx.insert(groups).values({ ...input, createdBy: actor }).returning(fields);
        await tx.insert(members).values({ groupId: group!.id, userId: actor, role: "admin",
          status: "active", joinedAt: clock() });
        return group;
      });
      return ok(ctx, data, { status: 201 });
    }),
    join: withApi<Params>(async (request, ctx) => {
      const actor = await active(request);
      const id = idFrom(ctx.params.id);
      const data = await db().transaction(async (tx) => {
        const group = await groupLock(tx, id);
        const [existing] = await tx.select(membershipFields).from(members)
          .where(and(eq(members.groupId, id), eq(members.userId, actor), live));
        if (existing) return existing;
        if (group.visibility === "hidden") throw new ApiError("NOT_FOUND");
        const immediate = group.visibility === "open";
        const [member] = await tx.insert(members).values({ groupId: id, userId: actor,
          status: immediate ? "active" : "requested", joinedAt: immediate ? clock() : null }).returning(membershipFields);
        return member;
      });
      return ok(ctx, data);
    }),
    leave: withApi<Params>(async (request, ctx) => {
      const actor = await active(request);
      const id = idFrom(ctx.params.id);
      return ok(ctx, await db().transaction(async (tx) => {
        await groupLock(tx, id);
        const [member] = await tx.select(membershipFields).from(members)
          .where(and(eq(members.groupId, id), eq(members.userId, actor), live));
        if (!member) throw new ApiError("NOT_FOUND");
        if (member.role === "admin") throw new ApiError("CONFLICT", { message: "ابتدا مدیریت گروه را واگذار کنید." });
        const [updated] = await tx.update(members).set({ status: "left", leftAt: clock() })
          .where(eq(members.id, member.id)).returning(membershipFields);
        return updated;
      }));
    }),
    requests: withApi<Params>(async (request, ctx) => {
      const actor = await active(request);
      const id = idFrom(ctx.params.id);
      const database = db();
      await requireGroupRole(database, actor, id, ["admin", "moderator"]);
      const result = await database.select({ ...membershipFields, username: users.username }).from(members)
        .innerJoin(users, eq(members.userId, users.id))
        .where(and(eq(members.groupId, id), live)).orderBy(desc(members.createdAt)).limit(100);
      return ok(ctx, result);
    }),
    review: withApi<Params>(async (request, ctx) => {
      const actor = await active(request);
      const id = idFrom(ctx.params.id);
      const input = await parseJson(request, GroupReviewInput);
      return ok(ctx, await db().transaction(async (tx) => {
        await groupLock(tx, id);
        const managingRole = ["promote", "demote", "transfer_admin"].includes(input.action);
        await requireGroupRole(tx, actor, id, managingRole ? ["admin"] : ["admin", "moderator"]);
        const [member] = await tx.select().from(members)
          .where(and(eq(members.groupId, id), eq(members.id, input.membershipId), live));
        if (!member) throw new ApiError("NOT_FOUND");
        if (member.role === "admin" || member.userId === actor) throw new ApiError("FORBIDDEN");
        if (member.role === "moderator") await requireGroupRole(tx, actor, id, ["admin"]);
        const isRequest = input.action === "approve" || input.action === "reject";
        if ((member.status === "requested") !== isRequest) throw new ApiError("CONFLICT");
        const now = clock();
        if (input.action === "transfer_admin") {
          await tx.update(members).set({ role: "moderator" }).where(and(
            eq(members.groupId, id), eq(members.userId, actor), eq(members.status, "active"), eq(members.role, "admin"),
          ));
          const [promoted] = await tx.update(members).set({ role: "admin" }).where(eq(members.id, member.id)).returning(membershipFields);
          return promoted;
        }
        const changes =
          input.action === "approve" ? { status: "active" as const, joinedAt: now } :
          input.action === "reject" ? { status: "rejected" as const, leftAt: now } :
          input.action === "remove" ? { status: "removed" as const, leftAt: now } :
          { role: input.action === "promote" ? "moderator" as const : "member" as const };
        const [updated] = await tx.update(members).set(changes).where(eq(members.id, member.id)).returning(membershipFields);
        return updated;
      }));
    }),
  };
}

export const groupHandlers = createGroupHandlers(getDb, (request) => authHandlers().requireSession(request), () => new Date());
