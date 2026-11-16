import type { Metadata } from "next";
import { assertSamplesEnabled } from "../../samples-gate";
import { FormsSampleView } from "./forms-sample-view";

export const metadata: Metadata = { title: "نمونهٔ فرم‌ها", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function FormsSamplePage() {
  assertSamplesEnabled();
  return <FormsSampleView />;
}
