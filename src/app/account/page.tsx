import Link from "next/link";
import { AccountView } from "./account-view";
import styles from "./account.module.css";

export default function AccountPage() {
  return (
    <main className={styles.page}>
      <Link href="/">CatBuzz</Link>
      <h1>حساب کاربری</h1>
      <AccountView />
    </main>
  );
}
