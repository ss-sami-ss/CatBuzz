import { z } from "zod";

/** Server-only environment, validated once on first use. Missing optional providers mean "not configured", never a fake success. */
const ServerEnv = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ORIGIN: z.url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  CURSOR_SECRET: z.string().min(32, "CURSOR_SECRET must be at least 32 characters"),
  EMAIL_SMTP_URL: z.string().optional().transform((v) => v || undefined),
  CREDENTIAL_REVIEWER_IDS: z.string().default("").transform((value) =>
    value.split(",").map((id) => id.trim()).filter(Boolean),
  ).pipe(z.array(z.uuid())).transform((ids) => new Set(ids.map((id) => id.toLowerCase()))),
  TRIAGE_REVIEWER_IDS: z.string().default("").transform((value) =>
    value.split(",").map((id) => id.trim()).filter(Boolean),
  ).pipe(z.array(z.uuid())).transform((ids) => new Set(ids.map((id) => id.toLowerCase()))),
  EMAIL_FROM: z.string().default("CatBuzz <no-reply@catbuzz.local>"),
});

export type ServerEnv = z.infer<typeof ServerEnv>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (!cached) {
    const result = ServerEnv.safeParse(process.env);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
      throw new Error(`Invalid server environment (${fields}). Copy .env.example to .env.local.`);
    }
    cached = result.data;
  }
  return cached;
}
