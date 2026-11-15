import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SAMPLE_CAT_TONES, sampleCats } from "@/features/cats/fixtures/sample-cats";
import { toCatCardData } from "@/features/cats/model/cat-card.mapper";
import { SampleBrowserView } from "@/features/cats/views/sample-browser-view";

export const metadata: Metadata = { title: "نمونهٔ طراحی", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Dev-only design sample. Hidden in production unless CATBUZZ_ENABLE_SAMPLES=1. */
export default function SamplePage() {
  if (process.env.NODE_ENV === "production" && process.env.CATBUZZ_ENABLE_SAMPLES !== "1") notFound();

  const now = new Date();
  const cats = sampleCats(now).map((cat) => toCatCardData(cat, now, SAMPLE_CAT_TONES[cat.id] ?? "smoke", true));
  return <SampleBrowserView cats={cats} />;
}
