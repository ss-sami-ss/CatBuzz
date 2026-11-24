import { z } from "zod";
import { IsoDateTime, Uuid } from "./common";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const UploadIntentRequest = z.strictObject({
  kind: z.literal("image"),
  type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.int().min(1).max(MAX_IMAGE_BYTES),
}).meta({ id: "UploadIntentRequest" });

export const UploadIntentDto = z.object({
  id: Uuid,
  uploadUrl: z.string(),
  expiresAt: IsoDateTime,
}).meta({ id: "UploadIntentDto" });

export const ReadyImageDto = z.object({
  id: Uuid,
  mime: z.literal("image/jpeg"),
  size: z.int().positive(),
  status: z.literal("ready"),
}).meta({ id: "ReadyImageDto" });

export const SignedImageDto = z.object({
  downloadUrl: z.string(),
  expiresAt: IsoDateTime,
}).meta({ id: "SignedImageDto" });
