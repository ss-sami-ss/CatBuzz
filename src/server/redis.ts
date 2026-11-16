import { Redis } from "ioredis";

const globalForRedis = globalThis as unknown as { catbuzzRedis?: Redis };

/** Shared connection for rate limits (and BullMQ later, T26). Reused across dev hot reloads. */
export function getRedis(url: string): Redis {
  globalForRedis.catbuzzRedis ??= new Redis(url, { maxRetriesPerRequest: 2, connectTimeout: 5_000 });
  return globalForRedis.catbuzzRedis;
}
