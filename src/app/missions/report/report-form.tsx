"use client";

import Link from "next/link";
import { useReducer, useRef, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import styles from "../../cats/cats.module.css";
import { post, uploadPhoto, validatePhotos } from "../../cats/new/cat-data";

type State = { state: "idle" | "busy" | "saved" | "error"; message?: string };
const reduce = (_state: State, next: State) => next;
export function ReportForm({ catId }: { catId: string }) {
  const [model, dispatch] = useReducer(reduce, { state: "idle" });
  const running = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running.current) return;
    const body = new FormData(event.currentTarget);
    running.current = true;
    dispatch({ state: "busy" });
    try {
      const files = body.getAll("images").filter((item): item is File => item instanceof File && Boolean(item.name));
      if (files.length > 5) throw new Error("حداکثر ۵ عکس انتخاب کنید.");
      validatePhotos(files);
      const description = String(body.get("description") ?? "").trim();
      if (!description) throw new Error("شرح گزارش را وارد کنید.");
      const evidenceIds: string[] = [];
      for (const file of files) evidenceIds.push(await uploadPhoto(file));
      await post("/api/v1/help-requests", {
        target: { kind: "cat", id: catId }, needType: body.get("kind"), urgency: body.get("urgency"), description, evidenceIds,
      });
      dispatch({ state: "saved" });
    } catch (error) {
      dispatch({ state: "error", message: error instanceof Error ? error.message : "ثبت گزارش انجام نشد." });
    } finally { running.current = false; }
  }

  if (model.state === "saved") return <><p role="status">گزارش برای بررسی ثبت شد.</p><Link href="/missions/reports">پیگیری گزارش‌ها</Link></>;
  return <form className={styles.form} onSubmit={submit} aria-busy={model.state === "busy"}>
    <fieldset disabled={model.state === "busy"}>
      <legend>جزئیات گزارش</legend>
      <label>نوع نیاز<select name="kind"><option value="rescue">امداد</option><option value="food_water">آب و غذا</option><option value="transport_to_vet">انتقال به دامپزشک</option><option value="treatment">درمان</option><option value="other">سایر</option></select></label>
      <label>شدت<select name="urgency" defaultValue="normal"><option value="normal">عادی</option><option value="low">کم</option><option value="high">زیاد</option><option value="critical">فوری</option></select></label>
      <TextField name="description" label="شرح گزارش" rows={4} maxLength={2000} required />
      <label>شواهد خصوصی<input name="images" type="file" multiple accept="image/jpeg,image/png,image/webp" /></label>
      {model.state === "error" && <p role="alert" className={styles.error}>{model.message}</p>}
      <Button type="submit">{model.state === "busy" ? "در حال ثبت…" : "ثبت گزارش"}</Button>
    </fieldset>
  </form>;
}
