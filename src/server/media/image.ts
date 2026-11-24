import sharp from "sharp";
import { MAX_IMAGE_BYTES } from "@/shared/contracts/uploads";
import { ApiError } from "../http/api-error";

const MAX_PIXELS = 24_000_000;
const signatures = {
  "image/jpeg": (bytes: Buffer) => bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])),
  "image/png": (bytes: Buffer) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  "image/webp": (bytes: Buffer) => bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP",
};

function invalidImage() {
  return new ApiError("VALIDATION_FAILED", { message: "محتوا، ابعاد یا نوع عکس معتبر نیست." });
}

export async function sanitizeImage(bytes: Uint8Array, mime: string) {
  const buffer = Buffer.from(bytes);
  const signature = signatures[mime as keyof typeof signatures];
  if (!signature?.(buffer)) throw invalidImage();
  try {
    const pipeline = sharp(buffer, { failOn: "warning", limitInputPixels: MAX_PIXELS });
    const metadata = await pipeline.metadata();
    if (!metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1) throw invalidImage();
    const output = await pipeline.rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer();
    if (output.byteLength > MAX_IMAGE_BYTES) throw invalidImage();
    return output;
  } catch {
    throw invalidImage();
  }
}
