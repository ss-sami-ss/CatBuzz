import { z } from "zod";
import { IsoDateTime, Uuid } from "./common";

export const HealthCategory = z.enum(["vaccination", "sterilization", "treatment", "medication", "observation", "other"]);
export const HealthReportRequest = z.strictObject({
  category: HealthCategory,
  occurredAt: IsoDateTime,
  note: z.string().trim().min(1).max(2000),
  professional: z.boolean().default(false),
  amendsRecordId: Uuid.optional(),
}).meta({ id: "HealthReportRequest" });
export const ConfirmHealthRequest = z.strictObject({ publish: z.boolean().default(false) })
  .meta({ id: "ConfirmHealthRequest" });
export const CareLogRequest = z.strictObject({
  category: z.enum(["feeding", "observation", "other"]),
  occurredAt: IsoDateTime,
  note: z.string().trim().min(1).max(1000),
}).meta({ id: "CareLogRequest" });
export const PublicHealthRecord = z.object({
  id: Uuid, category: HealthCategory, day: z.iso.date(), confirmed: z.literal(true),
}).meta({ id: "PublicHealthRecord" });

export const PrivateHealthRecord = z.object({
  id: Uuid, source: z.enum(["volunteer", "owner", "vet"]), category: z.string(), details: z.unknown(),
  occurredAt: IsoDateTime, confirmedAt: IsoDateTime.nullable(), amendsRecordId: Uuid.nullable(),
}).meta({ id: "PrivateHealthRecord" });
export const HealthReportReceipt = z.object({ id: Uuid, source: z.enum(["volunteer", "owner", "vet"]) }).meta({ id: "HealthReportReceipt" });
export const HealthConfirmation = z.object({ id: Uuid, confirmed: z.literal(true) }).meta({ id: "HealthConfirmation" });
export const CareLogReceipt = z.object({ id: Uuid }).meta({ id: "CareLogReceipt" });
export const PrivateCareLog = z.object({ id: Uuid, category: z.string(), occurredAt: IsoDateTime, note: z.string().nullable() }).meta({ id: "PrivateCareLog" });
