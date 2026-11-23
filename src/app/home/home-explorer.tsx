"use client";

import { useCallback, useMemo, useReducer } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { CatMap } from "./cat-map";
import { filterCats, initialModel, needLabels, reduceDiscovery, type Bounds, type Need, type SampleCat } from "./discovery";
import styles from "./home.module.css";

const filters = Object.entries(needLabels) as [Need, string][];
const dateFormat = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" });

function CatList({ cats, selectedId, select }: {
  cats: SampleCat[];
  selectedId: string | null;
  select: (id: string) => void;
}) {
  return (
    <section aria-labelledby="cat-results">
      <div className={styles.listHeader}>
        <h3 id="cat-results">گربه‌های نمونه</h3>
        <span role="status">{cats.length.toLocaleString("fa-IR")} نتیجه</span>
      </div>
      {cats.length === 0 ? <p className={styles.empty}>موردی پیدا نشد. جست‌وجو یا فیلتر را تغییر دهید.</p> : (
        <ul className={styles.list}>
          {cats.map((cat) => (
            <li key={cat.id}>
              <button className={styles.card} aria-pressed={cat.id === selectedId} type="button" onClick={() => select(cat.id)}>
                <span className={styles.cardTop}>
                  <strong>{cat.name ?? "بی‌نام"}</strong>
                  <span>{cat.area}</span>
                </span>
                <span className={styles.needs}>
                  {cat.needs.map((need) => <span key={need} data-urgent={need === "urgent"}>{needLabels[need]}</span>)}
                </span>
                <span className={styles.seen}>آخرین مشاهدهٔ نمونه <time dateTime={cat.lastSeenAt}>{dateFormat.format(new Date(cat.lastSeenAt))}</time></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function HomeExplorer() {
  const [model, dispatch] = useReducer(reduceDiscovery, initialModel);
  const { query, need, bounds, selectedId, view } = model;
  const cats = useMemo(() => filterCats({ ...initialModel, query, need, bounds }), [query, need, bounds]);
  const select = useCallback((id: string) => dispatch({ type: "select", id }), []);
  const applyBounds = useCallback((value: Bounds) => dispatch({ type: "area", value }), []);

  return (
    <>
      <div className={styles.intro}>
        <h2>گربه‌های محله</h2>
        <p>این صفحه با داده و موقعیت‌های آزمایشی نمایش داده می‌شود.</p>
      </div>
      <div className={styles.controls}>
        <TextField
          label="جست‌وجوی گربه یا محله"
          name="cat-search"
          type="search"
          value={query}
          placeholder="مثلاً فاطمی"
          onChange={(event) => dispatch({ type: "query", value: event.target.value })}
        />
        <div className={styles.filters} role="group" aria-label="فیلتر نیاز گربه‌ها">
          <Button variant={need === null ? "primary" : "secondary"} aria-pressed={need === null} onClick={() => dispatch({ type: "need", value: null })}>همه</Button>
          {filters.map(([value, label]) => (
            <Button key={value} variant={need === value ? "primary" : "secondary"} aria-pressed={need === value} onClick={() => dispatch({ type: "need", value })}>{label}</Button>
          ))}
          {bounds && <Button variant="ghost" onClick={() => dispatch({ type: "area", value: null })}>پاک کردن محدوده</Button>}
        </div>
        <div className={styles.viewSwitch} role="group" aria-label="نمای نمایش">
          <Button variant={view === "map" ? "primary" : "secondary"} aria-pressed={view === "map"} onClick={() => dispatch({ type: "view", value: "map" })}>نقشه و فهرست</Button>
          <Button variant={view === "list" ? "primary" : "secondary"} aria-pressed={view === "list"} onClick={() => dispatch({ type: "view", value: "list" })}>فقط فهرست</Button>
        </div>
      </div>
      <div className={styles.results} data-view={view}>
        {view === "map" && <CatMap cats={cats} selectedId={selectedId} select={select} applyBounds={applyBounds} />}
        <CatList cats={cats} selectedId={selectedId} select={select} />
      </div>
    </>
  );
}
