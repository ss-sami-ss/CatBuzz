import { z } from "zod";
import { Uuid } from "./common";

export const GroupScope = z.enum(["public", "local"]);
const PublicCell = z.string().regex(/^g0\.01:-?\d{1,5}:-?\d{1,5}$/).refine((cell) => {
  const [, x, y] = cell.split(":").map(Number);
  return x! >= -18000 && x! < 18000 && y! >= -9000 && y! < 9000;
});
export const GroupQuery = z.object({ scope: GroupScope.optional(), areaCellId: PublicCell.optional() });
export const CreateGroupInput = z.strictObject({
  name: z.string().trim().min(2).max(80), description: z.string().trim().max(500).optional(),
  scope: GroupScope, visibility: z.enum(["open", "request", "hidden"]), areaCellId: PublicCell.optional(),
}).refine((value) => (value.scope === "local") === Boolean(value.areaCellId)).meta({ id: "CreateGroupInput" });
export const GroupDto = z.object({
  id: Uuid, name: z.string(), description: z.string().nullable(), scope: GroupScope,
  visibility: z.enum(["open", "request", "hidden"]), areaCellId: z.string().nullable(),
}).meta({ id: "GroupDto" });
export const GroupMembershipDto = z.object({
  id: Uuid, role: z.enum(["member", "moderator", "admin"]),
  status: z.enum(["requested", "active", "left", "removed", "rejected"]),
}).meta({ id: "GroupMembershipDto" });
export const GroupMemberEntry = GroupMembershipDto.extend({ username: z.string().nullable() }).meta({ id: "GroupMemberEntry" });
export const GroupReviewInput = z.strictObject({
  membershipId: Uuid, action: z.enum(["approve", "reject", "remove", "promote", "demote", "transfer_admin"]),
}).meta({ id: "GroupReviewInput" });
