import postgres from "postgres";
import { runMigrations } from "@/server/db/migrate";

try {
  process.loadEnvFile(".env.local");
} catch {
  // values may come from the shell
}

export const TEST_URL = process.env.DATABASE_URL_TEST ?? "";
if (!/\/catbuzz_test(\?|$)/.test(TEST_URL)) {
  throw new Error("DATABASE_URL_TEST must point at the catbuzz_test database (see .env.example).");
}

/** Redis logical db 1 keeps test counters away from the dev app (db 0). */
export const TEST_REDIS_URL = `${(process.env.REDIS_URL ?? "redis://127.0.0.1:56379").replace(/\/\d+$/, "")}/1`;

/** Drops everything in catbuzz_test and applies all migrations from scratch. */
export async function resetTestDb() {
  const admin = postgres(TEST_URL, { max: 1, onnotice: () => {} });
  await admin.unsafe("DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await admin.end();
  await runMigrations(TEST_URL);
}
