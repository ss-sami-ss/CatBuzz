import type { CatNeed } from "@/shared/contracts/cats";

/** Wire types come from the API contract (src/shared/contracts, T06). */
export type { CatNeed, PublicCatSummary } from "@/shared/contracts/cats";

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
