import { notFound } from "next/navigation";

/** Dev-only design samples are hidden in production unless CATBUZZ_ENABLE_SAMPLES=1. */
export function assertSamplesEnabled() {
  if (process.env.NODE_ENV === "production" && process.env.CATBUZZ_ENABLE_SAMPLES !== "1") notFound();
}
