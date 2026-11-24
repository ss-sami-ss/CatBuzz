"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import type { PublicClinic } from "@/shared/contracts/clinics";
import { CatMap } from "../home/cat-map";
import type { Bounds } from "../home/discovery";

export function ClinicMap({ clinics }: { clinics: PublicClinic[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const applyBounds = useCallback((value: Bounds) => { setBounds(value); setSelected(null); }, []);
  const markers = clinics.flatMap(({ id, center, name }) => {
    if (!center) return [];
    const [lng, lat] = center;
    if (bounds && (lng < bounds[0] || lat < bounds[1] || lng > bounds[2] || lat > bounds[3])) return [];
    return [{ id, center, name, needs: [] }];
  });
  const initialBounds = useMemo(() => {
    const points = clinics.flatMap(({ center }) => center ? [center] : []);
    if (!points.length) return undefined;
    const longitudes = points.map(([lng]) => lng);
    const latitudes = points.map(([, lat]) => lat);
    return [[Math.min(...longitudes) - 0.005, Math.min(...latitudes) - 0.005],
      [Math.max(...longitudes) + 0.005, Math.max(...latitudes) + 0.005]] as [[number, number], [number, number]];
  }, [clinics]);
  const active = markers.find(({ id }) => id === selected);
  if (!clinics.some((clinic) => clinic.center)) return null;
  return <>
    <CatMap cats={markers} selectedId={selected} select={setSelected} applyBounds={applyBounds} initialBounds={initialBounds} label="نقشهٔ کلینیک‌ها"
      fallback="نقشه در دسترس نیست. کلینیک‌ها را در فهرست ببینید." />
    {active && <Link href={"/clinics/" + active.id}>مشاهدهٔ {active.name}</Link>}
    {bounds && <button type="button" onClick={() => setBounds(null)}>نمایش همهٔ نشانگرها</button>}
  </>;
}
