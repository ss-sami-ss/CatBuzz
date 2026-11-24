import Link from "next/link";
import type { ReactNode } from "react";
import styles from "../cats/cats.module.css";

export default function MissionLayout({ children }: { children: ReactNode }) {
  return <main className={styles.page}>
    <nav className={styles.nav} aria-label="مأموریت‌ها"><Link href="/">CatBuzz</Link><Link href="/missions">مأموریت‌ها</Link><Link href="/missions/reports">گزارش‌های کمک</Link><Link href="/cats">پروندهٔ گربه‌ها</Link></nav>
    {children}
  </main>;
}
