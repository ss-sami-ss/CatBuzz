import Link from "next/link";
import { HomeExplorer } from "./home/home-explorer";
import styles from "./home/home.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 dir="ltr">CatBuzz</h1>
        <Link href="/account">حساب کاربری</Link>
      </header>
      <HomeExplorer />
    </main>
  );
}
