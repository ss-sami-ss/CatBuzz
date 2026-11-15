import type { CatCardData, PublicCatSummary } from "../model/cat.types";

/**
 * SAMPLE DATA ONLY — fictional cats for the dev design sample (/sample).
 * Never imported by production routes. Names carry «نمونه» per docs/06 test-data rule.
 */
export const SAMPLE_CAT_TONES: Record<string, CatCardData["tone"]> = {
  "sample-1": "amber",
  "sample-2": "snow",
  "sample-3": "tabby",
  "sample-4": "smoke",
  "sample-5": "amber",
  "sample-6": "snow",
  "sample-7": "tabby",
};

export function sampleCats(now: Date): PublicCatSummary[] {
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
  return [
    { id: "sample-1", name: "نارنج نمونه", needs: ["urgent", "medical"], lastSeenAt: hoursAgo(2), publicAreaLabel: "محلهٔ نمونهٔ الف", careStatus: "has_caretaker", thumbnailUrl: null },
    { id: "sample-2", name: "برفی نمونه", needs: ["food_water"], lastSeenAt: hoursAgo(5), publicAreaLabel: "محلهٔ نمونهٔ الف", careStatus: "has_caretaker", thumbnailUrl: null },
    { id: "sample-3", name: "خال‌خالی نمونه", needs: ["adoption"], lastSeenAt: hoursAgo(27), publicAreaLabel: "محلهٔ نمونهٔ ب", careStatus: "no_caretaker", thumbnailUrl: null },
    { id: "sample-4", name: "دودی نمونه", needs: ["medical"], lastSeenAt: hoursAgo(50), publicAreaLabel: "محلهٔ نمونهٔ ب", careStatus: "unknown", thumbnailUrl: null },
    { id: "sample-5", name: null, needs: ["food_water"], lastSeenAt: hoursAgo(1), publicAreaLabel: "محلهٔ نمونهٔ ج", careStatus: "no_caretaker", thumbnailUrl: null },
    { id: "sample-6", name: "عسلی نمونه", needs: ["food_water", "adoption"], lastSeenAt: hoursAgo(80), publicAreaLabel: "محلهٔ نمونهٔ ج", careStatus: "has_caretaker", thumbnailUrl: null },
    { id: "sample-7", name: "ببری نمونه", needs: ["urgent"], lastSeenAt: hoursAgo(0.5), publicAreaLabel: "محلهٔ نمونهٔ الف", careStatus: "unknown", thumbnailUrl: null },
  ];
}
