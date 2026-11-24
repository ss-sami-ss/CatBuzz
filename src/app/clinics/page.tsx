import Link from "next/link";
import { listClinics } from "@/server/clinics/directory";
import { getDb } from "@/server/db/client";
import { serverEnv } from "@/server/env";
import { ClinicMap } from "./clinic-map";
import { clinicStatus } from "./labels";
import styles from "../cats/cats.module.css";

export const dynamic = "force-dynamic";

export default async function ClinicsPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  const { cursor } = await searchParams;
  let result;
  try {
    result = await listClinics(getDb(), { cursor: typeof cursor === "string" ? cursor : undefined, limit: 20 }, serverEnv().CURSOR_SECRET);
  } catch {
    return <><h1>کلینیک‌های دامپزشکی</h1><p role="alert">فهرست فعلاً در دسترس نیست.</p><Link href="/clinics">بازگشت به ابتدای فهرست</Link></>;
  }
  return <>
    <h1>کلینیک‌های دامپزشکی</h1>
    <ClinicMap clinics={result.items} />
    {result.items.length ? <div className={styles.grid}>
      {result.items.map((item) => <Link className={styles.card} key={item.id} href={"/clinics/" + item.id}>
        <strong>{item.name}</strong><span>{clinicStatus[item.status]}</span>{item.address && <span>{item.address}</span>}
      </Link>)}
    </div> : <p>کلینیکی ثبت نشده است.</p>}
    {result.nextCursor && <Link href={"/clinics?cursor=" + encodeURIComponent(result.nextCursor)}>صفحهٔ بعد</Link>}
  </>;
}
