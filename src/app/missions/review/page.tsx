import { and, asc, eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import Link from "next/link";
import { resolveSession } from "@/server/auth/auth-service";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { serverEnv } from "@/server/env";
import { ReviewQueue } from "./review-queue";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const token = (await cookies()).get("catbuzz_session")?.value;
  const db = getDb();
  const session = token ? await resolveSession({ db, now: () => new Date() }, token) : null;
  const allowed = serverEnv().TRIAGE_REVIEWER_IDS;
  if (!session || session.status !== "active" || !allowed.has(session.userId)) {
    return <><h1>رسیدگی به گزارش‌ها</h1><p>این بخش برای بازبین‌های مجاز در دسترس است.</p><Link href="/account">حساب کاربری</Link></>;
  }
  const reviewers = await db.select({ id: users.id, username: users.username }).from(users)
    .where(and(eq(users.status, "active"), inArray(users.id, [...allowed]))).orderBy(asc(users.username), asc(users.id));
  return <><h1>رسیدگی به گزارش‌ها</h1><ReviewQueue actorId={session.userId} reviewers={reviewers} /></>;
}
