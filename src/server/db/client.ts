import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/** One pool per process; reused across hot reloads in development. */
const globalForDb = globalThis as unknown as { catbuzzSql?: postgres.Sql };

export function createDb(url: string, options: { max?: number } = {}) {
  const sql = postgres(url, { max: options.max ?? 10 });
  return { sql, db: drizzle(sql, { schema, casing: "snake_case" }) };
}

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and run npm run infra:up.");
  globalForDb.catbuzzSql ??= postgres(url, { max: 10 });
  return drizzle(globalForDb.catbuzzSql, { schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof getDb>;
