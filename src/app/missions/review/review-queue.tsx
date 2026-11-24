"use client";

import { useEffect, useReducer, useRef, type FormEvent } from "react";
import Link from "next/link";
import type { HelpReportDto } from "@/shared/contracts/help";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { post, send } from "../../cats/new/cat-data";
import styles from "../../cats/cats.module.css";

type Report = z.output<typeof HelpReportDto>;
type Reviewer = { id: string; username: string | null };
type Action = "triage" | "create" | "resolve";
type Model = { reports: Report[]; pending: boolean; error: string; notice: string };
const initial: Model = { reports: [], pending: true, error: "", notice: "" };
const labels = { low: "کم", normal: "عادی", high: "زیاد", critical: "فوری" };
const missionNames = { transport: "جابه‌جایی", feeding: "غذا و آب", vet_visit: "ویزیت دامپزشکی", trapping: "زنده‌گیری", foster: "نگهداری موقت", medication: "دارورسانی", other: "سایر" };
const capabilities = { feeding: "غذارسانی", transport: "جابه‌جایی", foster: "نگهداری موقت", trapping: "زنده‌گیری", fundraising: "جمع‌آوری کمک", photography: "عکاسی", medication: "دارورسانی" };

function futureDate(form: FormData, name: string) {
  const date = new Date(String(form.get(name) ?? ""));
  if (!(date.getTime() > Date.now())) throw new Error("زمان انتخاب‌شده باید در آینده باشد.");
  return date.toISOString();
}

export function ReviewQueue({ actorId, reviewers }: { actorId: string; reviewers: Reviewer[] }) {
  const [model, dispatch] = useReducer((previous: Model, change: Partial<Model>) => ({ ...previous, ...change }), initial);
  const running = useRef(false);

  async function refresh(signal?: AbortSignal) {
    const reports = await send<Report[]>("/api/v1/help-requests", { method: "GET", signal });
    dispatch({ reports, pending: false });
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal).catch(() => {
      if (!controller.signal.aborted) dispatch({ error: "صف گزارش‌ها در دسترس نیست.", pending: false });
    });
    return () => controller.abort();
  }, []);

  async function act(event: FormEvent<HTMLFormElement>, report: Report, action: Action) {
    event.preventDefault();
    if (running.current) return;
    const form = new FormData(event.currentTarget);
    running.current = true;
    dispatch({ pending: true, error: "", notice: "" });
    try {
      const base = "/api/v1/help-requests/" + report.id;
      if (action === "triage") {
        await post(base + "/triage", { version: report.version, urgency: form.get("urgency"), ownerId: form.get("owner"), deadlineAt: futureDate(form, "deadline") });
      } else if (action === "create") {
        const capability = form.get("capability");
        await post("/api/v1/missions", { reportId: report.id, type: form.get("type"), capacity: Number(form.get("capacity")),
          dueAt: futureDate(form, "dueAt"), requiredCapability: capability || undefined });
      } else {
        const response = String(form.get("response") ?? "").trim();
        if (!response) throw new Error("پاسخ گزارش را وارد کنید.");
        await post(base + "/resolve", { version: report.version, response });
      }
      dispatch({ notice: action === "create" ? "مأموریت ساخته شد." : "تغییر گزارش ثبت شد." });
      await refresh();
    } catch (error) {
      dispatch({ error: error instanceof Error ? error.message : "عملیات انجام نشد.", pending: false });
    } finally { running.current = false; }
  }

  return <section aria-busy={model.pending}>
    {model.pending && <p role="status">در حال بارگذاری یا ثبت تغییر…</p>}
    {model.error && <p role="alert">{model.error} <Button variant="secondary" disabled={model.pending} onClick={() => {
      dispatch({ pending: true, error: "" });
      void refresh().catch(() => dispatch({ error: "صف گزارش‌ها در دسترس نیست.", pending: false }));
    }}>تازه‌سازی صف</Button></p>}
    {model.notice && <p role="status">{model.notice} {model.notice === "مأموریت ساخته شد." && <Link href="/missions">مشاهدهٔ مأموریت‌ها</Link>}</p>}
    {!model.pending && !model.error && model.reports.length === 0 && <p>گزارش بازی برای رسیدگی وجود ندارد.</p>}
    {model.reports.map((report) => <article key={report.id} className={styles.card}>
      <h2>{labels[report.urgency]}</h2>
      <p>{report.description || "گزارش بدون شرح"}</p>
      {report.catId && <Link href={"/cats/" + report.catId}>پروندهٔ گربه</Link>}
      {report.evidenceIds.map((id, index) => <a key={id} href={"/api/v1/help-requests/" + report.id + "/evidence/" + id}>
        عکس خصوصی {(index + 1).toLocaleString("fa-IR")}
      </a>)}
      <form className={styles.form} onSubmit={(event) => void act(event, report, "triage")}>
        <fieldset disabled={model.pending}>
          <legend>ارجاع گزارش</legend>
          <label>شدت<select name="urgency" defaultValue={report.urgency}>{Object.entries(labels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label>مسئول رسیدگی<select name="owner" defaultValue={report.ownerId ?? actorId}>{reviewers.map((reviewer, index) =>
            <option key={reviewer.id} value={reviewer.id}>{reviewer.id === actorId ? "خودم" : reviewer.username ?? "بازبین " + (index + 1).toLocaleString("fa-IR")}</option>)}</select></label>
          <label>مهلت رسیدگی<input name="deadline" type="datetime-local" required /></label>
          <Button type="submit">ثبت ارجاع</Button>
        </fieldset>
      </form>
      {report.ownerId === actorId && report.status !== "open" && <>
        <form className={styles.form} onSubmit={(event) => void act(event, report, "create")}>
          <fieldset disabled={model.pending}>
            <legend>ساخت مأموریت</legend>
            <label>نوع مأموریت<select name="type">{Object.entries(missionNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            <label>مهارت لازم<select name="capability"><option value="">بدون شرط مهارت</option>{Object.entries(capabilities).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            <TextField type="number" label="ظرفیت" name="capacity" min={1} max={50} defaultValue="1" required />
            <label>مهلت مأموریت<input name="dueAt" type="datetime-local" required /></label>
            <Button type="submit">ساخت مأموریت</Button>
          </fieldset>
        </form>
        <form className={styles.form} onSubmit={(event) => void act(event, report, "resolve")}>
          <TextField label="پاسخ نهایی گزارش" name="response" rows={3} required maxLength={2000} disabled={model.pending} />
          <Button type="submit" disabled={model.pending}>پایان رسیدگی</Button>
        </form>
      </>}
    </article>)}
  </section>;
}
