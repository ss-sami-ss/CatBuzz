import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./cats.module.css";

export default function CatsLayout({ children }: { children: ReactNode }) {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="پروندهٔ گربه‌ها">
        <Link href="/">CatBuzz</Link>
        <Link href="/cats">فهرست پرونده‌ها</Link>
        <Link href="/cats/new">ثبت گربه</Link>
      </nav>
      {children}
    </main>
  );
}
