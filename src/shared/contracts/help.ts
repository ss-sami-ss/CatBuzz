import { z } from "zod";
import { IsoDateTime, Uuid, Version } from "./common";

export const Urgency = z.enum(["low", "normal", "high", "critical"]);
export const HelpRequestInput = z.strictObject({
  target: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("cat"), id: Uuid }),
    z.object({ kind: z.literal("colony"), id: Uuid }),
  ]),
  needType: z.enum(["food_water", "rescue", "transport_to_vet", "treatment", "other"]),
  urgency: Urgency,
  description: z.string().trim().min(1).max(2000),
  evidenceIds: z.array(Uuid).max(5).default([]),
}).meta({ id: "HelpRequestInput" });

export const TriageInput = z.strictObject({
  version: Version,
  urgency: Urgency,
  ownerId: Uuid,
  deadlineAt: IsoDateTime,

}).meta({ id: "TriageInput" });
export const ResolveHelpInput = z.strictObject({
  version: Version,
  response: z.string().trim().min(1).max(2000),
}).meta({ id: "ResolveHelpInput" });
export const HelpReportDto = z.object({
  id: Uuid, catId: Uuid.nullable(), colonyId: Uuid.nullable(), needType: z.string(),
  urgency: Urgency, status: z.enum(["open", "triaged", "in_progress", "resolved", "closed", "rejected"]),
  description: z.string().nullable(), ownerId: Uuid.nullable(), deadlineAt: IsoDateTime.nullable(),
  resolvedAt: IsoDateTime.nullable(), response: z.string().nullable(), version: Version,
  createdAt: IsoDateTime, evidenceIds: z.array(Uuid),
}).meta({ id: "HelpReportDto" });
