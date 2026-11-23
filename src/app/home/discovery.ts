import type { z } from "zod";
import type { CatNeed } from "@/shared/contracts/cats";
import type { PublicMapCat } from "@/shared/contracts/map";

export const needLabels = {
  urgent: "فوری",
  food_water: "غذا و آب",
  medical: "درمان",
  adoption: "واگذاری",
} satisfies Record<z.infer<typeof CatNeed>, string>;

export type Need = keyof typeof needLabels;
export type SampleCat = z.infer<typeof PublicMapCat> & { area: string };

export const sampleCats: SampleCat[] = [
  { kind: "cat", id: "00000000-0000-4000-8000-000000000001", name: "نارنج", area: "یوسف‌آباد", center: [51.405, 35.737], needs: ["food_water"], lastSeenAt: "2026-11-12T12:00:00Z", thumbnailUrl: null },
  { kind: "cat", id: "00000000-0000-4000-8000-000000000002", name: "برفی", area: "امیرآباد", center: [51.389, 35.729], needs: ["urgent", "medical"], lastSeenAt: "2026-11-13T12:00:00Z", thumbnailUrl: null },
  { kind: "cat", id: "00000000-0000-4000-8000-000000000003", name: "فندق", area: "فاطمی", center: [51.402, 35.718], needs: ["adoption"], lastSeenAt: "2026-11-14T12:00:00Z", thumbnailUrl: null },
];

export type Bounds = [west: number, south: number, east: number, north: number];
type Model = { query: string; need: Need | null; selectedId: string | null; bounds: Bounds | null; view: "map" | "list" };
type Intent =
  | { type: "query"; value: string }
  | { type: "need"; value: Need | null }
  | { type: "select"; id: string }
  | { type: "area"; value: Bounds | null }
  | { type: "view"; value: Model["view"] };

export const initialModel: Model = { query: "", need: null, selectedId: null, bounds: null, view: "map" };

export function reduceDiscovery(model: Model, intent: Intent): Model {
  switch (intent.type) {
    case "query": return { ...model, query: intent.value, selectedId: null, bounds: null };
    case "need": return { ...model, need: intent.value, selectedId: null };
    case "select": return { ...model, selectedId: intent.id };
    case "area": return { ...model, bounds: intent.value, selectedId: null };
    case "view": return { ...model, view: intent.value };
  }
}

function normalizeSearch(value: string) {
  return value.normalize().replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/\u200c/g, " ").trim().replace(/\s+/g, " ");
}

export function filterCats({ query, need, bounds }: Model) {
  const keyword = normalizeSearch(query);
  return sampleCats.filter(({ name, area, needs, center: [lng, lat] }) =>
    (!need || needs.includes(need)) &&
    (!bounds || (lng >= bounds[0] && lng <= bounds[2] && lat >= bounds[1] && lat <= bounds[3])) &&
    (!keyword || normalizeSearch(name ?? "").includes(keyword) || normalizeSearch(area).includes(keyword)),
  );
}
