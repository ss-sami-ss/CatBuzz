import { z } from "zod";
import { Capability } from "./users";
import { IsoDateTime, Uuid, Version } from "./common";

export const MissionType = z.enum(["transport", "feeding", "vet_visit", "trapping", "foster", "medication", "other"]);
export const MissionStatus = z.enum(["open", "full", "in_progress", "completed", "cancelled"]);
export const MissionQuery = z.object({ type: MissionType.optional(), status: MissionStatus.optional() });
export const CreateMissionInput = z.strictObject({
  reportId: Uuid, type: MissionType, capacity: z.int().min(1).max(50),
  requiredCapability: Capability.optional(), dueAt: IsoDateTime,
}).meta({ id: "CreateMissionInput" });
export const MissionAcceptanceInput = z.strictObject({
  version: Version, role: z.enum(["volunteer", "veterinarian"]),
}).meta({ id: "MissionAcceptanceInput" });
export const MissionUpdateInput = z.strictObject({
  version: Version,
  event: z.enum(["withdraw", "submit_result", "complete"]),
  note: z.string().trim().min(1).max(1500).optional(),
  evidenceIds: z.array(Uuid).max(5).default([]),
}).refine((input) => input.event === "submit_result" ? Boolean(input.note) : input.evidenceIds.length === 0)
  .meta({ id: "MissionUpdateInput" });
export const MissionDto = z.object({
  id: Uuid, type: MissionType, status: MissionStatus, capacity: z.int().positive(),
  acceptedCount: z.int().nonnegative(), requiredCapability: Capability.nullable(), dueAt: IsoDateTime.nullable(), version: Version,
}).meta({ id: "MissionDto" });
export const MissionListItem = MissionDto.extend({ myRole: z.string().nullable(), canComplete: z.boolean() }).meta({ id: "MissionListItem" });
export const AcceptanceDto = z.object({ assignmentId: Uuid, mission: MissionDto }).meta({ id: "AcceptanceDto" });
