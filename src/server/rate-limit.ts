import type { Redis } from "ioredis";
import { ApiError } from "./http/api-error";

export type RateRule = { name: string; limit: number; windowSec: number };

/**
 * Fixed-window counter in Redis, shared by every app instance (docs/09). Throws RATE_LIMITED
 * with Retry-After seconds once the window is used up.
 */
export async function enforceRate(redis: Redis, rule: RateRule, subject: string): Promise<void> {
  const key = `rl:${rule.name}:${subject}`;
  let results: [Error | null, unknown][] | null;
  try {
    results = await redis.multi().incr(key).expire(key, rule.windowSec, "NX").ttl(key).exec();
  } catch {
    // Fail closed: without the shared counter we cannot protect OTP and similar endpoints.
    throw new ApiError("SERVICE_UNAVAILABLE", { message: "سرویس موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید." });
  }
  const count = Number(results?.[0]?.[1] ?? 0);
  const ttl = Number(results?.[2]?.[1] ?? rule.windowSec);
  if (count > rule.limit) {
    throw new RateLimitedError(ttl > 0 ? ttl : rule.windowSec);
  }
}

export class RateLimitedError extends ApiError {
  readonly retryAfterSec: number;

  constructor(retryAfterSec: number) {
    super("RATE_LIMITED");
    this.retryAfterSec = retryAfterSec;
  }
}
