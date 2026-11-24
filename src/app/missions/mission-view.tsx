"use client";

import { useEffect, useReducer, useRef, type FormEvent } from "react";
import Link from "next/link";
import type { z } from "zod";
import type { MissionListItem } from "@/shared/contracts/missions";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import styles from "../cats/cats.module.css";

const labels = { transport: "جابه‌جایی", feeding: "غذا و آب", vet_visit: "ویزیت دامپزشکی",
  trapping: "زنده‌گیری", foster: "نگهداری موقت", medication: "دارورسانی", other: "سایر" };
const statuses = { open: "آمادهٔ پذیرش", full: "ظرفیت تکمیل", in_progress: "در حال انجام", completed: "تکمیل‌شده", cancelled: "لغوشده" };
type Item = z.output<typeof MissionListItem>;
type Model = { items: Item[]; gate: boolean; error: string; busy: boolean; notice: string };
type Intent = Partial<Model>;
const initial: Model = { items: [], gate: false, error: "", busy: true, notice: "" };
const reduce = (state: Model, intent: Intent) => ({ ...state, ...intent });

export function MissionView() {
  const [model, dispatch] = useReducer(reduce, initial);
  const running = useRef(false);
  const attempts = useRef(new Map<string, string>());

  async function refresh(signal?: AbortSignal) {
    const res = await fetch("/api/v1/missions", { cache: "no-store", signal });
    if (res.status === 401 || res.status === 403) {
      dispatch({ gate: true, busy: false, items: [] });
      return;
    }
    if (!res.ok) throw new Error("فهرست مأموریت‌ها در دسترس نیست.");
    const { data } = await res.json() as { data: Item[] };
    dispatch({ items: data, busy: false, gate: false });
  }
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal).catch(() => {
      if (!controller.signal.aborted) dispatch({ error: "فهرست مأموریت‌ها در دسترس نیست.", busy: false });
    });
    return () => controller.abort();
  }, []);

  async function act(item: Item, event: "accept" | "withdraw" | "submit_result" | "complete", note?: string) {
    if (running.current) return;
    running.current = true;
    dispatch({ busy: true, error: "", notice: "" });
    const attempt = item.id + ":" + item.version;
    try {
      const accepting = event === "accept";
      const key = accepting ? attempts.current.get(attempt) ?? crypto.randomUUID() : undefined;
      if (key) attempts.current.set(attempt, key);
      const res = await fetch("/api/v1/missions/" + item.id + (accepting ? "/acceptances" : "/updates"), {
        method: "POST", headers: { "Content-Type": "application/json", ...(key && { "Idempotency-Key": key }) },
        body: JSON.stringify(accepting
          ? { version: item.version, role: item.type === "vet_visit" ? "veterinarian" : "volunteer" }
          : { version: item.version, event, note }),
      });
      const response = await res.json();
      if (!res.ok) {
        if (res.status === 409) await refresh();
        throw new Error(response.error?.message ?? "عملیات انجام نشد.");
      }
      attempts.current.delete(attempt);
      dispatch({ notice: "تغییر مأموریت ثبت شد." });
      await refresh();
    } catch (error) {
      dispatch({ error: error instanceof Error ? error.message : "عملیات انجام نشد.", busy: false });
    } finally {
      running.current = false;
    }
  }

  if (model.gate) return <p>برای دیدن مأموریت‌ها <Link href="/account">وارد حساب کاربری شوید</Link>.</p>;
  function submit(event: FormEvent<HTMLFormElement>, item: Item) {
    event.preventDefault();
    const note = String(new FormData(event.currentTarget).get("note")).trim();
    if (note) void act(item, "submit_result", note);
  }

  return <section aria-busy={model.busy}>
    {model.busy && <p role="status">در حال بارگذاری یا ثبت تغییر…</p>}
    {model.error && <p role="alert" className={styles.error}>{model.error} <Button variant="secondary" onClick={() => void refresh().catch(() => {})}>تازه‌سازی</Button></p>}
    {model.notice && <p role="status">{model.notice}</p>}
    {!model.busy && !model.error && !model.items.length && <p>مأموریت فعالی وجود ندارد.</p>}
    <div className={styles.grid}>
      {model.items.map((item) => <article key={item.id} className={styles.card}>
        <h2>{labels[item.type]}</h2>
        <p>{statuses[item.status]} · {item.acceptedCount.toLocaleString("fa-IR")} از {item.capacity.toLocaleString("fa-IR")}</p>
        {item.dueAt && <p>مهلت <time dateTime={item.dueAt}>{new Date(item.dueAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })}</time></p>}
        {!item.myRole && item.acceptedCount < item.capacity && <Button disabled={model.busy} onClick={() => void act(item, "accept")}>پذیرش</Button>}
        {item.myRole && <>
          <form onSubmit={(event) => submit(event, item)} className={styles.form}>
            <TextField name="note" label="نتیجهٔ مأموریت" maxLength={1500} required disabled={model.busy} />
            <Button type="submit" disabled={model.busy}>ثبت نتیجه</Button>
          </form>
          <Button variant="secondary" disabled={model.busy} onClick={() => void act(item, "withdraw")}>انصراف</Button>
        </>}
        {item.canComplete && <Button disabled={model.busy} onClick={() => void act(item, "complete")}>تأیید پایان</Button>}
      </article>)}
    </div>
  </section>;
}
