/** Needs shown on public cat summaries (docs/04 home filters). */
export type CatNeed = "urgent" | "medical" | "food_water" | "adoption";

/** Mirrors the public map/list DTO in docs/07: no exact location, contact or real names. */
export type PublicCatSummary = {
  id: string;
  name: string | null;
  needs: CatNeed[];
  lastSeenAt: string;
  publicAreaLabel: string;
  careStatus: "has_caretaker" | "no_caretaker" | "unknown";
  thumbnailUrl: string | null;
};

/** Display-ready card data; the view never formats or fetches (MVI). */
export type CatCardData = {
  id: string;
  name: string;
  needs: CatNeed[];
  lastSeenLabel: string;
  areaLabel: string;
  careLabel: string;
  isSample: boolean;
  tone: "amber" | "snow" | "smoke" | "tabby";
};
