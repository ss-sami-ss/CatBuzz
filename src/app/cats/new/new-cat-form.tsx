"use client";

import { useCallback, useReducer, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { ageLabels, sexLabels } from "../labels";
import styles from "../cats.module.css";
import { post, uploadPhoto, validatePhotos } from "./cat-data";
import { LocationPicker } from "./location-picker";

type Model = { lng: string; lat: string; showMap: boolean; progress: string | null; error: string | null };
type Intent =
  | { type: "coordinate"; axis: "lng" | "lat"; value: string }
  | { type: "map" }
  | { type: "point"; lng: number; lat: number }
  | { type: "progress"; message: string }
  | { type: "error"; message: string };

function reducer(model: Model, intent: Intent): Model {
  switch (intent.type) {
    case "coordinate": return { ...model, [intent.axis]: intent.value };
    case "map": return { ...model, showMap: !model.showMap };
    case "point": return { ...model, lng: intent.lng.toFixed(6), lat: intent.lat.toFixed(6) };
    case "progress": return { ...model, progress: intent.message, error: null };
    case "error": return { ...model, error: intent.message, progress: null };
  }
}

export function NewCatForm() {
  const [model, dispatch] = useReducer(reducer, { lng: "", lat: "", showMap: false, progress: null, error: null });
  const inFlight = useRef(false);
  const uploaded = useRef(new Map<File, string>());
  const router = useRouter();
  const choose = useCallback((point: { lng: number; lat: number }) => dispatch({ type: "point", ...point }), []);
  const busy = model.progress !== null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = new FormData(event.currentTarget);
    const files = form.getAll("photos").filter((file): file is File => file instanceof File && file.name !== "");
    const lng = Number(model.lng);
    const lat = Number(model.lat);
    try {
      validatePhotos(files);
      if (!model.lng.trim() || !model.lat.trim() || !Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
        throw new Error("محل مشاهده را روی نقشه انتخاب کنید یا مختصات معتبر وارد کنید.");
      }
      const dateInput = String(form.get("seenAt") ?? "");
      const observedAt = dateInput ? new Date(dateInput) : new Date();
      if (Number.isNaN(observedAt.getTime()) || observedAt.getTime() > Date.now()) throw new Error("زمان مشاهده باید معتبر و در گذشته یا اکنون باشد.");
      inFlight.current = true;
      const mediaIds: string[] = [];
      for (const [index, file] of files.entries()) {
        dispatch({ type: "progress", message: "در حال آماده‌سازی عکس " + (index + 1).toLocaleString("fa-IR") + " از " + files.length.toLocaleString("fa-IR") + "…" });
        const id = uploaded.current.get(file) ?? await uploadPhoto(file);
        uploaded.current.set(file, id);
        mediaIds.push(id);
      }
      dispatch({ type: "progress", message: "در حال ثبت پرونده…" });
      const { id } = await post<{ id: string }>("/api/v1/cats", {
        name: String(form.get("name")).trim() || undefined,
        sex: form.get("sex"),
        ageEstimate: form.get("age"),
        markings: String(form.get("markings")).trim() || undefined,
        mediaIds,
        publishPhotos: form.get("publishPhotos") === "on",
        observation: { observedAt: observedAt.toISOString(), location: { lng, lat }, precision: "approximate" },
      });
      router.replace("/cats/" + id);
    } catch (error) {
      inFlight.current = false;
      dispatch({ type: "error", message: error instanceof Error ? error.message : "ثبت پرونده انجام نشد." });
    }
  }

  return (
    <form className={styles.form} aria-busy={busy} onSubmit={submit}>
      <fieldset disabled={busy}>
        <legend>مشخصات گربه</legend>
        <TextField name="name" label="نام گربه" maxLength={40} />
        <label>جنسیت<select name="sex" defaultValue="unknown">{Object.entries(sexLabels).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>
        <label>سن تقریبی<select name="age" defaultValue="unknown">{Object.entries(ageLabels).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>
        <TextField name="markings" label="نشانه‌های ظاهری" maxLength={200} />
        <label>عکس‌ها<input name="photos" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={() => uploaded.current.clear()} /></label>
        <label><span><input name="publishPhotos" type="checkbox" /> عکس‌های پاک‌سازی‌شده در پروندهٔ عمومی نمایش داده شوند.</span></label>
      </fieldset>
      <fieldset disabled={busy}>
        <legend>آخرین مشاهده</legend>
        <label>زمان مشاهده (خالی یعنی اکنون)<input name="seenAt" type="datetime-local" /></label>
        <p className={styles.muted}>در پرونده، فقط روز مشاهده و محدودهٔ تقریبی نمایش داده می‌شوند.</p>
        <Button variant="secondary" aria-expanded={model.showMap} onClick={() => dispatch({ type: "map" })}>{model.showMap ? "بستن نقشه" : "انتخاب روی نقشه"}</Button>
        {model.showMap && <LocationPicker choose={choose} disabled={busy} />}
        <div className={styles.coords}>
          <TextField label="طول جغرافیایی" name="lng" dir="ltr" inputMode="decimal" value={model.lng} onChange={(e) => dispatch({ type: "coordinate", axis: "lng", value: e.target.value })} required />
          <TextField label="عرض جغرافیایی" name="lat" dir="ltr" inputMode="decimal" value={model.lat} onChange={(e) => dispatch({ type: "coordinate", axis: "lat", value: e.target.value })} required />
        </div>
      </fieldset>
      {model.error && <p role="alert" className={styles.error}>{model.error}</p>}
      {model.progress && <p role="status">{model.progress}</p>}
      <Button type="submit" disabled={busy}>ثبت پرونده</Button>
    </form>
  );
}
