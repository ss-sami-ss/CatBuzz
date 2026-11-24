import Link from "next/link";
import { HomeExplorer } from "./home/home-explorer";
import styles from "./home/home.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <a href="#discover" className={styles.skip}>رفتن به جست‌وجو</a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} dir="ltr"><span aria-hidden="true">✦</span>CatBuzz</Link>
        <nav aria-label="ناوبری اصلی" className={styles.nav}>
          <Link href="/cats">پروندهٔ گربه‌ها</Link>
          <Link href="/clinics">کلینیک‌ها</Link>
          <Link href="/account">حساب کاربری</Link>
        </nav>
      </header>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <h1 id="hero-title">حواس‌مان به گربه‌های محله هست.</h1>
          <p>گربه‌ای دیده‌اید؟ مشاهده را ثبت کنید یا پرونده‌های محله را ورق بزنید.</p>
          <div className={styles.actions}>
            <Link href="/cats/new" className={styles.primaryLink}>ثبت گربه <span aria-hidden="true">＋</span></Link>
            <a href="#discover" className={styles.secondaryLink}>دیدن نقشه <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <div className={styles.illustration} aria-hidden="true">
          <span className={styles.orbit} />
          <span className={styles.sparkOne}>✦</span><span className={styles.sparkTwo}>✧</span>
          <span className={styles.catFace}>
            <span className={styles.earOne} /><span className={styles.earTwo} />
            <span className={styles.catMask}><span className={styles.catEyes} /><span className={styles.catNose} /></span>
          </span>
          <span className={styles.planet} />
        </div>
      </section>
      <HomeExplorer />
    </main>
  );
}
