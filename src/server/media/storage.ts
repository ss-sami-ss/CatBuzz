import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ApiError } from "../http/api-error";

type Settings = { endpoint: string; region: string; bucket: string; accessKeyId: string; secretAccessKey: string };

export function createMediaStorage(settings: Settings) {
  const client = new S3Client({
    endpoint: settings.endpoint,
    region: settings.region,
    credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  const Bucket = settings.bucket;
  return {
    async read(Key: string, maximum: number) {
      try {
        const result = await client.send(new GetObjectCommand({ Bucket, Key }), { abortSignal: AbortSignal.timeout(10000) });
        if (!result.Body) return null;
        if (result.ContentLength === undefined || result.ContentLength > maximum) {
          const stream = result.Body as NodeJS.ReadableStream & { destroy?: () => void };
          stream.destroy?.();
          throw new ApiError("VALIDATION_FAILED");
        }
        const bytes = await result.Body.transformToByteArray();
        if (bytes.byteLength > maximum) throw new ApiError("VALIDATION_FAILED");
        return bytes;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if (error && typeof error === "object" && "$metadata" in error &&
          (error.$metadata as { httpStatusCode?: number }).httpStatusCode === 404) return null;
        throw new ApiError("SERVICE_UNAVAILABLE");
      }
    },
    async write(Key: string, Body: Uint8Array, ContentType: string) {
      try {
        await client.send(new PutObjectCommand({ Bucket, Key, Body, ContentType }), { abortSignal: AbortSignal.timeout(10000) });
      } catch {
        throw new ApiError("SERVICE_UNAVAILABLE");
      }
    },
    async remove(Key: string) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket, Key }), { abortSignal: AbortSignal.timeout(10000) });
      } catch {
        throw new ApiError("SERVICE_UNAVAILABLE");
      }
    },
  };
}

export type MediaStorage = ReturnType<typeof createMediaStorage>;
let storage: MediaStorage | undefined;

export function getMediaStorage() {
  if (!storage) {
    const { STORAGE_ENDPOINT, STORAGE_REGION, STORAGE_BUCKET_PRIVATE, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY } = process.env;
    if (!STORAGE_ENDPOINT || !STORAGE_REGION || !STORAGE_BUCKET_PRIVATE || !STORAGE_ACCESS_KEY || !STORAGE_SECRET_KEY) {
      throw new ApiError("SERVICE_UNAVAILABLE", { message: "ذخیره‌سازی عکس راه‌اندازی نشده است." });
    }
    storage = createMediaStorage({
      endpoint: STORAGE_ENDPOINT, region: STORAGE_REGION, bucket: STORAGE_BUCKET_PRIVATE,
      accessKeyId: STORAGE_ACCESS_KEY, secretAccessKey: STORAGE_SECRET_KEY,
    });
  }
  return storage;
}
