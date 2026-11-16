import type { Metadata } from "next";
import { SAMPLE_CAT_TONES, sampleCats } from "@/features/cats/fixtures/sample-cats";
import { toCatCardData } from "@/features/cats/model/cat-card.mapper";
import { SampleBrowserView } from "@/features/cats/views/sample-browser-view";
import { assertSamplesEnabled } from "../samples-gate";

export const metadata: Metadata = { title: "نمونهٔ طراحی", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function SamplePage() {
  assertSamplesEnabled();

  const now = new Date();
  const cats = sampleCats(now).map((cat) => toCatCardData(cat, now, SAMPLE_CAT_TONES[cat.id] ?? "smoke", true));
  return <SampleBrowserView cats={cats} />;
}
