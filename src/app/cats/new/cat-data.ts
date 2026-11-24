import { MAX_IMAGE_BYTES } from "@/shared/contracts/uploads";

type ApiResult<T> = { data: T };
type ApiFailure = { error?: { code?: string; message?: string } };

export async function send<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as ApiFailure;
    throw new Error(result.error?.message ?? "ارتباط با سرور برقرار نشد.");
  }
  if (response.status === 204) return undefined as T;
  return ((await response.json()) as ApiResult<T>).data;
}

export function post<T>(url: string, body?: unknown) {
  return send<T>(url, {
    method: "POST",
    ...(body !== undefined && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
}

export function validatePhotos(files: File[]) {
  if (files.length > 10) throw new Error("حداکثر ۱۰ عکس انتخاب کنید.");
  if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > MAX_IMAGE_BYTES)) {
    throw new Error("هر عکس باید JPEG، PNG یا WebP و حداکثر ۸ مگابایت باشد.");
  }
}

export async function uploadPhoto(file: File) {
  const { id, uploadUrl } = await post<{ id: string; uploadUrl: string }>("/api/v1/uploads/intents", {
    kind: "image", type: file.type, size: file.size,
  });
  await send(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  await post("/api/v1/uploads/" + id + "/complete");
  return id;
}
