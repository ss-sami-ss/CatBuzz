import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

export const MIGRATIONS_FOLDER = "./src/server/db/migrations";

/** Applies pending migrations in order inside drizzle's journal table. */
export async function runMigrations(url: string) {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await sql.end();
  }
}

// CLI: npm run db:migrate (loads .env.local; --test targets DATABASE_URL_TEST).
if (process.argv[1]?.endsWith("migrate.ts")) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // optional
  }
  const url = process.argv.includes("--test") ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env.local.");
    process.exit(1);
  }
  runMigrations(url)
    .then(() => console.log("migrations applied"))
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
