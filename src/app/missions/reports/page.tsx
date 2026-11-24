"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { z } from "zod";
import type { HelpReportDto } from "@/shared/contracts/help";
import styles from "../../cats/cats.module.css";

type Item = z.output<typeof HelpReportDto>;
const labels = { open: "در انتظار بررسی", triaged: "ارجاع شده", in_progress: "در حال رسیدگی",
  resolved: "پاسخ داده شده", closed: "بسته شده", rejected: "رد شده" };

export default function ReportsPage() {
  const [state, setState] = useState<{ kind: "loading" | "gated" | "error" } | { kind: "ready"; items: Item[] }>({ kind: "loading" });
  useEffect(() => {
    const abort = new AbortController();
    void fetch("/api/v1/help-requests", { cache: "no-store", signal: abort.signal }).then(async (res) => {
      if (res.status === 401 || res.status === 403) return setState({ kind: "gated" });
      if (!res.ok) throw new Error();
      const { data } = await res.json() as { data: Item[] };
      setState({ kind: "ready", items: data });
    }).catch(() => { if (!abort.signal.aborted) setState({ kind: "error" }); });
    return () => abort.abort();
  }, []);

  return <>
    <h1>گزارش‌های کمک</h1>
    {state.kind === "loading" && <p role="status">در حال بارگذاری گزارش‌ها…</p>}
    {state.kind === "gated" && <p>برای پیگیری <Link href="/account">وارد حساب کاربری شوید</Link>.</p>}
    {state.kind === "error" && <p role="alert">گزارش‌ها در دسترس نیستند. صفحه را دوباره بارگذاری کنید.</p>}
    {state.kind === "ready" && (state.items.length === 0 ? <p>گزارشی برای نمایش وجود ندارد.</p> :
      <div className={styles.grid}>{state.items.map((item) => <article key={item.id} className={styles.card}>
        <h2>{labels[item.status]}</h2>
        <p>{item.description}</p>
        {item.deadlineAt && <p>مهلت <time dateTime={item.deadlineAt}>{new Date(item.deadlineAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}</time></p>}
        {item.response && <p>پاسخ: {item.response}</p>}
      </article>)}</div>)}
  </>;
}
