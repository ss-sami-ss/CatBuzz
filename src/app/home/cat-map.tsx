"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LibreMap, Marker as LibreMarker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Bounds, SampleCat } from "./discovery";
import { homeMapStyle, providerStyle, sampleBounds, sampleCenter } from "./map-style";
import styles from "./home.module.css";

export function CatMap({ cats, selectedId, select, applyBounds }: {
  cats: SampleCat[];
  selectedId: string | null;
  select: (id: string) => void;
  applyBounds: (bounds: Bounds) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<{ map: LibreMap; Marker: typeof LibreMarker } | null>(null);
  const [error, setError] = useState(false);
  const [moved, setMoved] = useState(false);
  const markers = useRef<LibreMarker[]>([]);

  useEffect(() => {
    let disposed = false;
    let map: LibreMap | undefined;
    const timeout = window.setTimeout(() => setError(true), 12000);
    void import("maplibre-gl").then(({ Map, Marker, NavigationControl, setWorkerUrl }) => {
      if (disposed || !container.current) return;
      setWorkerUrl("/map-engine/maplibre-gl-worker.mjs");
      map = new Map({
        container: container.current,
        style: homeMapStyle,
        center: sampleCenter,
        zoom: 12,
        bounds: sampleBounds,
        fitBoundsOptions: { padding: 28, animate: false },
        minZoom: 10,
        maxZoom: 16,
        scrollZoom: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        locale: {
          "NavigationControl.ZoomIn": "بزرگ‌نمایی",
          "NavigationControl.ZoomOut": "کوچک‌نمایی",
          "NavigationControl.ResetBearing": "شمال",
          "AttributionControl.ToggleAttribution": "منابع نقشه",
        },
      });
      const instance = map;
      instance.addControl(new NavigationControl({ showCompass: false }), "top-left");
      instance.on("load", () => {
        window.clearTimeout(timeout);
        setEngine({ map: instance, Marker });
      });
      instance.on("error", () => {
        window.clearTimeout(timeout);
        setError(true);
      });
      instance.on("moveend", () => setMoved(true));
    }).catch(() => {
      window.clearTimeout(timeout);
      if (!disposed) setError(true);
    });

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      map?.remove();
    };
  }, []);

  useEffect(() => {
    if (!engine || error) return;
    markers.current = cats.map((cat) => {
      const name = cat.name ?? "بی‌نام";
      const urgent = cat.needs.includes("urgent");
      const button = document.createElement("button");
      button.type = "button";
      button.classList.add(styles.marker!);
      button.dataset.catId = cat.id;
      button.dataset.urgent = String(urgent);
      button.textContent = urgent ? "فوری" : name;
      button.setAttribute("aria-label", urgent ? name + "، فوری" : name);
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => select(cat.id));
      return new engine.Marker({ element: button }).setLngLat(cat.center).addTo(engine.map);
    });

    return () => {
      for (const marker of markers.current) marker.remove();
      markers.current = [];
    };
  }, [cats, engine, error, select]);

  useEffect(() => {
    for (const marker of markers.current) {
      const button = marker.getElement();
      button.setAttribute("aria-pressed", String(button.dataset.catId === selectedId));
    }
  }, [cats, engine, selectedId]);

  function searchArea() {
    if (!engine) return;
    const bounds = engine.map.getBounds();
    applyBounds([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
    setMoved(false);
  }

  return (
    <section aria-label="نقشهٔ گربه‌ها" className={styles.mapPanel}>
      <div ref={container} className={styles.map} hidden={error} />
      {error ? (
        <p className={styles.mapNotice} role="alert">نقشه در دسترس نیست. گربه‌ها را در فهرست ببینید.</p>
      ) : !engine ? (
        <p className={styles.mapNotice} role="status">در حال آماده‌سازی نقشه…</p>
      ) : (
        <>
          {!providerStyle && <span className={styles.mapLabel}>نقشهٔ شماتیک نمونه</span>}
          {moved && <button type="button" className={styles.searchArea} onClick={searchArea}>جست‌وجو در این محدوده</button>}
        </>
      )}
    </section>
  );
}
