import Link from "next/link";
import { CatNeed } from "@/shared/contracts/cats";
import { getDb } from "@/server/db/client";
import { listCats } from "@/server/cats/cat-service";
import { serverEnv } from "@/server/env";
import { ApiError } from "@/server/http/api-error";
import { needLabels } from "../home/discovery";
import { dateFormat } from "./labels";
import styles from "./cats.module.css";

export const dynamic = "force-dynamic";

export default async function CatsPage({ searchParams }: { searchParams: Promise<{ need?: string; cursor?: string }> }) {
  const query = await searchParams;
  const need = CatNeed.safeParse(query.need).data;
  const selected = need ? "?need=" + need : "";
  let page;
  try {
    page = await listCats(getDb(), { limit: 20, cursor: typeof query.cursor === "string" ? query.cursor : undefined, needs: need ? [need] : undefined }, serverEnv().CURSOR_SECRET);
  } catch (error) {
    return (
      <>
        <h1>پروندهٔ گربه‌ها</h1>
        <p role="alert" className={styles.error}>{error instanceof ApiError && error.code === "INVALID_CURSOR" ? "این صفحه از فهرست منقضی شده است." : "فهرست فعلاً در دسترس نیست."}</p>
        <Link href={"/cats" + selected}>بارگذاری از ابتدای فهرست</Link>
      </>
    );
  }

  return (
    <>
      <h1>پروندهٔ گربه‌ها</h1>
      <nav className={styles.filters} aria-label="فیلتر نیاز">
        <Link href="/cats" aria-current={!need ? "page" : undefined}>همه</Link>
        {CatNeed.options.map((item) => (
          <Link key={item} href={"/cats?need=" + item} aria-current={need === item ? "page" : undefined}>{needLabels[item]}</Link>
        ))}
      </nav>
      {page.items.length ? (
        <div className={styles.grid}>
          {page.items.map((cat) => (
            <Link className={styles.card} href={"/cats/" + cat.id} key={cat.id}>
              <strong>{cat.name ?? "گربهٔ بی‌نام"}</strong>
              <span>{cat.publicArea.label}</span>
              <time className={styles.muted} dateTime={cat.lastSeenAt}>آخرین مشاهده {dateFormat.format(new Date(cat.lastSeenAt))}</time>
            </Link>
          ))}
        </div>
      ) : <p>پرونده‌ای برای این فیلتر پیدا نشد.</p>}
      {page.nextCursor && <Link href={"/cats" + (selected ? selected + "&" : "?") + "cursor=" + encodeURIComponent(page.nextCursor)}>صفحهٔ بعد</Link>}
    </>
  );
}
