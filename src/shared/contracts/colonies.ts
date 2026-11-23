import { z } from "zod";
import { IsoDateTime, PrivatePoint, PublicArea, Uuid, Version } from "./common";

const name = z.string().trim().min(1).max(60);
export const CreateColonyRequest = z.strictObject({ name, location: PrivatePoint }).meta({ id: "CreateColonyRequest" });
export const UpdateColonyRequest = z.strictObject({
  name: name.optional(),
  location: PrivatePoint.optional(),
  version: Version,
}).refine((value) => value.name !== undefined || value.location !== undefined).meta({ id: "UpdateColonyRequest" });
export const PublicColony = z.object({
  id: Uuid,
  name,
  publicArea: PublicArea,
  version: Version,
}).meta({ id: "PublicColony" });
export const ChangeMembershipRequest = z.strictObject({
  catId: Uuid,
  action: z.enum(["join", "leave"]),
  at: IsoDateTime,
  version: Version,
}).meta({ id: "ChangeMembershipRequest" });
export const ChangeCaretakerRequest = z.strictObject({
  userId: Uuid,
  action: z.enum(["assign", "remove"]),
  version: Version,
}).meta({ id: "ChangeCaretakerRequest" });
