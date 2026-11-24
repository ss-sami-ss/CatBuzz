import Link from "next/link";
import { cookies } from "next/headers";
import { resolveSession } from "@/server/auth/auth-service";
import { getDb } from "@/server/db/client";
import { serverEnv } from "@/server/env";
import type { ReactNode } from "react";
import styles from "../cats/cats.module.css";

export default async function MissionLayout({ children }: { children: ReactNode }) {
  const token = (await cookies()).get("catbuzz_session")?.value;
  const session = token ? await resolveSession({ db: getDb(), now: () => new Date() }, token) : null;
  const reviewer = session?.status === "active" && serverEnv().TRIAGE_REVIEWER_IDS.has(session.userId);
  return <main className={styles.page}>
    <nav className={styles.nav} aria-label="مأموریت‌ها"><Link href="/">CatBuzz</Link><Link href="/missions">مأموریت‌ها</Link><Link href="/missions/reports">گزارش‌های کمک</Link><Link href="/cats">پروندهٔ گربه‌ها</Link>{reviewer && <Link href="/missions/review">صف رسیدگی</Link>}</nav>
    {children}
  </main>;
}
