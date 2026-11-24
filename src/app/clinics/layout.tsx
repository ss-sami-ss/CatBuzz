import Link from "next/link";
import type { ReactNode } from "react";
import styles from "../cats/cats.module.css";

export default function ClinicsLayout({ children }: { children: ReactNode }) {
  return <main className={styles.page}>
    <nav className={styles.nav} aria-label="ناوبری کلینیک‌ها"><Link href="/">CatBuzz</Link><Link href="/clinics">فهرست کلینیک‌ها</Link></nav>
    {children}
  </main>;
}
