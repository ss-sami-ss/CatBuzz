import { z } from "zod";
import { LngLat, Uuid } from "./common";

const Clock = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/);
export const OpeningHours = z.array(z.object({
  weekday: z.int().min(0).max(6), opens: Clock, closes: Clock,
})).max(28);
export const PublicClinic = z.object({
  id: Uuid, name: z.string(), address: z.string().nullable(), center: LngLat.nullable(),
  phone: z.string().nullable(), timezone: z.string(), services: z.array(z.string()),
  openingHours: OpeningHours, status: z.enum(["unverified", "pending", "verified", "rejected"]),
}).meta({ id: "PublicClinic" });
export type PublicClinic = z.output<typeof PublicClinic>;
