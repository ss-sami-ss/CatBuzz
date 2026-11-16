import { z } from "zod";

/**
 * Error codes and their HTTP status (docs/07). Messages are user-facing Persian defaults;
 * a handler may pass a more specific message but never internal details.
 */
export const API_ERRORS = {
  BAD_REQUEST: { status: 400, message: "درخواست قابل‌خواندن نیست." },
  UNAUTHENTICATED: { status: 401, message: "برای ادامه وارد حساب شوید." },
  FORBIDDEN: { status: 403, message: "اجازهٔ این کار را ندارید." },
  NOT_FOUND: { status: 404, message: "پیدا نشد." },
  CONFLICT: { status: 409, message: "این تغییر با وضعیت فعلی سازگار نیست." },
  VERSION_CONFLICT: { status: 409, message: "این مورد هم‌زمان تغییر کرده است. صفحه را تازه کنید و دوباره تلاش کنید." },
  IDEMPOTENCY_KEY_REUSED: { status: 409, message: "این درخواست قبلاً با محتوای دیگری ارسال شده است." },
  MISSION_FULL: { status: 409, message: "ظرفیت مأموریت تکمیل شده است." },
  CAREGIVER_CAPACITY_FULL: { status: 409, message: "ظرفیت نگهدارنده در این بازه تکمیل است." },
  CAT_ALREADY_PLACED: { status: 409, message: "این گربه در این بازه نزد نگهدارندهٔ دیگری است." },
  OPEN_OWNERSHIP_CLAIM: { status: 409, message: "برای این گربه ادعای مالکیت باز وجود دارد." },
  VALIDATION_FAILED: { status: 422, message: "برخی فیلدها نیاز به اصلاح دارند." },
  INVALID_CURSOR: { status: 422, message: "فهرست منقضی شده است. از ابتدا بارگذاری کنید." },
  RATE_LIMITED: { status: 429, message: "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید." },
  INTERNAL: { status: 500, message: "خطای غیرمنتظره رخ داد. دوباره تلاش کنید." },
  SERVICE_UNAVAILABLE: { status: 503, message: "این سرویس هنوز راه‌اندازی نشده یا موقتاً در دسترس نیست." },
} as const satisfies Record<string, { status: number; message: string }>;

export type ApiErrorCode = keyof typeof API_ERRORS;

export const ApiErrorCodeSchema = z.enum(Object.keys(API_ERRORS) as [ApiErrorCode, ...ApiErrorCode[]]);

export const ErrorEnvelope = z
  .object({
    error: z.object({
      code: ApiErrorCodeSchema,
      message: z.string(),
      /** Field path ("observation.observedAt") → messages. Empty when not a field error. */
      fieldErrors: z.record(z.string(), z.array(z.string())),
    }),
    requestId: z.string(),
  })
  .meta({ id: "ErrorEnvelope" });

export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;
