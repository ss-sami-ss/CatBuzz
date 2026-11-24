import Link from "next/link";
import { HomeExplorer } from "./home/home-explorer";
import styles from "./home/home.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 dir="ltr">CatBuzz</h1>
        <nav aria-label="ناوبری اصلی" className={styles.filters}><Link href="/cats">پروندهٔ گربه‌ها</Link><Link href="/cats/new">ثبت گربه</Link><Link href="/account">حساب کاربری</Link></nav>
      </header>
      <HomeExplorer />
    </main>
  );
}
