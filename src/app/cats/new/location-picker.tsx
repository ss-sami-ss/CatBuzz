"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapInstance, Marker as MapMarker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { homeMapStyle, providerStyle, sampleCenter } from "../../home/map-style";
import styles from "../cats.module.css";

type Point = { lng: number; lat: number };

export function LocationPicker({ choose, disabled }: { choose: (point: Point) => void; disabled: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [engine, setEngine] = useState<{ map: MapInstance; Marker: typeof MapMarker } | null>(null);
  const marker = useRef<MapMarker | null>(null);

  useEffect(() => {
    let closed = false;
    let instance: MapInstance | undefined;
    const timer = setTimeout(() => setStatus("error"), 12000);
    void import("maplibre-gl").then(({ Map, Marker, NavigationControl, setWorkerUrl }) => {
      if (closed || !host.current) return;
      setWorkerUrl("/map-engine/maplibre-gl-worker.mjs");
      instance = new Map({ container: host.current, style: homeMapStyle, center: sampleCenter, zoom: 12, scrollZoom: false, dragRotate: false,
        locale: { "NavigationControl.ZoomIn": "بزرگ‌نمایی", "NavigationControl.ZoomOut": "کوچک‌نمایی" } });
      instance.addControl(new NavigationControl({ showCompass: false }), "top-left");
      instance.on("load", () => {
        clearTimeout(timer);
        setStatus("ready");
        setEngine({ map: instance!, Marker });
      });
      instance.on("error", () => setStatus("error"));
    }).catch(() => { if (!closed) setStatus("error"); });
    return () => { closed = true; clearTimeout(timer); marker.current?.remove(); marker.current = null; instance?.remove(); };
  }, []);

  useEffect(() => {
    if (!engine || disabled || status !== "ready") return;
    const subscription = engine.map.on("click", ({ lngLat }) => {
      const { lng, lat } = lngLat.wrap();
      marker.current ??= new engine.Marker({ color: "#145a3b" });
      marker.current.setLngLat([lng, lat]).addTo(engine.map);
      choose({ lng, lat });
    });
    return () => subscription.unsubscribe();
  }, [engine, disabled, choose, status]);

  return (
    <>
      {status === "loading" && <p role="status">در حال بارگذاری نقشه…</p>}
      {status === "error" && <p role="status">نقشه در دسترس نیست. مختصات را دستی وارد کنید.</p>}
      {!providerStyle && status === "ready" && <p className={styles.muted}>زمینهٔ شماتیک است. مختصات انتخاب‌شده را پیش از ثبت بررسی کنید.</p>}
      <div ref={host} className={styles.picker} hidden={status === "error"} aria-busy={status === "loading"} aria-label="نقشهٔ انتخاب محل مشاهده" />
    </>
  );
}
